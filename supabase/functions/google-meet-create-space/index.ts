import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://rlsj.ir",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const enc = new TextEncoder();
const fromB64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const toB64 = (value: Uint8Array) => {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
};
async function tokenKey(clientSecret: string) {
  const material = await crypto.subtle.digest("SHA-256", enc.encode("RLS-Google-Meet-Token-v1:" + clientSecret));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
}
async function decryptRefreshToken(ciphertext: string, iv: string, clientSecret: string, userId: string) {
  const key = await tokenKey(clientSecret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(iv), additionalData: enc.encode(userId) },
    key,
    fromB64(ciphertext),
  );
  return new TextDecoder().decode(plain);
}
async function encryptRefreshToken(token: string, clientSecret: string, userId: string) {
  const key = await tokenKey(clientSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(userId) },
    key,
    enc.encode(token),
  );
  return { ciphertext: toB64(new Uint8Array(encrypted)), iv: toB64(iv) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "برای ادامه وارد حساب کاربری شوید." }, 401);

    const url = Deno.env.get("SUPABASE_URL") || "";
    const publishableRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishable = (publishableRaw ? JSON.parse(publishableRaw).default : null) ||
      Deno.env.get("SUPABASE_ANON_KEY") || "";
    const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const serviceKey = (secretRaw ? JSON.parse(secretRaw).default : null) ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
    if (!url || !publishable || !serviceKey || !clientId || !clientSecret) {
      return json({ error: "تنظیمات سرویس Google Meet کامل نیست." }, 503);
    }

    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return json({ error: "نشست کاربری معتبر نیست؛ دوباره وارد شوید." }, 401);
    const userId = authData.user.id;

    const { data: role, error: roleError } = await userClient.from("rls_user_roles")
      .select("role").eq("user_id", userId).maybeSingle();
    if (roleError || !["admin", "instructor_admin"].includes(String(role?.role || ""))) {
      return json({ error: "دسترسی ساخت جلسه برای این حساب فعال نیست." }, 403);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const eventId = typeof body?.event_id === "string" ? body.event_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
      return json({ error: "شناسه وبینار معتبر نیست." }, 400);
    }

    const { data: event, error: eventError } = await admin.from("rls_events")
      .select("id,title,event_type,webinar_mode,webinar_platform,created_by")
      .eq("id", eventId).maybeSingle();
    if (eventError || !event) return json({ error: "وبینار موردنظر پیدا نشد." }, 404);
    if (event.created_by !== userId) return json({ error: "فقط سازنده وبینار می‌تواند لینک جلسه آن را ایجاد کند." }, 403);
    if (event.event_type !== "webinar") return json({ error: "ساخت جلسه فقط برای وبینار امکان‌پذیر است." }, 400);
    if (event.webinar_platform !== "google_meet") return json({ error: "بستر این وبینار Google Meet نیست." }, 400);
    if (event.webinar_mode === "embedded") return json({ error: "Google Meet داخل سایت قابل تعبیه نیست؛ شیوه برگزاری را روی لینک خارجی بگذارید." }, 400);

    const { data: existing, error: existingError } = await admin.from("rls_webinar_integrations")
      .select("meeting_url").eq("event_id", eventId).maybeSingle();
    if (existingError) return json({ error: "بررسی لینک فعلی جلسه ناموفق بود." }, 500);
    if (existing?.meeting_url) return json({ meeting_url: existing.meeting_url, already_exists: true });

    const { data: connectionRows, error: connectionError } = await admin.rpc(
      "rls_google_meet_connection_get", { p_user_id: userId },
    );
    const connection = Array.isArray(connectionRows) ? connectionRows[0] : null;
    if (connectionError || !connection) {
      return json({ error: "حساب Google این مدرس متصل نیست؛ ابتدا اتصال Google را انجام دهید." }, 409);
    }
    const { data: statusRows, error: statusError } = await admin.rpc(
      "rls_google_meet_connection_status", { p_user_id: userId },
    );
    const status = Array.isArray(statusRows) ? statusRows[0] : null;
    if (statusError || !status) return json({ error: "وضعیت اتصال Google قابل بررسی نیست." }, 500);
    const scopes = Array.isArray(status.scopes) ? status.scopes : [];
    if (!scopes.includes("https://www.googleapis.com/auth/meetings.space.created")) {
      return json({ error: "مجوز ساخت جلسه در اتصال Google وجود ندارد؛ حساب Google را دوباره متصل کنید." }, 403);
    }

    const refreshToken = await decryptRefreshToken(
      connection.refresh_token_ciphertext, connection.refresh_token_iv, clientSecret, userId,
    );
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      const invalid = tokenData.error === "invalid_grant";
      return json({
        error: invalid
          ? "مجوز Google منقضی یا لغو شده است؛ حساب Google را دوباره متصل کنید."
          : "دریافت دسترسی موقت از Google ناموفق بود؛ کمی بعد دوباره تلاش کنید.",
        reconnect_required: invalid,
      }, invalid ? 409 : 502);
    }

    if (typeof tokenData.refresh_token === "string" && tokenData.refresh_token) {
      const encrypted = await encryptRefreshToken(tokenData.refresh_token, clientSecret, userId);
      const { error: saveError } = await admin.rpc("rls_google_meet_connection_save", {
        p_user_id: userId,
        p_google_email: status.google_email || null,
        p_ciphertext: encrypted.ciphertext,
        p_iv: encrypted.iv,
        p_scopes: scopes,
      });
      if (saveError) return json({ error: "به‌روزرسانی امن مجوز Google ناموفق بود." }, 500);
    }

    const meetResponse = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + tokenData.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const meetData = await meetResponse.json().catch(() => ({}));
    if (!meetResponse.ok || typeof meetData.meetingUri !== "string" || !meetData.meetingUri.startsWith("https://meet.google.com/")) {
      console.error("Google Meet space creation failed", meetResponse.status, meetData.error?.status || "");
      const statusCode = meetResponse.status === 403 ? 403 : meetResponse.status === 429 ? 429 : 502;
      const message = meetResponse.status === 403
        ? "Google اجازه ساخت جلسه نداد؛ دسترسی API و مجوزهای حساب را بررسی کنید."
        : meetResponse.status === 429
        ? "تعداد درخواست‌های ساخت جلسه زیاد است؛ کمی بعد دوباره تلاش کنید."
        : "ساخت جلسه در Google Meet ناموفق بود.";
      return json({ error: message }, statusCode);
    }

    const { error: insertError } = await admin.from("rls_webinar_integrations").upsert({
      event_id: eventId,
      meeting_url: meetData.meetingUri,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "event_id" });
    if (insertError) {
      console.error("Meeting URL persistence failed", insertError.message);
      return json({ error: "جلسه در Google ساخته شد اما ذخیره لینک در وبینار ناموفق بود؛ با پشتیبانی تماس بگیرید." }, 500);
    }

    return json({ meeting_url: meetData.meetingUri, meeting_space: meetData.name || null, already_exists: false });
  } catch (error) {
    console.error("google-meet-create-space error", error instanceof Error ? error.message : "unknown");
    return json({ error: "ساخت جلسه با خطای غیرمنتظره روبه‌رو شد؛ دوباره تلاش کنید." }, 500);
  }
});