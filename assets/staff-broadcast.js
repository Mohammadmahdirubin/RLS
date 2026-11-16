(function(){
 const panel=document.getElementById('staff-broadcast-panel');
 const form=document.getElementById('staff-broadcast-form');
 if(!panel||!form)return;
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 window.RLS_SUPABASE_CLIENT=db;
 const message=document.getElementById('staff-broadcast-message'),send=document.getElementById('staff-broadcast-send'),fileInput=form.elements.attachments;
 const allowedStaff=new Set(['b39de401-7b39-478c-88ab-50e89695e11a','1301d37a-faf9-41cc-8f30-317f7dc56b45']);
 const allowedExtensions=/\\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i;
 let authorized=false;const say=value=>{message.textContent=value;};
 async function checkAccess(){
  try{const {data:{session},error}=await db.auth.getSession();if(error||!session){authorized=false;panel.hidden=true;return;}
   const {data:role,error:roleError}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
   authorized=!roleError&&allowedStaff.has(session.user.id)&&role?.role==='instructor_admin';panel.hidden=!authorized;
  }catch(error){authorized=false;panel.hidden=true;console.warn('Staff broadcast authorization failed:',error);}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!authorized){say('دسترسی ارسال پیام همگانی تأیید نشد؛ دوباره وارد پنل شوید.');return;}
  const subject=String(form.elements.subject.value||'').trim(),body=String(form.elements.message.value||'').trim(),files=[...(fileInput.files||[])];
  if(subject.length<2||body.length<2){say('موضوع و متن پیام را کامل وارد کنید.');return;}
  if(files.length>2){say('حداکثر دو فایل پیوست مجاز است.');return;}
  for(const file of files){if(file.size>5*1024*1024){say('حجم هر فایل نباید بیشتر از ۵ مگابایت باشد: '+file.name);return;}if(!allowedExtensions.test(file.name)){say('نوع فایل مجاز نیست: '+file.name);return;}}
  if(!confirm('ایمیل با موضوع «'+subject+'» برای همه ثبت‌نام‌کنندگان انجمن، شامل اعضا و متقاضیان، ارسال شود؟ این عملیات پس از شروع قابل بازگشت نیست.'))return;
  send.disabled=true;form.querySelector('[type="reset"]').disabled=true;
  try{say('در حال آماده‌سازی و ارسال ایمیل‌ها…');const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError||!session?.access_token)throw new Error('نشست معتبر نیست؛ دوباره وارد شوید.');
   const payload=new FormData();payload.append('subject',subject);payload.append('message',body);files.forEach(file=>payload.append('attachments',file,file.name));
   const {data:result,error}=await db.functions.invoke('admin-broadcast-email',{headers:{Authorization:'Bearer '+session.access_token},body:payload});if(error)throw error;
   if(!result?.ok){say('ارسال کامل نشد. موفق: '+(result?.sent||0)+'، ناموفق: '+(result?.failed||0)+'، کل گیرندگان: '+(result?.total||0)+'. '+(result?.error||''));return;}
   say('ارسال پایان یافت. موفق: '+result.sent+' از '+result.total+' گیرنده؛ ناموفق: '+result.failed+'. گزارش در آرشیو ایمیل‌ها ثبت شد.');form.reset();
  }catch(error){console.error('Staff broadcast failed:',error);say('ارسال ایمیل ناموفق بود: '+(error?.message||'خطای نامشخص'));}
  finally{send.disabled=false;form.querySelector('[type="reset"]').disabled=false;}
 });
 db.auth.onAuthStateChange(()=>setTimeout(checkAccess,0));checkAccess();
})();