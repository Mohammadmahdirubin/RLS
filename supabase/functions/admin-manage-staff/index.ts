import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigins = new Set(["https://rlsj.ir", "https://www.rlsj.ir"]);
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://rlsj.ir",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
}
const clean = (v: unknown, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  try {
    const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "تنظیمات امن سرور کامل نیست." }, 503, origin);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "نشست مدیر پیدا نشد." }, 401, origin);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "نشست مدیر معتبر نیست." }, 401, origin);
    const { data: callerRole, error: callerRoleError } = await admin.from("rls_user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
    if (callerRoleError || callerRole?.role !== "admin") return json({ error: "فقط مدیر کل اجازه مدیریت حساب‌ها را دارد." }, 403, origin);
    const body = await req.json().catch(() => ({})), action = clean(body?.action, 30);
    if (action === "list") {
      const { data: roleRows, error } = await admin.from("rls_user_roles").select("user_id,role,created_at").in("role", ["admin", "instructor_admin"]).order("created_at", { ascending: false });
      if (error) throw error;
      const records = await Promise.all((roleRows || []).map(async (row: any) => {
        const { data } = await admin.auth.admin.getUserById(row.user_id), u = data?.user, meta = u?.user_metadata || {};
        return { user_id: row.user_id, role: row.role, email: u?.email || null, full_name: clean(meta.full_name, 180) || null, created_at: u?.created_at || row.created_at };
      }));
      return json({ ok: true, records }, 200, origin);
    }
    if (action === "create") {
      const email = clean(body?.email, 320).toLowerCase(), password = typeof body?.password === "string" ? body.password : "";
      const fullName = clean(body?.full_name, 180), role = clean(body?.role, 40);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ایمیل معتبر وارد کنید." }, 400, origin);
      if (password.length < 12) return json({ error: "رمز اولیه باید حداقل ۱۲ نویسه داشته باشد." }, 400, origin);
      if (!["instructor_admin", "admin"].includes(role)) return json({ error: "سطح دسترسی انتخاب‌شده معتبر نیست." }, 400, origin);
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName || null, provisioned_by_admin: true } });
      if (createError || !created.user) {
        if (/already|registered|exists/i.test(String(createError?.message || ""))) return json({ error: "برای این ایمیل از قبل حساب وجود دارد. از فهرست حساب‌های موجود، دسترسی همان حساب را تغییر دهید." }, 409, origin);
        throw createError || new Error("ساخت حساب کاربری ناموفق بود.");
      }
      const { error: roleError } = await admin.from("rls_user_roles").upsert({ user_id: created.user.id, role }, { onConflict: "user_id" });
      if (roleError) { await admin.auth.admin.deleteUser(created.user.id); throw roleError; }
      return json({ ok: true, user_id: created.user.id, email, role }, 201, origin);
    }
    if (action === "set_role") {
      const userId = clean(body?.user_id, 80), role = clean(body?.role, 40);
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "شناسه حساب معتبر نیست." }, 400, origin);
      if (!["member", "instructor_admin", "admin"].includes(role)) return json({ error: "سطح دسترسی معتبر نیست." }, 400, origin);
      if (userId === authData.user.id && role !== "admin") return json({ error: "نمی‌توانید دسترسی مدیر حساب فعلی خود را از اینجا حذف کنید." }, 409, origin);
      const { error } = await admin.from("rls_user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
      return json({ ok: true, user_id: userId, role }, 200, origin);
    }
    return json({ error: "عملیات نامعتبر است." }, 400, origin);
  } catch (error) {
    console.error("admin-manage-staff failed:", error);
    return json({ error: error?.message || "خطای نامشخص در مدیریت حساب." }, 500, origin);
  }
});