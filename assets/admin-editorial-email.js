(function(){
 const panel=document.getElementById('admin-editorial-email-panel');
 const form=document.getElementById('admin-editorial-email-form');
 if(!panel||!form)return;
 const cfg=window.RLS_SUPABASE_CONFIG;
 if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 window.RLS_SUPABASE_CLIENT=db;
 const load=document.getElementById('admin-editorial-load');
 const send=document.getElementById('admin-editorial-send');
 const recipientsBox=document.getElementById('admin-editorial-recipients');
 const message=document.getElementById('admin-editorial-message');
 const fileInput=form.elements.attachments;
 const maxFileSize=5*1024*1024;
 const allowedExtensions=/\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i;
 let authorized=false;
 let preview=null;
 function say(value){message.textContent=value;}
 function renderRecipients(items){
  recipientsBox.replaceChildren();
  const title=document.createElement('p');
  title.textContent='تعداد گیرندگان: '+items.length+' نفر';
  title.style.fontWeight='700';
  recipientsBox.appendChild(title);
  const list=document.createElement('ol');
  list.dir='rtl';
  items.forEach(item=>{
   const li=document.createElement('li');
   li.textContent=(item.name||'عضو هیئت تحریریه')+' — '+item.email+(item.group?' ('+item.group+')':'');
   list.appendChild(li);
  });
  recipientsBox.appendChild(list);
 }
 async function sessionAndAdmin(){
  const {data:{session},error}=await db.auth.getSession();
  if(error||!session?.access_token)return null;
  const allowedUsers=new Set(["b39de401-7b39-478c-88ab-50e89695e11a","1301d37a-faf9-41cc-8f30-317f7dc56b45"]);
  if(!allowedUsers.has(session.user.id))return null;
  authorized=true;
  return session;
 }
 async function checkAccess(){
  try{
   const session=await sessionAndAdmin();
   if(!session){authorized=false;panel.hidden=true;}
  }catch(error){authorized=false;panel.hidden=true;console.warn('Editorial email admin authorization failed:',error);}
 }
 load.addEventListener('click',async()=>{
  load.disabled=true;send.disabled=true;preview=null;
  recipientsBox.textContent='در حال دریافت فهرست از صفحه رسمی هیئت تحریریه…';
  try{
   const session=await sessionAndAdmin();
   if(!session)throw new Error('دسترسی مدیر تأیید نشد؛ دوباره وارد پنل شوید.');
   const {data,error}=await db.functions.invoke('admin-editorial-board-email',{
    headers:{Authorization:'Bearer '+session.access_token},
    body:{action:'preview'}
   });
   if(error)throw error;
   if(!data?.ok||!Array.isArray(data.recipients)||!data.recipients.length)throw new Error(data?.error||'فهرست گیرندگان دریافت نشد.');
   preview=data;
   renderRecipients(data.recipients);
   send.disabled=false;
   say('فهرست به‌روز دریافت شد. پیش از ارسال، گیرندگان بالا را بررسی کنید.');
  }catch(error){
   recipientsBox.textContent='دریافت فهرست ناموفق بود.';
   say('خطا در دریافت فهرست: '+(error?.message||'خطای نامشخص'));
  }finally{load.disabled=false;}
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!authorized||!preview?.recipients?.length){say('ابتدا فهرست گیرندگان را دریافت کنید.');return;}
  const subject=String(form.elements.subject.value||'').trim();
  const body=String(form.elements.message.value||'').trim();
  const files=[...(fileInput.files||[])];
  if(subject.length<2||body.length<2){say('موضوع و متن پیام را کامل وارد کنید.');return;}
  if(files.length>2){say('حداکثر دو فایل پیوست مجاز است.');return;}
  for(const file of files){
   if(file.size>maxFileSize){say('حجم هر فایل نباید بیشتر از ۵ مگابایت باشد: '+file.name);return;}
   if(!allowedExtensions.test(file.name)){say('نوع فایل مجاز نیست: '+file.name);return;}
  }
  const count=preview.recipients.length;
  if(!confirm('ایمیل با موضوع «'+subject+'» برای '+count+' عضو هیئت تحریریه زبان روسی و انگلیسی/زبان‌شناسی ارسال شود؟ این عملیات پس از شروع قابل بازگشت نیست.'))return;
  send.disabled=true;load.disabled=true;form.querySelector('[type="reset"]').disabled=true;
  try{
   say('در حال آماده‌سازی و ارسال ایمیل‌ها…');
   const session=await sessionAndAdmin();
   if(!session)throw new Error('نشست مدیر معتبر نیست؛ دوباره وارد شوید.');
   const payload=new FormData();
   payload.append('action','send');
   payload.append('subject',subject);
   payload.append('message',body);
   files.forEach(file=>payload.append('attachments',file,file.name));
   const {data,error}=await db.functions.invoke('admin-editorial-board-email',{
    headers:{Authorization:'Bearer '+session.access_token},body:payload
   });
   if(error)throw error;
   window.dispatchEvent(new CustomEvent('rls-admin-broadcast-sent'));
   if(!data?.ok){
    say('ارسال کامل نشد. موفق: '+(data?.sent||0)+'، ناموفق: '+(data?.failed||0)+'. '+(data?.error||''));
    return;
   }
   say('ارسال پایان یافت. موفق: '+data.sent+' از '+data.total+' گیرنده؛ ناموفق: '+data.failed+'. گزارش در آرشیو ایمیل‌ها ثبت شد.');
   form.reset();
  }catch(error){
   console.error('Iranian editorial email failed:',error);
   say('ارسال ایمیل ناموفق بود: '+(error?.message||'خطای نامشخص'));
  }finally{send.disabled=false;load.disabled=false;form.querySelector('[type="reset"]').disabled=false;}
 });
 form.addEventListener('reset',()=>{preview=null;send.disabled=true;recipientsBox.textContent='برای مشاهده فهرست گیرندگان، دکمه دریافت فهرست را بزنید.';say('');});
 db.auth.onAuthStateChange(()=>setTimeout(checkAccess,0));
 checkAccess();
})();