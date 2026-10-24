import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.RLS_BACKEND_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_REF") &&
  !config.supabaseAnonKey.includes("YOUR_SUPABASE"));

export const backendConfigured = configured;
export const supabase = configured ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export async function getActiveProfile() {
  if (!supabase) return { profile: null, error: new Error("پیکربندی سرویس پشتیبان انجام نشده است.") };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { profile: null, user: null, error: authError || new Error("نشست ورود معتبر نیست.") };
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, active").eq("id", user.id).single();
  if (error) return { profile: null, user, error };
  if (!data.active) {
    await supabase.auth.signOut();
    return { profile: null, user: null, error: new Error("این حساب غیرفعال شده است.") };
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
  const allowed = kind === "article_pdf" ? ["application/pdf"] : ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("نوع فایل مجاز نیست.");
  if (file.size > 20 * 1024 * 1024) throw new Error("حجم فایل نباید بیشتر از ۲۰ مگابایت باشد.");
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
  const uploaded = [];
  try {
    for (const [field, kind] of [["pdf", "article_pdf"], ["poster", "poster"], ["cover", "cover"]]) {
      if (files[field]) uploaded.push({ field, media: await uploadEditorialFile(files[field], kind) });
    }
    const paths = Object.fromEntries(uploaded.map(({field,media}) => [field,media.storage_path]));
    const { data, error: insertError } = await supabase.from("articles").insert({
      ...payload, created_by: user.id, status: "pending_review",
      pdf_path: paths.pdf || null, poster_path: paths.poster || null, cover_path: paths.cover || null
    }).select().single();
    if (insertError) throw insertError;
    for (const {media} of uploaded) {
      await supabase.from("media").update({article_id:data.id}).eq("id",media.id);
    }
    await writeAudit("article_submitted", "article", data.id, { title: data.title });
    return data;
  } catch (error) {
    // Best-effort cleanup on failed submissions; storage is private throughout.
    for (const {media} of uploaded) {
      await supabase.storage.from("rls-editorial").remove([media.storage_path]);
      await supabase.from("media").delete().eq("id", media.id);
    }
    throw error;
  }
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
  if (!["published", "rejected", "pending_review"].includes(status)) throw new Error("وضعیت درخواستی مجاز نیست.");
  const { profile, user, error } = await getActiveProfile();
  if (error || profile?.role !== "admin") throw new Error("این عملیات فقط برای مدیر مجاز است.");
  const changes = {
    status, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    ...(status === "published" ? { published_at: new Date().toISOString() } : {})
  };
  const { data, error: updateError } = await supabase.from("articles").update(changes).eq("id", id).select().single();
  if (updateError) throw updateError;
  await writeAudit("article_" + status, "article", id, {});
  return data;
}
