(function(){
 'use strict';
 const cfg=window.RLS_SUPABASE_CONFIG;
 if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 window.RLS_SUPABASE_CLIENT=db;
 const statusEl=document.getElementById('admin-google-live-status');
 const detailEl=document.getElementById('admin-google-live-detail');
 const refreshBtn=document.getElementById('admin-google-refresh');
 const summary=document.getElementById('admin-google-meet-summary');
 const redirect='https://tcssggnlvpmravhyqtqd.supabase.co/functions/v1/google-meet-oauth-callback';
 let checked=false;
 async function refresh(){
  if(!statusEl||!refreshBtn)return;
  refreshBtn.disabled=true;statusEl.textContent='در حال بررسی نشست مدیر و وضعیت اتصال…';detailEl.textContent='';
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw new Error('نشست مدیر در دسترس نیست؛ دوباره وارد پنل شوید.');
   const {data:role,error:roleError}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
   if(roleError||role?.role!=='admin')throw new Error('این بخش فقط برای مدیر کل انجمن فعال است.');
   const {data,error}=await db.functions.invoke('google-meet-connection-status',{method:'GET'});
   if(error)throw error;
   if(data?.connected){
    statusEl.textContent='حساب Google مدیر متصل است: '+(data.google_email||'ایمیل در دسترس نیست');
    detailEl.textContent='زمان اتصال: '+(data.connected_at?new Date(data.connected_at).toLocaleString('fa-IR'):'ثبت نشده')+' · مجوزها: '+((data.scopes||[]).join('، ')||'جزئیات مجوز موجود نیست');
   }else{
    statusEl.textContent='هنوز حساب Google به حساب مدیر فعلی متصل نشده است.';
    detailEl.textContent='این وضعیت فقط اتصال حساب فعلی را نشان می‌دهد؛ کامل بودن OAuth به ثبت Client و Secrets نیز وابسته است.';
   }
   if(summary)summary.textContent='وضعیت سرویس بررسی شد. مراحل ۱ تا ۳ طبق گزارش قبلی انجام شده‌اند؛ ساخت OAuth Client و ثبت Secrets همچنان باز هستند.';
  }catch(err){
   statusEl.textContent='بررسی وضعیت اتصال انجام نشد.';
   detailEl.textContent=err?.message||'خطای نامشخص';
  }finally{refreshBtn.disabled=false;checked=true;}
 }
 if(refreshBtn)refreshBtn.addEventListener('click',refresh);
 const copyBtn=document.getElementById('admin-google-copy-redirect');
 if(copyBtn)copyBtn.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(redirect);copyBtn.textContent='آدرس کپی شد';}
  catch(_){copyBtn.textContent='کپی خودکار ممکن نیست؛ آدرس را انتخاب و کپی کنید.';}
 });
 window.addEventListener('rls-admin-section-change',e=>{if(e.detail?.section==='google-meet'&&!checked)refresh();});
})();