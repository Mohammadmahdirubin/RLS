(function(){
 const root=document.getElementById('my-webinars-list'),cfg=window.RLS_SUPABASE_CONFIG;if(!root||!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>v?new Date(v).toLocaleString('fa-IR'):'زمان متعاقباً اعلام می‌شود';
 const latinDigits=s=>String(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
 function meetingAccess(event){
  const now=Date.now();let start=event.starts_at?new Date(event.starts_at):null;
  if(!start&&event.event_date&&event.event_time){
   const match=latinDigits(event.event_time).match(/(\d{1,2}):(\d{2})/);
   if(match)start=new Date(event.event_date+'T'+match[1].padStart(2,'0')+':'+match[2]+':00');
  }
  if(!start||Number.isNaN(start.getTime()))return {state:'unknown'};
  const opens=start.getTime()-15*60*1000,end=event.ends_at?new Date(event.ends_at).getTime():start.getTime()+3*60*60*1000;
  if(now<opens)return {state:'waiting',when:new Date(opens)};
  if(now>end)return {state:'closed'};
  return {state:'open'};
 }
 async function load(){
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){root.innerHTML='<p>برای مشاهده وبینارهای ثبت‌نام‌شده، ابتدا <a href="member-account.html">وارد حساب کاربری</a> شوید.</p>';return;}
  const {data:regs,error}=await db.from('rls_webinar_registrations').select('id,event_id,status,registered_at').eq('user_id',user.id).order('registered_at',{ascending:false});
  if(error){root.textContent='دریافت ثبت‌نام‌ها ناموفق بود: '+error.message;return;}
  if(!regs?.length){root.innerHTML='<p>هنوز در وبیناری ثبت‌نام نکرده‌اید. <a href="community-events.html">مشاهده وبینارها</a></p>';return;}
  const ids=regs.map(r=>r.event_id);
  const [{data:events},{data:links}]=await Promise.all([
   db.from('rls_events').select('id,title,description,event_date,event_time,starts_at,ends_at,webinar_platform,status').in('id',ids),
   db.from('rls_webinar_integrations').select('event_id,meeting_url').in('event_id',ids)
  ]);
  const emap=new Map((events||[]).map(e=>[e.id,e])),lmap=new Map((links||[]).map(x=>[x.event_id,x.meeting_url]));
  root.innerHTML=regs.map(r=>{const e=emap.get(r.event_id);if(!e)return '';const link=lmap.get(e.id),access=meetingAccess(e);let accessText='';
  if(r.status!=='confirmed')accessText='<span>لینک ورود فقط برای ثبت‌نام تأییدشده نمایش داده می‌شود.</span>';
  else if(e.status!=='published')accessText='<span>لینک ورود پس از انتشار وبینار فعال می‌شود.</span>';
  else if(!link)accessText='<span>لینک جلسه هنوز توسط برگزارکننده ثبت نشده است.</span>';
  else if(access.state==='waiting')accessText='<span>لینک ورود از '+date(access.when)+' فعال می‌شود (۱۵ دقیقه پیش از شروع).</span>';
  else if(access.state==='closed')accessText='<span>بازه ورود به این جلسه پایان یافته است.</span>';
  else if(access.state==='unknown')accessText='<span>زمان دقیق شروع جلسه هنوز ثبت نشده است.</span>';
  else accessText='<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">ورود به جلسه Google Meet</a>';
  return '<article class="my-webinar-card"><h3>'+esc(e.title)+'</h3><p>'+esc(e.description||'')+'</p><div class="my-webinar-meta"><span>زمان: '+date(e.starts_at||e.event_date)+'</span><span>وضعیت ثبت‌نام: '+(r.status==='confirmed'?'تأییدشده':r.status==='cancelled'?'لغوشده':'در انتظار')+'</span><span>بستر: '+esc(e.webinar_platform||'Google Meet')+'</span></div><div class="my-webinar-actions">'+accessText+(r.status==='confirmed'?'<button type="button" data-cancel="'+esc(r.id)+'">لغو ثبت‌نام</button>':'')+'</div></article>';}).join('')||'<p>موردی برای نمایش وجود ندارد.</p>';
 }
 root.addEventListener('click',async e=>{const b=e.target.closest('[data-cancel]');if(!b)return;if(!confirm('ثبت‌نام این وبینار لغو شود؟'))return;b.disabled=true;const r=await db.from('rls_webinar_registrations').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',b.dataset.cancel);if(r.error){alert('لغو ثبت‌نام ناموفق بود: '+r.error.message);b.disabled=false;return;}await load();});
 db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();