import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://rlsj.ir", "https://www.rlsj.ir"]);
const categories = new Set(["student", "graduate", "faculty", "researcher", "translator", "culture", "honorary"]);
const salutations = new Set(["mr", "ms"]);
const profileKeys = [
  "display_name", "profile_headline", "country", "city", "institution", "degree", "specialty", "bio",
  "memberships", "activities", "publications", "research_interests", "languages",
  "full_name_en", "full_name_ru", "display_name_en", "display_name_ru",
  "profile_headline_en", "profile_headline_ru", "country_en", "country_ru", "city_en", "city_ru",
  "institution_en", "institution_ru", "degree_en", "degree_ru", "specialty_en", "specialty_ru",
  "bio_en", "bio_ru", "memberships_en", "memberships_ru", "activities_en", "activities_ru",
  "publications_en", "publications_ru", "research_interests_en", "research_interests_ru",
  "languages_en", "languages_ru", "website_url", "orcid", "researchgate_url", "google_scholar_url",
  "instagram_url", "telegram_url", "linkedin_url", "x_url", "articles_count", "books_count"
];

function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : "https://rlsj.ir";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function textValue(value: unknown, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeProfileData(metadata: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of profileKeys) {
    const value = metadata[key];
    if (typeof value === "string") {
      const cleaned = value.trim();
      if (cleaned) result[key] = cleaned.slice(0, 3000);
    } else if ((key === "articles_count" || key === "books_count") && typeof value === "number" &&
               Number.isInteger(value) && value >= 0 && value <= 999999) {
      result[key] = value;
    }
  }
  return result;
}

