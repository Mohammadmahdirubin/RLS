(function(){
 const root=document.getElementById('my-webinars-list'),cfg=window.RLS_SUPABASE_CONFIG;if(!root||!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>v?new Date(v).toLocaleString('fa-IR'):'زمان متعاقباً اعلام می‌شود';
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
  root.innerHTML=regs.map(r=>{const e=emap.get(r.event_id);if(!e)return '';const link=lmap.get(e.id);return '<article class="my-webinar-card"><h3>'+esc(e.title)+'</h3><p>'+esc(e.description||'')+'</p><div class="my-webinar-meta"><span>زمان: '+date(e.starts_at||e.event_date)+'</span><span>وضعیت ثبت‌نام: '+(r.status==='confirmed'?'تأییدشده':r.status==='cancelled'?'لغوشده':'در انتظار')+'</span><span>بستر: '+esc(e.webinar_platform||'Google Meet')+'</span></div><div class="my-webinar-actions">'+(link?'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">ورود به جلسه</a>':e.status==='archived'?'<span>این برنامه آرشیو شده است.</span>':'<span>لینک ورود در زمان مجاز جلسه فعال می‌شود.</span>')+(r.status==='confirmed'?'<button type="button" data-cancel="'+esc(r.id)+'">لغو ثبت‌نام</button>':'')+'</div></article>';}).join('')||'<p>موردی برای نمایش وجود ندارد.</p>';
 }
 root.addEventListener('click',async e=>{const b=e.target.closest('[data-cancel]');if(!b)return;if(!confirm('ثبت‌نام این وبینار لغو شود؟'))return;b.disabled=true;const r=await db.from('rls_webinar_registrations').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',b.dataset.cancel);if(r.error){alert('لغو ثبت‌نام ناموفق بود: '+r.error.message);b.disabled=false;return;}await load();});
 db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();