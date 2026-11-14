(function(){
 const panel=document.getElementById('admin-broadcast-panel');
 const form=document.getElementById('admin-broadcast-form');
 if(!panel||!form)return;
 const cfg=window.RLS_SUPABASE_CONFIG;
 if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 window.RLS_SUPABASE_CLIENT=db;
 const message=document.getElementById('admin-broadcast-message');
 const send=document.getElementById('admin-broadcast-send');
 const fileInput=form.elements.attachments;
 const maxFileSize=5*1024*1024;
 const allowedExtensions=/\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i;
 let authorized=false;
 function say(text){message.textContent=text;}
 async function checkAccess(){
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session){authorized=false;panel.hidden=true;return;}
   const {data:role,error}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
   authorized=!error&&role?.role==='admin';
   if(!authorized)panel.hidden=true;
  }catch(error){authorized=false;panel.hidden=true;console.warn('Broadcast admin authorization failed:',error);}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!authorized){say('دسترسی مدیر تأیید نشد؛ دوباره وارد پنل شوید.');return;}
  const subject=String(form.elements.subject.value||'').trim();
  const body=String(form.elements.message.value||'').trim();
  const files=[...(fileInput.files||[])];
  if(subject.length<2||body.length<2){say('موضوع و متن پیام را کامل وارد کنید.');return;}
  if(files.length>2){say('حداکثر دو فایل پیوست مجاز است.');return;}
  for(const file of files){
   if(file.size>maxFileSize){say('حجم هر فایل نباید بیشتر از ۵ مگابایت باشد: '+file.name);return;}
   if(!allowedExtensions.test(file.name)){say('نوع فایل مجاز نیست: '+file.name);return;}
  }
  if(!confirm('ایمیل با موضوع «'+subject+'» برای همه ثبت‌نام‌کنندگان انجمن ارسال شود؟ این عملیات پس از شروع قابل بازگشت نیست.'))return;
  send.disabled=true;form.querySelector('[type="reset"]').disabled=true;
  try{
   say('در حال آماده‌سازی و ارسال ایمیل‌ها به کاربران…');
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session?.access_token)throw new Error('نشست مدیر معتبر نیست؛ دوباره وارد شوید.');
   const payload=new FormData();
   payload.append('subject',subject);
   payload.append('message',body);
   files.forEach(file=>payload.append('attachments',file,file.name));
   const {data:result,error}=await db.functions.invoke('admin-broadcast-email',{
    headers:{Authorization:'Bearer '+session.access_token},body:payload
   });
   if(error)throw error;
   if(!result?.ok){
    say('ارسال کامل نشد. ارسال‌شده: '+(result?.sent||0)+'، ناموفق: '+(result?.failed||0)+'، تکراری/ردشده: '+(result?.skipped||0)+'. '+(result?.error||''));
    return;
   }
   say('ارسال پایان یافت. موفق: '+result.sent+' از '+result.total+' گیرنده؛ ناموفق: '+result.failed+'؛ تکراری/بدون نشانی معتبر: '+result.skipped+'.');
   window.dispatchEvent(new CustomEvent('rls-admin-broadcast-sent'));
   form.reset();
  }catch(error){
   console.error('Broadcast email failed:',error);
   say('ارسال ایمیل ناموفق بود: '+(error?.message||'خطای نامشخص'));
  }finally{send.disabled=false;form.querySelector('[type="reset"]').disabled=false;}
 });
 db.auth.onAuthStateChange(()=>setTimeout(checkAccess,0));
 checkAccess();
})();