function completeness(user: any) {
  const metadata = (user.user_metadata && typeof user.user_metadata === "object")
    ? user.user_metadata as Record<string, unknown> : {};
  const email = textValue(user.email, 320).toLowerCase();
  const fullName = textValue(metadata.full_name, 180);
  const salutation = textValue(metadata.salutation, 10);
  const category = textValue(metadata.category, 30);
  const missing: string[] = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push("ایمیل معتبر");
  if (fullName.length < 2) missing.push("نام و نام خانوادگی");
  if (!salutations.has(salutation)) missing.push("عنوان خطاب");
  if (!categories.has(category)) missing.push("گروه عضویت");
  return {
    user_id: user.id,
    email,
    full_name: fullName,
    salutation,
    category,
    created_at: user.created_at || null,
    email_confirmed: !!user.email_confirmed_at,
    can_stage: missing.length === 0,
    missing_fields: missing,
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 503, origin);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "نشست مدیر پیدا نشد." }, 401, origin);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "نشست مدیر معتبر نیست." }, 401, origin);

    const { data: role, error: roleError } = await admin.from("rls_user_roles")
      .select("role").eq("user_id", authData.user.id).maybeSingle();
    if (roleError || role?.role !== "admin") return json({ error: "دسترسی مدیر تأیید نشد." }, 403, origin);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "list");

    if (action === "unconfirmed_members") {
      const { data: profiles, error: profilesError } = await admin.from("rls_profiles")
        .select("user_id,full_name,email,member_number,created_at")
        .eq("membership_status", "approved")
        .not("email", "is", null)
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const authUsers = new Map<string, any>();
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        for (const user of data.users) authUsers.set(user.id, user);
        if (data.users.length < 1000) break;
      }

      const records = (profiles || []).flatMap((profile: any) => {
        const authUser = authUsers.get(profile.user_id);
        if (!authUser || authUser.email_confirmed_at) return [];
        return [{
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: authUser.email || profile.email,
          member_number: profile.member_number,
          created_at: profile.created_at,
          email_confirmed: false,
        }];
      });

      return json({ ok: true, count: records.length, records }, 200, origin);
    }

    if (action === "list") {
      const profilesResult = await admin.from("rls_profiles").select("user_id").limit(10000);
      if (profilesResult.error) throw profilesResult.error;
      const applicationsResult = await admin.from("rls_membership_applications").select("email").limit(10000);
      if (applicationsResult.error) throw applicationsResult.error;
      const rolesResult = await admin.from("rls_user_roles").select("user_id,role").eq("role", "admin").limit(10000);
      if (rolesResult.error) throw rolesResult.error;

      const profileIds = new Set((profilesResult.data || []).map((item: any) => item.user_id));
      const applicationEmails = new Set((applicationsResult.data || [])
        .map((item: any) => String(item.email || "").trim().toLowerCase()));
      const adminIds = new Set((rolesResult.data || []).map((item: any) => item.user_id));

      const incompleteUsers: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        for (const user of data.users) {
          const email = String(user.email || "").trim().toLowerCase();
          if (adminIds.has(user.id) || profileIds.has(user.id) || !email || applicationEmails.has(email)) continue;
          incompleteUsers.push(completeness(user));
        }
        if (data.users.length < 1000) break;
      }

      incompleteUsers.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return json({ ok: true, records: incompleteUsers }, 200, origin);
    }

    if (action === "stage") {
      const userId = textValue(body?.user_id, 80);
      if (!userId) return json({ error: "شناسه حساب ارسال نشده است." }, 400, origin);

      const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
      if (targetError || !targetData.user) return json({ error: "حساب ثبت‌نامی پیدا نشد." }, 404, origin);
      const target = targetData.user;
      const targetEmail = String(target.email || "").trim().toLowerCase();
      if (!targetEmail) return json({ error: "برای این حساب ایمیل ثبت نشده است." }, 409);

      const { data: targetRole, error: targetRoleError } = await admin.from("rls_user_roles")
        .select("role").eq("user_id", userId).maybeSingle();
      if (targetRoleError) throw targetRoleError;
      if (targetRole?.role === "admin") return json({ error: "حساب مدیر را نمی‌توان به‌عنوان درخواست عضویت وارد کرد." }, 403);

      const { data: existingProfile, error: profileError } = await admin.from("rls_profiles")
        .select("user_id").eq("user_id", userId).maybeSingle();
      if (profileError) throw profileError;
      if (existingProfile) return json({ error: "برای این حساب پروفایل عضو وجود دارد؛ پرونده تکراری ساخته نشد." }, 409);

      const { data: existingApplication, error: applicationError } = await admin.from("rls_membership_applications")
        .select("id,status").eq("email", targetEmail).limit(1).maybeSingle();
      if (applicationError) throw applicationError;
      if (existingApplication) return json({
        error: existingApplication.status === "pending"
          ? "درخواست این حساب از قبل در صف بررسی قرار دارد."
          : "برای این حساب قبلاً درخواست عضویت ثبت و بررسی شده است."
      }, 409);

      const meta = (target.user_metadata && typeof target.user_metadata === "object")
        ? target.user_metadata as Record<string, unknown> : {};
      const required = completeness(target);
      if (!required.can_stage) {
        return json({
          error: "اطلاعات الزامی حساب کامل نیست.",
          missing_fields: required.missing_fields
        }, 422, origin);
      }

      const profileData = {
        ...safeProfileData(meta),
        _recovered_from_incomplete_auth_signup: true,
        _recovered_email_confirmed: !!target.email_confirmed_at,
      };

      const { data: created, error: insertError } = await admin.from("rls_membership_applications")
        .insert({
          email: targetEmail,
          full_name: required.full_name,
          salutation: required.salutation,
          category: required.category,
          profile_data: profileData,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return json({ error: "درخواست دیگری با این ایمیل هم‌زمان ثبت شده است؛ فهرست را تازه‌سازی کنید." }, 409, origin);
        }
        throw insertError;
      }

      return json({
        ok: true,
        application_id: created.id,
        status: "pending",
        email_confirmed: !!target.email_confirmed_at,
      }, 201, origin);
    }

    return json({ error: "درخواست نامعتبر است." }, 400, origin);
  } catch (error) {
    console.error("admin-incomplete-registrations failed:", error);
    return json({ error: error?.message || "خطای نامشخص" }, 500, origin);
  }
});
