import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://rlsj.ir",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
);
const validEmail = (value: unknown) => {
  let email = String(value ?? "").trim();
  try { email = decodeURIComponent(email); } catch { /* keep the original value */ }
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};
const textFromHtml = (value: string) => value
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/\s+/g, " ")
  .trim();
const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

async function loadIranianEditorialRecipients() {
  const response = await fetch("https://rlsj.ir/editorial-board.html", {
    headers: { "Accept": "text/html", "User-Agent": "RLS-Editorial-Mailer/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("صفحه هیئت تحریریه در دسترس نیست (HTTP " + response.status + ")");
  const html = await response.text();
  const startMatch = /<h2\b[^>]*>\s*هیئت\s*تحریریه\s*ایران\s*<\/h2>/u.exec(html);
  if (!startMatch || startMatch.index === undefined) throw new Error("بخش هیئت تحریریه ایران در صفحه رسمی پیدا نشد.");
  const afterStart = html.slice(startMatch.index + startMatch[0].length);
  const endMatch = /<h2\b[^>]*>\s*(?:هیئت\s*تحریریه\s*بین‌المللی|کارشناسان\s*نشریه)\s*<\/h2>/u.exec(afterStart);
  if (!endMatch || endMatch.index === undefined) throw new Error("مرز بخش هیئت تحریریه ایران مشخص نشد؛ برای جلوگیری از ارسال اشتباه، عملیات متوقف شد.");
  const section = afterStart.slice(0, endMatch.index);
  const articles = section.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  const found = new Map<string, { name: string; email: string }>();
  for (const article of articles) {
    const nameMatch = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(article);
    const name = nameMatch ? textFromHtml(nameMatch[1]) : "عضو هیئت تحریریه";
    const links = [...article.matchAll(/href\s*=\s*["']mailto:([^"'?#]+)["']/gi)];
    for (const link of links) {
      const email = validEmail(link[1]);
      if (email) {
        const key = email.toLowerCase();
        if (!found.has(key)) found.set(key, { name, email });
      }
    }
  }
  const recipients = [...found.values()];
  if (!recipients.length) throw new Error("هیچ نشانی ایمیل معتبری در بخش هیئت تحریریه ایران پیدا نشد.");
  return recipients;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const publishable = (publishableKeysRaw ? JSON.parse(publishableKeysRaw).default : null) || Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = (secretKeysRaw ? JSON.parse(secretKeysRaw).default : null) || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!url || !publishable || !serviceKey || !resendKey || !from) return json({ error: "Email service is not configured" }, 503);

    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const { data: role, error: roleError } = await userClient.from("rls_user_roles")
      .select("role").eq("user_id", authData.user.id).maybeSingle();
    if (roleError || role?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const contentType = req.headers.get("content-type") || "";
    let action = "";
    let subject = "";
    let message = "";
    let files: File[] = [];
    let form: FormData | null = null;
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      action = String(body?.action || "");
    } else {
      form = await req.formData();
      action = String(form.get("action") || "");
      subject = String(form.get("subject") || "").trim();
      message = String(form.get("message") || "").trim();
      files = form.getAll("attachments").filter((v): v is File => v instanceof File && v.size > 0);
    }
    if (action === "preview") {
      const recipients = await loadIranianEditorialRecipients();
      return json({ ok: true, source: "https://rlsj.ir/editorial-board.html", count: recipients.length, recipients });
    }
    if (action !== "send" || !form) return json({ error: "Invalid action" }, 400);
    if (subject.length < 2 || subject.length > 180 || message.length < 2 || message.length > 20000) {
      return json({ error: "Invalid subject or message" }, 400);
    }
    if (files.length > 2) return json({ error: "At most two attachments are allowed" }, 400);
    const allowed = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i;
    let totalBytes = 0;
    const attachments: { filename: string; content: string }[] = [];
    for (const file of files) {
      if (!allowed.test(file.name) || file.size > 5 * 1024 * 1024) return json({ error: "Invalid attachment: " + file.name }, 400);
      totalBytes += file.size;
      if (totalBytes > 10 * 1024 * 1024) return json({ error: "Combined attachment size exceeds 10 MB" }, 400);
      attachments.push({ filename: file.name.replace(/[\r\n"]/g, "_").slice(0, 180), content: toBase64(new Uint8Array(await file.arrayBuffer())) });
    }

    const targets = await loadIranianEditorialRecipients();
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const archiveSubject = "هیئت تحریریه ایران | " + subject;
    const { data: campaign, error: campaignError } = await admin.from("rls_admin_email_campaigns")
      .insert({
        created_by: authData.user.id,
        subject: archiveSubject,
        message,
        attachment_names: files.map(file => file.name.replace(/[\r\n"]/g, "_").slice(0, 180)),
        total_recipients: targets.length,
        status: "sending",
      })
      .select("id")
      .single();
    if (campaignError || !campaign?.id) throw new Error("Could not create email archive record");

    const recipientRows = targets.map(recipient => ({
      campaign_id: campaign.id,
      recipient_email: recipient.email,
      status: "pending",
    }));
    const { error: recipientInsertError } = await admin.from("rls_admin_email_recipients").insert(recipientRows);
    if (recipientInsertError) throw new Error("Could not prepare recipient archive");

    let sent = 0, failed = 0;
    const errors: string[] = [];
    for (const recipient of targets) {
      let resendId: string | null = null;
      let deliveryError: string | null = null;
      try {
        const html = '<div dir="rtl" style="font-family:Tahoma,Arial;line-height:2;color:#30282a;max-width:720px;margin:auto">' +
          '<div style="border-top:5px solid #642536;padding:22px;background:#faf7f3">' +
          '<p style="color:#8b6a36">دوفصلنامه مطالعات زبان روسی · RLS</p><h2>' + esc(subject) + '</h2>' +
          '<div style="white-space:pre-wrap">' + esc(message) + '</div>' +
          '<hr><small>این پیام برای اعضای ایرانی هیئت تحریریه نشریه ارسال شده است.</small></div></div>';
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [recipient.email], subject, html, text: message,
            ...(attachments.length ? { attachments } : {}),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result?.message || result?.name || "Email delivery failed"));
        resendId = typeof result?.id === "string" ? result.id : null;
        sent++;
      } catch (error) {
        failed++;
        deliveryError = String(error instanceof Error ? error.message : "Email delivery failed").slice(0, 500);
        if (errors.length < 5) errors.push(deliveryError);
      }
      const { error: logError } = await admin.from("rls_admin_email_recipients").update({
        status: deliveryError ? "failed" : "sent",
        resend_email_id: resendId,
        error_message: deliveryError,
        sent_at: deliveryError ? null : new Date().toISOString(),
      }).eq("campaign_id", campaign.id).eq("recipient_email", recipient.email);
      if (logError && errors.length < 5) errors.push("Archive update failed for " + recipient.email);
    }

    const finalStatus = failed === 0 ? "completed" : sent === 0 ? "failed" : "partial";
    const { error: finishError } = await admin.from("rls_admin_email_campaigns").update({
      sent_count: sent,
      failed_count: failed,
      status: finalStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign.id);
    if (finishError) errors.push("Campaign summary could not be finalized");
    return json({ ok: failed === 0 && !finishError, campaign_id: campaign.id, sent, failed, skipped: 0, total: targets.length, errors });
  } catch (error) {
    console.error("Iranian editorial email error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected email error" }, 500);
  }
});