import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.RLS_BACKEND_CONFIG || {};
const configured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_REF") &&
  !config.supabaseAnonKey.includes("YOUR_SUPABASE")
);

export const backendConfigured = configured;
export const supabase = configured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export async function getActiveProfile() {
  if (!supabase) return { profile: null, error: new Error("پیکربندی سرویس پشتیبان انجام نشده است.") };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { profile: null, error: authError || new Error("نشست ورود معتبر نیست.") };
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, active").eq("id", user.id).single();
  if (error) return { profile: null, error };
  if (!data.active) {
    await supabase.auth.signOut();
    return { profile: null, error: new Error("این حساب غیرفعال شده است.") };
  }
  return { profile: data, user, error: null };
}

export async function writeAudit(action, entityType, entityId = null, details = {}) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: user.id, action, entity_type: entityType,
    entity_id: entityId ? String(entityId) : null, details
  });
  if (error) console.error("ثبت گزارش فعالیت ناموفق بود:", error.message);
}

export async function uploadEditorialFile(file, kind) {
  if (!supabase) throw new Error("سرویس پشتیبان پیکربندی نشده است.");
  const { profile, user, error } = await getActiveProfile();
  if (error || !profile || !user) throw error || new Error("ابتدا وارد شوید.");
  const allowed = kind === "article_pdf"
    ? ["application/pdf"]
    : ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("نوع فایل مجاز نیست.");
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("حجم فایل نباید بیشتر از ۲۰ مگابایت باشد.");
  const safeName = file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-120);
  const path = user.id + "/" + kind + "/" + crypto.randomUUID() + "-" + safeName;
  const { error: uploadError } = await supabase.storage.from("rls-editorial").upload(path, file, {
    contentType: file.type, upsert: false
  });
  if (uploadError) throw uploadError;
  const { data: media, error: mediaError } = await supabase.from("media").insert({
    original_name: file.name, storage_path: path, mime_type: file.type,
    size_bytes: file.size, media_kind: kind, uploaded_by: user.id
  }).select("id, storage_path, original_name, media_kind").single();
  if (mediaError) {
    await supabase.storage.from("rls-editorial").remove([path]);
    throw mediaError;
  }
  await writeAudit("file_uploaded", "media", media.id, { kind, name: file.name, size: file.size });
  return media;
}

export async function createArticle(payload, files = {}) {
  if (!supabase) throw new Error("سرویس پشتیبان پیکربندی نشده است.");
  const { profile, user, error } = await getActiveProfile();
  if (error || !profile || !user) throw error || new Error("ابتدا وارد شوید.");
  const uploaded = {};
  for (const [field, kind] of [
    ["pdf", "article_pdf"], ["poster", "poster"], ["cover", "cover"]
  ]) {
    if (files[field]) uploaded[field] = await uploadEditorialFile(files[field], kind);
  }
  const row = {
    ...payload,
    created_by: user.id,
    status: "pending_review",
    pdf_path: uploaded.pdf?.storage_path || null,
    poster_path: uploaded.poster?.storage_path || null,
    cover_path: uploaded.cover?.storage_path || null
  };
  const { data, error: insertError } = await supabase.from("articles").insert(row).select().single();
  if (insertError) throw insertError;
  await writeAudit("article_submitted", "article", data.id, { title: data.title });
  return data;
}

export async function listArticles() {
  if (!supabase) throw new Error("سرویس پشتیبان پیکربندی نشده است.");
  const { data, error } = await supabase.from("articles")
    .select("id,title,corresponding_author,language,issue_label,status,created_at,created_by")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
}

export async function reviewArticle(id, status) {
  if (!supabase) throw new Error("سرویس پشتیبان پیکربندی نشده است.");
  if (!["published", "rejected", "pending_review"].includes(status)) {
    throw new Error("وضعیت درخواستی مجاز نیست.");
  }
  const { profile, user, error } = await getActiveProfile();
  if (error || profile?.role !== "admin") throw new Error("این عملیات فقط برای مدیر مجاز است.");
  const changes = {
    status, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    ...(status === "published" ? { published_at: new Date().toISOString() } : {})
  };
  const { data, error: updateError } = await supabase.from("articles")
    .update(changes).eq("id", id).select().single();
  if (updateError) throw updateError;
  await writeAudit("article_" + status, "article", id, {});
  return data;
}
