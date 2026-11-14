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
const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};
const validEmail = (value: unknown) => {
  const email = String(value ?? "").trim();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

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

    const form = await req.formData();
    const subject = String(form.get("subject") || "").trim();
    const message = String(form.get("message") || "").trim();
    if (subject.length < 2 || subject.length > 180 || message.length < 2 || message.length > 20000) {
      return json({ error: "Invalid subject or message" }, 400);
    }
    const files = form.getAll("attachments").filter((v): v is File => v instanceof File && v.size > 0);
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

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const recipients = new Map<string, string>();
    const collect = async (table: "rls_profiles" | "rls_membership_applications") => {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin.from(table).select("email").not("email", "is", null).range(offset, offset + 999);
        if (error) throw new Error("Could not load registered users");
        for (const row of data || []) {
          const email = validEmail(row.email);
          if (email) recipients.set(email.toLowerCase(), email);
        }
        if (!data || data.length < 1000) break;
      }
    };
    await collect("rls_profiles");
    await collect("rls_membership_applications");
    const targets = [...recipients.values()];
    if (!targets.length) return json({ ok: true, sent: 0, failed: 0, skipped: 0, total: 0 });

    let sent = 0, failed = 0;
    const errors: string[] = [];
    for (const recipient of targets) {
      try {
        const html = '<div dir="rtl" style="font-family:Tahoma,Arial;line-height:2;color:#30282a;max-width:720px;margin:auto">' +
          '<div style="border-top:5px solid #642536;padding:22px;background:#faf7f3">' +
          '<p style="color:#8b6a36">انجمن مطالعات زبان روسی · RLS</p><h2>' + esc(subject) + '</h2>' +
          '<div style="white-space:pre-wrap">' + esc(message) + '</div>' +
          '<hr><small>این پیام برای ثبت‌نام‌کنندگان انجمن مطالعات زبان روسی ارسال شده است.</small></div></div>';
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [recipient], subject, html, text: message,
            ...(attachments.length ? { attachments } : {}),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result?.message || result?.name || "Email delivery failed"));
        sent++;
      } catch (error) {
        failed++;
        if (errors.length < 5) errors.push(String(error instanceof Error ? error.message : "Email delivery failed").slice(0, 300));
      }
    }
    return json({ ok: failed === 0, sent, failed, skipped: 0, total: targets.length, errors });
  } catch (error) {
    console.error("Broadcast email error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected broadcast email error" }, 500);
  }
});