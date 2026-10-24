import { backendConfigured, supabase, getActiveProfile } from "./backend-client.js";

const notice = document.querySelector(".notice");
function showSetupNotice() {
  if (notice) notice.textContent = "سرویس پشتیبان هنوز پیکربندی نشده است. راهنمای admin/BACKEND-SETUP.md را دنبال کنید؛ پنل تا آن زمان قابل استفاده نیست.";
}
if (!backendConfigured) {
  showSetupNotice();
  location.replace("login.html");
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace("login.html");
  } else {
    const { profile, error } = await getActiveProfile();
    if (error || !profile) {
      await supabase.auth.signOut();
      location.replace("login.html");
    } else {
      const admin = profile.role === "admin";
      const roleName = document.getElementById("roleName");
      const roleDesc = document.getElementById("roleDesc");
      if (roleName) roleName.textContent = admin ? "مدیر سامانه" : "کارشناس";
      if (roleDesc) roleDesc.textContent = admin ? "دسترسی مدیریتی" : "ثبت محتوا و ارسال برای بررسی";
      document.querySelectorAll(".admin-only").forEach(el => {
        if (!admin) el.remove();
      });
      const preview = document.querySelector(".preview-pill");
      if (preview) preview.textContent = "ورود امن فعال";
      const switcher = document.getElementById("roleSwitch");
      if (switcher) {
        switcher.textContent = (profile.display_name || (admin ? "م" : "ک")).slice(0, 1);
        switcher.title = "خروج از سامانه";
        switcher.addEventListener("click", async () => {
          await supabase.auth.signOut();
          location.replace("login.html");
        });
      }
      const banner = document.querySelector(".notice");
      if (banner) banner.textContent = admin
        ? "وارد شده‌اید. انتشار نهایی، مدیریت کاربران و تنظیمات فقط برای مدیر فعال است."
        : "وارد شده‌اید. محتوای ثبت‌شده برای بررسی مدیر ارسال می‌شود؛ انتشار نهایی در اختیار مدیر است.";

      // Replace the visual demo with real records and enforce server-side RLS on every request.
      try {
        const { data: rows, error: rowsError } = await supabase.from("articles")
          .select("id,title,corresponding_author,language,status,created_at")
          .order("created_at", { ascending: false }).limit(100);
        if (rowsError) throw rowsError;
        const tbody = document.querySelector("#view-overview tbody");
        if (tbody) {
          tbody.replaceChildren();
          for (const row of rows || []) {
            const tr = document.createElement("tr");
            const title = document.createElement("td");
            const strong = document.createElement("strong"); strong.textContent = row.title;
            const small = document.createElement("small"); small.textContent = row.language.toUpperCase();
            title.append(strong, small);
            const author = document.createElement("td"); author.textContent = row.corresponding_author;
            const date = document.createElement("td"); date.textContent = new Date(row.created_at).toLocaleDateString("fa-IR");
            const status = document.createElement("td"); const pill = document.createElement("span"); pill.className = "status " + (row.status === "published" ? "published" : row.status === "pending_review" ? "pending" : "draft"); pill.textContent = ({published:"منتشرشده",pending_review:"در انتظار تأیید",draft:"پیش‌نویس",rejected:"ردشده"})[row.status] || row.status; status.append(pill);
            const actions = document.createElement("td");
            if (admin && row.status === "pending_review") {
              const approve = document.createElement("button"); approve.className = "text-button"; approve.textContent = "انتشار";
              approve.addEventListener("click", async () => {
                const { error } = await supabase.from("articles").update({status:"published",reviewed_by:session.user.id,reviewed_at:new Date().toISOString(),published_at:new Date().toISOString()}).eq("id",row.id);
                if (error) alert("انتشار انجام نشد: " + error.message); else location.reload();
              });
              actions.append(approve);
            }
            tr.append(title, author, date, status, actions); tbody.append(tr);
          }
        }
      } catch (e) {
        console.error("بارگذاری مقالات ناموفق بود:", e);
      }

      const form = document.getElementById("articleForm");
      if (form) {
        form.addEventListener("submit", async event => {
          event.preventDefault(); event.stopImmediatePropagation();
          const message = document.getElementById("formMessage");
          const button = form.querySelector("#saveDraft");
          if (button) button.disabled = true;
          try {
            const labels = [...form.querySelectorAll("label")];
            const inputs = [...form.querySelectorAll("input:not([type=file]), select, textarea")];
            const title = inputs[0]?.value.trim();
            const corresponding_author = inputs[1]?.value.trim();
            if (!title || !corresponding_author) throw new Error("عنوان مقاله و نام نویسنده مسئول الزامی است.");
            const langValue = inputs[2]?.value || "فارسی";
            const language = langValue === "English" ? "en" : langValue === "Русский" ? "ru" : "fa";
            const payload = {
              title, corresponding_author, language,
              issue_label: inputs[3]?.value || "",
              publication_year: inputs[4]?.value || "",
              article_type: inputs[5]?.value || "مقاله پژوهشی",
              abstract: form.querySelector("textarea")?.value || ""
            };
            const fileInputs = [...form.querySelectorAll('input[type="file"]')];
            const files = {
              pdf: fileInputs[0]?.files?.[0] || null,
              poster: fileInputs[1]?.files?.[0] || null,
              cover: fileInputs[2]?.files?.[0] || null
            };
            const { error: insertError } = await supabase.from("articles").insert({
              ...payload, created_by: session.user.id, status: "pending_review"
            }).select("id").single();
            if (insertError) throw insertError;
            // Upload selected files independently; failed uploads are reported so the editor can retry.
            const articleId = undefined;
            for (const [key, kind] of [["pdf","article_pdf"],["poster","poster"],["cover","cover"]]) {
              const file = files[key];
              if (!file) continue;
              const safeName = file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-120);
              const path = session.user.id + "/" + kind + "/" + crypto.randomUUID() + "-" + safeName;
              const { error: uploadError } = await supabase.storage.from("rls-editorial").upload(path, file, {contentType:file.type, upsert:false});
              if (uploadError) throw uploadError;
              const { error: mediaError } = await supabase.from("media").insert({
                original_name:file.name, storage_path:path, mime_type:file.type, size_bytes:file.size,
                media_kind:kind, uploaded_by:session.user.id
              });
              if (mediaError) throw mediaError;
            }
            message.textContent = "مقاله برای بررسی مدیر ثبت شد.";
            location.reload();
          } catch (e) {
            message.textContent = e.message || "ذخیره‌سازی ناموفق بود.";
          } finally {
            if (button) button.disabled = false;
          }
        }, true);
      }

      const search = document.getElementById("articleSearch");
      if (search) search.addEventListener("input", async () => {
        const query = search.value.trim();
        let request = supabase.from("articles").select("id,title,corresponding_author,language,status,created_at").order("created_at", {ascending:false}).limit(100);
        if (query) request = request.or("title.ilike.%" + query.replace(/[,%()]/g, "") + "%,corresponding_author.ilike.%" + query.replace(/[,%()]/g, "") + "%");
        const { data, error } = await request;
        const state = document.querySelector("#view-articles .empty-state");
        if (state) {
          state.replaceChildren();
          const heading = document.createElement("h3"); heading.textContent = error ? "خطا در دریافت مقالات" : "نتایج جست‌وجو";
          const list = document.createElement("div");
          for (const item of data || []) {
            const p = document.createElement("p"); p.textContent = item.title + " — " + item.corresponding_author + " — " + item.status; list.append(p);
          }
          state.append(heading, list);
        }
      });
    }
  }
}
