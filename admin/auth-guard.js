import { backendConfigured, supabase, getActiveProfile, createArticle, reviewArticle, writeAudit } from "./backend-client.js";

const notice = document.querySelector(".notice");
const statusLabel = {published:"منتشرشده", pending_review:"در انتظار تأیید", draft:"پیش‌نویس", rejected:"ردشده"};
const languageLabel = {fa:"فارسی", en:"English", ru:"Русский"};
const statusClass = {published:"published", pending_review:"pending", draft:"draft", rejected:"draft"};
const $ = (selector) => document.querySelector(selector);
const makeCell = (text) => { const td=document.createElement("td"); td.textContent=text ?? ""; return td; };
const makeStatus = (status) => { const td=document.createElement("td"); const span=document.createElement("span"); span.className="status "+(statusClass[status]||"draft"); span.textContent=statusLabel[status]||status; td.append(span); return td; };
const showError = (error) => { if (notice) notice.textContent = error?.message || "خطایی در ارتباط با سرویس پشتیبان رخ داد."; };

if (!backendConfigured) {
  if (notice) notice.textContent = "سرویس پشتیبان پیکربندی نشده است؛ راهنمای admin/BACKEND-SETUP.md را اجرا کنید.";
  location.replace("login.html");
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) location.replace("login.html");
  else {
    const { profile, error } = await getActiveProfile();
    if (error || !profile) {
      await supabase.auth.signOut();
      location.replace("login.html");
    } else {
      const admin = profile.role === "admin";
      $("#roleName").textContent = admin ? "مدیر سامانه" : "کارشناس";
      $("#roleDesc").textContent = admin ? "مدیریت و تأیید نهایی" : "ثبت محتوا و ارسال برای بررسی";
      document.querySelectorAll(".admin-only").forEach(el => { if (!admin) el.remove(); });
      $("#roleSwitch").textContent = (profile.display_name || (admin ? "م" : "ک")).slice(0,1);
      $("#roleSwitch").title = "خروج از سامانه";
      $("#roleSwitch").addEventListener("click", async () => {
        await supabase.auth.signOut();
        location.replace("login.html");
      });
      if (notice) notice.textContent = admin
        ? "ورود امن برقرار است. انتشار نهایی و تنظیمات مدیریتی در اختیار مدیران است."
        : "ورود امن برقرار است. مقاله‌های جدید برای بررسی مدیر ارسال می‌شوند.";

      async function refreshArticles() {
        let request = supabase.from("articles")
          .select("id,title,corresponding_author,language,status,created_at,created_by")
          .order("created_at", {ascending:false}).limit(200);
        const query = $("#articleSearch")?.value.trim();
        const status = $("#statusFilter")?.value;
        const language = $("#languageFilter")?.value;
        if (query) {
          const safe = query.replace(/[,%()]/g,"");
          request = request.or("title.ilike.%"+safe+"%,corresponding_author.ilike.%"+safe+"%");
        }
        if (status) request = request.eq("status", status);
        if (language) request = request.eq("language", language);
        const {data, error} = await request;
        if (error) throw error;
        const rows = data || [];
        const overviewRows = $("#recentArticles");
        const articleRows = $("#articlesTable");
        if (overviewRows) overviewRows.replaceChildren();
        if (articleRows) articleRows.replaceChildren();
        for (const row of rows) {
          const date = new Date(row.created_at).toLocaleDateString("fa-IR");
          if (overviewRows && overviewRows.children.length < 6) {
            const tr=document.createElement("tr");
            const title=makeCell(""); const strong=document.createElement("strong"); strong.textContent=row.title; const small=document.createElement("small"); small.textContent=languageLabel[row.language]||row.language; title.append(strong,small);
            tr.append(title,makeCell(row.corresponding_author),makeCell(date),makeStatus(row.status));
            const action=makeCell("");
            if (admin && row.status==="pending_review") {
              const btn=document.createElement("button"); btn.className="text-button"; btn.textContent="انتشار";
              btn.addEventListener("click", async()=>{btn.disabled=true;try{await reviewArticle(row.id,"published");await refreshAll();}catch(e){showError(e);btn.disabled=false;}});
              action.append(btn);
            }
            tr.append(action); overviewRows.append(tr);
          }
          if (articleRows) {
            const tr=document.createElement("tr");
            tr.append(makeCell(row.title),makeCell(row.corresponding_author),makeCell(languageLabel[row.language]||row.language),makeStatus(row.status),makeCell(date));
            const actions=makeCell("");
            if (admin && row.status==="pending_review") {
              for (const [label,next] of [["انتشار","published"],["رد مقاله","rejected"]]) {
                const btn=document.createElement("button"); btn.className="text-button"; btn.textContent=label;
                btn.addEventListener("click",async()=>{btn.disabled=true;try{await reviewArticle(row.id,next);await refreshAll();}catch(e){showError(e);btn.disabled=false;}});
                actions.append(btn);
              }
            }
            tr.append(actions); articleRows.append(tr);
          }
        }
        if (!rows.length) {
          if (overviewRows) overviewRows.append(makeCell("هنوز مقاله‌ای برای این حساب ثبت نشده است."));
          if (articleRows) { const tr=document.createElement("tr"); const td=makeCell("مقاله‌ای مطابق فیلترها پیدا نشد."); td.colSpan=6; tr.append(td); articleRows.append(tr); }
        }
        $("#statArticles").textContent = String(rows.length);
        $("#statPending").textContent = String(rows.filter(x=>x.status==="pending_review").length);
        $("#statPublished").textContent = String(rows.filter(x=>x.status==="published").length);
      }

      async function refreshMedia() {
        const {data,error}=await supabase.from("media").select("id,original_name,media_kind,size_bytes,created_at,storage_path").order("created_at",{ascending:false}).limit(200);
        if(error) throw error;
        const tbody=$("#mediaTable"); if(tbody) tbody.replaceChildren();
        for(const item of data||[]) {
          const tr=document.createElement("tr");
          const name=makeCell(item.original_name);
          const kind=makeCell(({article_pdf:"PDF مقاله",poster:"پوستر",cover:"جلد"})[item.media_kind]||item.media_kind);
          const size=makeCell((item.size_bytes/1024/1024).toLocaleString("fa-IR",{maximumFractionDigits:2})+" مگابایت");
          const date=makeCell(new Date(item.created_at).toLocaleDateString("fa-IR"));
          tr.append(name,kind,size,date); if(tbody) tbody.append(tr);
        }
        if(tbody && !(data||[]).length) { const tr=document.createElement("tr"); const td=makeCell("فایلی ثبت نشده است."); td.colSpan=4; tr.append(td); tbody.append(tr); }
        $("#statMedia").textContent=String((data||[]).length);
      }

      async function refreshActivity() {
        if(!admin) return;
        const {data,error}=await supabase.from("audit_logs").select("id,action,entity_type,entity_id,created_at").order("created_at",{ascending:false}).limit(100);
        if(error) throw error;
        const tbody=$("#activityTable"); if(tbody) tbody.replaceChildren();
        for(const item of data||[]) {
          const tr=document.createElement("tr");
          tr.append(makeCell(item.action),makeCell(item.entity_type),makeCell(item.entity_id||"—"),makeCell(new Date(item.created_at).toLocaleString("fa-IR")));
          if(tbody) tbody.append(tr);
        }
        if(tbody && !(data||[]).length) {const tr=document.createElement("tr");const td=makeCell("رویدادی ثبت نشده است.");td.colSpan=4;tr.append(td);tbody.append(tr);}
      }

      async function refreshAll() {
        try { await refreshArticles(); await refreshMedia(); await refreshActivity(); }
        catch(error) { showError(error); console.error(error); }
      }
      await refreshAll();
      $("#articleSearch")?.addEventListener("input",()=>refreshArticles().catch(showError));
      $("#statusFilter")?.addEventListener("change",()=>refreshArticles().catch(showError));
      $("#languageFilter")?.addEventListener("change",()=>refreshArticles().catch(showError));

      const form=$("#articleForm");
      if(form) form.addEventListener("submit",async event=>{
        event.preventDefault(); event.stopImmediatePropagation();
        const button=$("#saveDraft"), message=$("#formMessage");
        button.disabled=true; message.textContent="در حال ثبت مقاله و بارگذاری فایل‌ها…";
        try {
          const inputs=[...form.querySelectorAll("input:not([type=file]),select,textarea")];
          const title=inputs[0]?.value.trim(), corresponding_author=inputs[1]?.value.trim();
          if(!title||!corresponding_author) throw new Error("عنوان مقاله و نام نویسنده مسئول الزامی است.");
          const payload={title,corresponding_author,language:inputs[2]?.value||"fa",issue_label:inputs[3]?.value||"",publication_year:inputs[4]?.value||"",article_type:inputs[5]?.value||"research",abstract:form.querySelector("textarea")?.value||""};
          const fileInputs=[...form.querySelectorAll('input[type="file"]')];
          const files={pdf:fileInputs[0]?.files?.[0]||null,poster:fileInputs[1]?.files?.[0]||null,cover:fileInputs[2]?.files?.[0]||null};
          const article=await createArticle(payload,files);
          message.textContent="مقاله با موفقیت ثبت و برای بررسی مدیر ارسال شد.";
          await refreshAll(); form.reset();
          await writeAudit("article_submission_completed","article",article.id,{title:article.title});
        } catch(error) { message.textContent=error.message||"ثبت مقاله ناموفق بود."; }
        finally {button.disabled=false;}
      },true);
    }
  }
}
