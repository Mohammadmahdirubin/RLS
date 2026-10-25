export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ["https://rlsj.ir","https://www.rlsj.ir","https://mohammadmahdirubin.github.io"];
  const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Vary":"Origin"};
  const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (!allowed.includes(origin)) return new Response("Forbidden",{status:403});
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (!env.DB || !env.ADMIN_TOKEN) return reply({error:"Admin API is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if (auth !== "Bearer "+env.ADMIN_TOKEN) return reply({error:"Unauthorized"},401);
  const url=new URL(request.url);
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
   await env.DB.prepare("UPDATE manuscripts SET status=?,editor_note=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status,note,id).run();
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
   return reply({success:true,statusChanged:previousStatus!==status,emailSent,emailError});
  }
  return reply({error:"Not found"},404);
 }
};