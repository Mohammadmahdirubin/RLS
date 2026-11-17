export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ["https://rlsj.ir","https://www.rlsj.ir","https://mohammadmahdirubin.github.io"];
  const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS","Vary":"Origin"};
  const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (!allowed.includes(origin)) return new Response("Forbidden",{status:403});
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (!env.DB) return reply({error:"Database is not configured"},503);
  const url=new URL(request.url);
  if(url.pathname==="/certificate-api/verify" && request.method==="GET"){
   const code=(url.searchParams.get("code")||"").trim().toUpperCase();
   if(!/^RLS-RV-\d{4}-\d{6}$/.test(code))return reply({error:"شناسه گواهی معتبر نیست."},400);
   const cert=await env.DB.prepare("SELECT certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates WHERE certificate_code=?").bind(code).first();
   if(!cert)return reply({error:"گواهی با این شناسه یافت نشد."},404);
   return reply({certificate:cert});
  }
  if (!env.ADMIN_TOKEN) return reply({error:"Admin API is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if (auth !== "Bearer "+env.ADMIN_TOKEN) return reply({error:"Unauthorized"},401);
  const certificateImageMatch=url.pathname.match(/^\/admin-api\/certificates\/(\d+)\/image$/);
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
   const ghHeaders={"Authorization":"Bearer "+env.GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"};
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
   const imageUrl=savedJson?.content?.download_url;
   if(!imageUrl)return reply({error:"GitHub uploaded the image but did not return a download URL"},502);
   await env.DB.prepare("UPDATE reviewer_certificates SET certificate_image=? WHERE id=?").bind(imageUrl,id).run();
   return reply({success:true,id,certificate_code:cert.certificate_code,certificate_image:imageUrl});
  }
  if(url.pathname==="/admin-api/certificates" && request.method==="GET"){
   const result=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at,certificate_image FROM reviewer_certificates ORDER BY id DESC LIMIT 500").all();
   return reply({certificates:result.results||[]});
  }
  if(url.pathname==="/admin-api/certificates" && request.method==="POST"){
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
   const cert=await env.DB.prepare("SELECT id,certificate_code,reviewer_name,review_count,issue_date,status,created_at FROM reviewer_certificates WHERE id=?").bind(id).first();
   return reply({success:true,certificate:cert},201);
  }
  const certMatch=url.pathname.match(/^\/admin-api\/certificates\/(\d+)$/);
  if(certMatch && request.method==="PATCH"){
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const id=Number(certMatch[1]),status=String(body.status||"");
   if(!["active","revoked"].includes(status))return reply({error:"Invalid certificate status"},400);
   const result=await env.DB.prepare("UPDATE reviewer_certificates SET status=? WHERE id=?").bind(status,id).run();
   if(!(result?.meta?.changes>0))return reply({error:"Certificate not found"},404);
   return reply({success:true,id,status});
  }
  if(url.pathname==="/admin-api/manuscripts" && request.method==="GET"){
   const result=await env.DB.prepare("SELECT id,tracking_code,author,email,title,institution,orcid,abstract,message,main_filename,supplementary_filename,status,received_at,updated_at,editor_note FROM manuscripts ORDER BY received_at DESC LIMIT 500").all();
   return reply({manuscripts:result.results||[]});
  }
  const historyParts=url.pathname.split("/");
  if(historyParts.length===5 && historyParts[1]==="admin-api" && historyParts[2]==="manuscripts" && historyParts[4]==="history" && request.method==="GET"){
   const id=Number(historyParts[3]);
   if(!Number.isInteger(id)||id<1)return reply({error:"Invalid manuscript id"},400);
   const exists=await env.DB.prepare("SELECT id FROM manuscripts WHERE id=?").bind(id).first();
   if(!exists)return reply({error:"Manuscript not found"},404);
   const result=await env.DB.prepare("SELECT id,manuscript_id,status,editor_note,changed_at FROM manuscript_admin_history WHERE manuscript_id=? ORDER BY changed_at DESC,id DESC LIMIT 200").bind(id).all();
   return reply({history:result.results||[]});
  }
  const match=url.pathname.match(/^\/admin-api\/manuscripts\/(\d+)$/);
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