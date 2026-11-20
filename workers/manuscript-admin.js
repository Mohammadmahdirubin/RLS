
const REVIEWER_REGISTRY_PATH = "assets/reviewer-certificates.json";
const REVIEWER_REGISTRY_URL = "https://api.github.com/repos/Mohammadmahdirubin/RLS/contents/" + REVIEWER_REGISTRY_PATH;
function reviewerGithubHeaders(env) {
  if (!env.GITHUB_TOKEN) throw new Error("GitHub token is not configured.");
  return {"Authorization":"Bearer "+env.GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"RLS-Reviewer-Certificate-Registry/1.0","Content-Type":"application/json"};
}
function decodeGithubFileBase64(value) {
  const binary=atob(String(value||"").replace(/\s/g,""));
  const bytes=Uint8Array.from(binary,character=>character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encodeGithubFileBase64(value) {
  const bytes=new TextEncoder().encode(value);let binary="";
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return btoa(binary);
}
function emptyReviewerRegistry(){return {schema:1,source:"rls_reviewer_certificates",updated_at:null,count:0,certificates:{}};}
async function readReviewerRegistry(env) {
  const response=await fetch(REVIEWER_REGISTRY_URL,{headers:reviewerGithubHeaders(env)});
  if(response.status===404)return {registry:emptyReviewerRegistry(),sha:null};
  if(!response.ok){const detail=await response.text();throw new Error("GitHub registry read failed ("+response.status+"): "+detail.slice(0,250));}
  const file=await response.json();const registry=JSON.parse(decodeGithubFileBase64(file.content));
  if(!registry||typeof registry!=="object"||Array.isArray(registry))throw new Error("GitHub reviewer registry has an invalid structure.");
  if(!registry.certificates||typeof registry.certificates!=="object"||Array.isArray(registry.certificates))registry.certificates={};
  return {registry,sha:file.sha};
}
async function updateReviewerRegistry(env,certificates,message) {
  const headers=reviewerGithubHeaders(env);
  for(let attempt=0;attempt<5;attempt++){
    const current=await readReviewerRegistry(env);const registry=current.registry;
    let changed=!current.sha;
    for(const certificate of certificates){
      if(!certificate||!/^RLS-RV-\d{4}-\d{6}$/.test(String(certificate.certificate_code||"")))throw new Error("A certificate has an invalid verification code.");
      const record={
        id:certificate.id??null,certificate_code:certificate.certificate_code,
        reviewer_name:String(certificate.reviewer_name||""),review_count:Number(certificate.review_count||0),
        issue_date:String(certificate.issue_date||""),status:certificate.status==="revoked"?"revoked":"active",
        created_at:certificate.created_at||null,certificate_image:certificate.certificate_image||null
      };
      if(JSON.stringify(registry.certificates[certificate.certificate_code]||null)!==JSON.stringify(record)){
        registry.certificates[certificate.certificate_code]=record;changed=true;
      }
    }
    registry.schema=1;registry.source="rls_reviewer_certificates";
    registry.count=Object.keys(registry.certificates).length;
    if(!changed)return {saved:true,count:registry.count,commit:null,commit_url:null,unchanged:true};
    registry.updated_at=new Date().toISOString();
    const payload={message:message||"Update RLS reviewer certificate registry",content:encodeGithubFileBase64(JSON.stringify(registry,null,2)+"\n")};
    if(current.sha)payload.sha=current.sha;
    const response=await fetch(REVIEWER_REGISTRY_URL,{method:"PUT",headers,body:JSON.stringify(payload)});
    if(response.ok){const saved=await response.json();return {saved:true,count:registry.count,commit:saved.commit?.sha||null,commit_url:saved.commit?.html_url||null};}
    const detail=await response.text();
    if((response.status===409||response.status===422)&&attempt<4)continue;
    throw new Error("GitHub registry write failed ("+response.status+"): "+detail.slice(0,300));
  }
  throw new Error("GitHub registry changed repeatedly; retry the synchronization.");
}

export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  // Custom-domain proxy route: Cloudflare Route rlsj.ir/worker-api/*
  // Normalize the routed prefix so existing API handlers remain unchanged.
  const path = url.pathname.startsWith("/worker-api/")
    ? url.pathname.slice("/worker-api".length)
    : (url.pathname === "/worker-api" ? "/" : url.pathname);
  const publicVerifyEndpoint = path === "/certificate-api/verify";
  const origin = request.headers.get("Origin") || "";
  const allowed = publicVerifyEndpoint || (path === "/admin-api/health" && !origin) || origin === "https://rlsj.ir" ||
    origin === "https://www.rlsj.ir" ||
    origin === "https://mohammadmahdirubin.github.io" ||
    /^https:\/\/(?:[a-z0-9-]+\.)*rlsj\.ir$/.test(origin);
  const headers = {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":publicVerifyEndpoint ? "*" : (allowed ? origin : "null"),
    "Access-Control-Allow-Headers":"Authorization, Content-Type, Accept, X-Requested-With",
    "Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS",
    "Access-Control-Max-Age":"86400",
    "Vary":"Origin"
  };
  const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (!allowed) return new Response(JSON.stringify({error:"Origin not allowed",origin:origin||"(none)"}),{status:403,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
  if (request.method==="OPTIONS") {
    const preflightHeaders = new Headers(headers);
    if (request.headers.get("Access-Control-Request-Private-Network")==="true") preflightHeaders.set("Access-Control-Allow-Private-Network","true");
    return new Response(null,{status:204,headers:preflightHeaders});
  }
  if((path==="/admin-api/health" && request.method==="GET") && (!origin || allowed)){
   return reply({ok:true,worker:"rls-manuscript-admin",release:"github-reviewer-registry-2026-11-20-b",databaseConfigured:!!env.DB,adminTokenConfigured:!!env.ADMIN_TOKEN,githubTokenConfigured:!!env.GITHUB_TOKEN,origin});
  }
  if(path==="/certificate-api/verify" && request.method==="GET"){
   const code=(url.searchParams.get("code")||"").trim().toUpperCase();
   if(!/^RLS-RV-\d{4}-\d{6}$/.test(code))return reply({error:"شناسه گواهی معتبر نیست."},400);
   try {
    const {registry}=await readReviewerRegistry(env);const cert=registry.certificates[code];
    if(!cert||cert.certificate_code!==code)return reply({error:"گواهی با این شناسه در دفتر ثبت GitHub یافت نشد."},404);
    return reply({certificate:cert,source:"github",registry_updated_at:registry.updated_at});
   } catch(error) {return reply({error:"دفتر ثبت گواهی‌های GitHub در دسترس نیست: "+String(error?.message||error).slice(0,300)},502);}
  }
  if (!env.DB) return reply({error:"Database is not configured"},503);
  if (!env.ADMIN_TOKEN) return reply({error:"Admin API is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if (auth !== "Bearer "+env.ADMIN_TOKEN) return reply({error:"Unauthorized"},401);
  const certificateImageMatch=path.match(/^\/admin-api\/certificates\/(\d+)\/image$/);
  if(certificateImageMatch && request.method==="POST"){
   if(!env.GITHUB_TOKEN)return reply({error:"GitHub storage is not configured. Set GITHUB_TOKEN."},503);
   const id=Number(certificateImageMatch[1]);
   const cert=await env.DB.prepare("SELECT id,certificate_code FROM reviewer_certificates WHERE id=?").bind(id).first();
   if(!cert)return reply({error:"Certificate not found"},404);
   const declaredLength=Number(request.headers.get("Content-Length")||0);
   if(declaredLength>5500000)return reply({error:"PNG image is too large"},413);
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const image=String(body.image||"");
   const prefix="data:image/png;base64,";
   if(!image.startsWith(prefix))return reply({error:"A PNG data URL is required"},400);
   const imageBase64=image.slice(prefix.length).replace(/\s/g,"");
   if(imageBase64.length<100||imageBase64.length>4500000||!imageBase64.startsWith("iVBORw0KGgo"))return reply({error:"Invalid or oversized PNG image"},400);
   const ghHeaders={"Authorization":"Bearer "+env.GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"RLS-Manuscript-Admin/1.0 (https://rlsj.ir)","Content-Type":"application/json"};
   const path="assets/certificates/"+cert.certificate_code+".png";
   const contentUrl="https://api.github.com/repos/Mohammadmahdirubin/RLS/contents/"+path.split("/").map(encodeURIComponent).join("/");
   let existingSha=null;
   const previous=await fetch(contentUrl,{headers:ghHeaders});
   if(previous.ok){const old=await previous.json();existingSha=old.sha;}
   else if(previous.status!==404){const detail=await previous.text();return reply({error:"GitHub lookup failed: "+previous.status+" "+detail.slice(0,250)},502);}
   const payload={message:"Store reviewer certificate image "+cert.certificate_code,content:imageBase64};
   if(existingSha)payload.sha=existingSha;
   const saved=await fetch(contentUrl,{method:"PUT",headers:ghHeaders,body:JSON.stringify(payload)});
   if(!saved.ok){const detail=await saved.text();return reply({error:"GitHub upload failed: "+saved.status+" "+detail.slice(0,350)},502);}
   const savedJson=await saved.json();
   const imageUrl=savedJson?.content?.download_url ? savedJson.content.download_url+"?v="+Date.now() : null;
   if(!imageUrl)return reply({error:"GitHub uploaded the image but did not return a download URL"},502);
   await env.DB.prepare("UPDATE reviewer_certificates SET certificate_image=? WHERE id=?").bind(imageUrl,id).run();
   const updatedCert=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates WHERE id=?").bind(id).first();
   try {
    const github=await updateReviewerRegistry(env,[updatedCert],"Save reviewer certificate image "+cert.certificate_code);
    return reply({success:true,id,certificate_code:cert.certificate_code,certificate_image:imageUrl,github_saved:true,github_commit:github.commit_url});
   } catch(error) {return reply({error:"تصویر در GitHub ذخیره شد، اما به‌روزرسانی دفتر ثبت گواهی انجام نشد: "+String(error?.message||error).slice(0,250),saved_in_database:true,github_saved:false},502);}
  }
  if(path==="/admin-api/certificates" && request.method==="GET"){
   const result=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates ORDER BY id DESC LIMIT 500").all();
   const certificates=result.results||[];
   try {
    const github=await updateReviewerRegistry(env,certificates,"Sync RLS reviewer certificates to public GitHub registry");
    return reply({certificates,github_saved:true,github_count:github.count,github_commit:github.commit_url});
   } catch(error) {
    return reply({error:"خواندن سوابق انجام شد، اما همگام‌سازی با GitHub ناموفق بود: "+String(error?.message||error).slice(0,250),certificates,github_saved:false},502);
   }
  }
  if(path==="/admin-api/certificates" && request.method==="POST"){
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const reviewer=String(body.reviewer_name||"").trim().slice(0,200);
   const count=Number(body.review_count);
   const issueDate=String(body.issue_date||"").trim().slice(0,20);
   if(!reviewer)return reply({error:"نام داور الزامی است."},400);
   if(!Number.isInteger(count)||count<1||count>10000)return reply({error:"تعداد داوری باید عدد صحیح بین ۱ تا ۱۰۰۰۰ باشد."},400);
   if(!/^\d{4}\/\d{2}\/\d{2}$/.test(issueDate))return reply({error:"تاریخ صدور باید به صورت YYYY/MM/DD باشد."},400);
   const pendingCode="TMP-"+crypto.randomUUID();
   const inserted=await env.DB.prepare("INSERT INTO reviewer_certificates (certificate_code,reviewer_name,review_count,issue_date,status) VALUES (?,?,?,?,'active')").bind(pendingCode,reviewer,count,issueDate).run();
   const id=inserted?.meta?.last_row_id;
   if(!id)return reply({error:"ثبت گواهی انجام نشد."},500);
   const year=new Date().getUTCFullYear();
   const code="RLS-RV-"+year+"-"+String(id).padStart(6,"0");
   await env.DB.prepare("UPDATE reviewer_certificates SET certificate_code=? WHERE id=?").bind(code,id).run();
   const cert=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates WHERE id=?").bind(id).first();
   try {
    const github=await updateReviewerRegistry(env,[cert],"Register reviewer certificate "+code);
    return reply({success:true,certificate:cert,github_saved:true,github_commit:github.commit_url},201);
   } catch(error) {
    return reply({error:"گواهی در پایگاه داده ثبت شد، اما ثبت آن در GitHub کامل نشد. روی «به‌روزرسانی سوابق» بزنید تا همگام‌سازی دوباره انجام شود. جزئیات: "+String(error?.message||error).slice(0,220),certificate:cert,saved_in_database:true,github_saved:false},502);
   }
  }
  const certMatch=path.match(/^\/admin-api\/certificates\/(\d+)$/);
  if(certMatch && request.method==="PATCH"){
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const id=Number(certMatch[1]),status=String(body.status||"");
   if(!["active","revoked"].includes(status))return reply({error:"Invalid certificate status"},400);
   const result=await env.DB.prepare("UPDATE reviewer_certificates SET status=? WHERE id=?").bind(status,id).run();
   if(!(result?.meta?.changes>0))return reply({error:"Certificate not found"},404);
   const cert=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates WHERE id=?").bind(id).first();
   try {
    const github=await updateReviewerRegistry(env,[cert],"Update reviewer certificate status "+cert.certificate_code);
    return reply({success:true,id,status,github_saved:true,github_commit:github.commit_url});
   } catch(error) {
    return reply({error:"وضعیت در پایگاه داده تغییر کرد، اما همگام‌سازی وضعیت در GitHub انجام نشد؛ «به‌روزرسانی سوابق» را اجرا کنید. جزئیات: "+String(error?.message||error).slice(0,220),updated_in_database:true,github_saved:false},502);
   }
  }
  if(path==="/admin-api/manuscripts" && request.method==="GET"){
   const result=await env.DB.prepare("SELECT id,tracking_code,author,email,title,institution,orcid,abstract,message,main_filename,supplementary_filename,status,received_at,updated_at,editor_note FROM manuscripts ORDER BY received_at DESC LIMIT 500").all();
   return reply({manuscripts:result.results||[]});
  }
  const historyParts=path.split("/");
  if(historyParts.length===5 && historyParts[1]==="admin-api" && historyParts[2]==="manuscripts" && historyParts[4]==="history" && request.method==="GET"){
   const id=Number(historyParts[3]);
   if(!Number.isInteger(id)||id<1)return reply({error:"Invalid manuscript id"},400);
   const exists=await env.DB.prepare("SELECT id FROM manuscripts WHERE id=?").bind(id).first();
   if(!exists)return reply({error:"Manuscript not found"},404);
   const result=await env.DB.prepare("SELECT id,manuscript_id,status,editor_note,changed_at FROM manuscript_admin_history WHERE manuscript_id=? ORDER BY changed_at DESC,id DESC LIMIT 200").bind(id).all();
   return reply({history:result.results||[]});
  }
  const match=path.match(/^\/admin-api\/manuscripts\/(\d+)$/);
  if(match && request.method==="PATCH"){
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const allowedStatuses=["received","in_review","revision_required","accepted","rejected"];
   const id=Number(match[1]),status=String(body.status||""),note=String(body.editor_note||"").slice(0,10000);
   if(!allowedStatuses.includes(status))return reply({error:"Invalid status"},400);
   const existing=await env.DB.prepare("SELECT id,status,email,author,title,tracking_code FROM manuscripts WHERE id=?").bind(id).first();
   if(!existing)return reply({error:"Manuscript not found"},404);
   const previousStatus=existing.status;
   const updateResult=await env.DB.prepare("UPDATE manuscripts SET status=?,editor_note=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status,note,id).run();
   const saved=await env.DB.prepare("SELECT status FROM manuscripts WHERE id=?").bind(id).first();
   if(!saved || saved.status!==status) return reply({error:"Status update could not be verified",previousStatus,requestedStatus:status,savedStatus:saved?.status||null,changes:updateResult?.meta?.changes??null},500);
   await env.DB.prepare("INSERT INTO manuscript_admin_history (manuscript_id,status,editor_note,changed_at) VALUES (?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))").bind(id,status,note).run();
   let emailSent=false,emailError=null;
   const language=["fa","ru","en"].includes(body.email_language)?body.email_language:"fa";
   if(previousStatus!==status && existing.email){
    if(!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL){emailError="Email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL secrets.";}
    else {
     const statusText={
      fa:{received:"دریافت‌شده",in_review:"در حال بررسی",revision_required:"نیازمند اصلاح",accepted:"پذیرفته‌شده",rejected:"ردشده"},
      ru:{received:"Получена",in_review:"На рассмотрении",revision_required:"Требуются исправления",accepted:"Принята",rejected:"Отклонена"},
      en:{received:"Received",in_review:"Under review",revision_required:"Revision required",accepted:"Accepted",rejected:"Rejected"}
     };
     const messages={
      fa:{subject:"به‌روزرسانی وضعیت مقاله شما",greeting:"نویسنده گرامی",intro:"وضعیت مقاله ارسالی شما در نشریه مطالعات زبان روسی به‌روزرسانی شد.",status:"وضعیت جدید",code:"کد رهگیری",title:"عنوان مقاله",outro:"این پیام به‌صورت خودکار ارسال شده است. لطفاً برای پیگیری از کد رهگیری مقاله استفاده کنید."},
      ru:{subject:"Обновление статуса вашей статьи",greeting:"Уважаемый автор",intro:"Статус вашей статьи в журнале «Russian Language Studies» обновлён.",status:"Новый статус",code:"Код отслеживания",title:"Название статьи",outro:"Это автоматическое уведомление. Пожалуйста, используйте код отслеживания при обращении в редакцию."},
      en:{subject:"Update on your manuscript status",greeting:"Dear Author",intro:"The status of your submission to Russian Language Studies has been updated.",status:"New status",code:"Tracking code",title:"Manuscript title",outro:"This is an automated notification. Please use the tracking code when contacting the editorial office."}
     };
     const m=messages[language],st=statusText[language][status];
     const textBody=[m.greeting+",","",m.intro,"",m.title+": "+(existing.title||"—"),m.code+": "+(existing.tracking_code||"—"),m.status+": "+st,"",m.outro].join("\n");
     try{
      const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[existing.email],subject:m.subject,text:textBody})});
      if(!mail.ok){const detail=await mail.text();emailError="Email provider returned "+mail.status+": "+detail.slice(0,300);}
      else emailSent=true;
     }catch(e){emailError="Email request failed: "+String(e&&e.message||e).slice(0,200);}
    }
   }
   return reply({success:true,previousStatus,requestedStatus:status,savedStatus:saved.status,statusChanged:previousStatus!==saved.status,emailSent,emailError,emailAddressPresent:!!existing.email});
  }
  return reply({error:"Not found"},404);
 }
};