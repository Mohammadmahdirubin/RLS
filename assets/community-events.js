(function(){
 const grid=document.getElementById('community-event-grid');if(!grid)return;
 const cfg=window.RLS_SUPABASE_CONFIG,labels={webinar:'وبینار',seminar:'سمینار و نشست',conference:'همایش',workshop:'کارگاه',course:'دوره آموزشی',other:'اطلاعیه'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[],filter=(new URLSearchParams(window.location.search).get('view')||'all');
 if(!['all','upcoming','archive'].includes(filter))filter='all';
 const dateText=v=>{if(!v)return 'تاریخ متعاقباً اعلام می‌شود';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'long',day:'numeric'}).format(d);};
 function render(){
  const today=new Date();today.setHours(0,0,0,0);
  const visible=rows.filter(e=>filter==='archive'?(e.status==='archived'||(e.event_date&&new Date(e.event_date+'T23:59:59')<today)):filter==='upcoming'?(e.status==='published'&&(!e.event_date||new Date(e.event_date+'T23:59:59')>=today)):true);
  if(!visible.length){grid.innerHTML='<div class="community-events-empty"><strong>در حال حاضر اطلاعیه‌ای برای نمایش وجود ندارد.</strong><p>اطلاعیه‌های جدید انجمن در همین بخش منتشر خواهند شد.</p></div>';return;}
  grid.innerHTML=visible.map(e=>{
   const poster=e.poster_path?window.RLS_SUPABASE_CLIENT.storage.from('rls-event-posters').getPublicUrl(e.poster_path).data.publicUrl:'';
   const past=e.event_date&&new Date(e.event_date+'T23:59:59')<today;
   return '<article class="community-event-card">'+(poster?'<a class="community-event-poster" href="'+esc(poster)+'" target="_blank" rel="noopener"><img src="'+esc(poster)+'" alt="پوستر '+esc(e.title)+'" loading="lazy"></a>':'<div class="community-event-no-poster">RLS</div>')+'<div class="community-event-content"><span class="community-event-type">'+esc(labels[e.event_type]||'اطلاعیه')+'</span><h3>'+esc(e.title)+'</h3><p class="community-event-description">'+esc(e.description).replace(/\n/g,'<br>')+'</p><div class="community-event-meta"><span>📅 '+dateText(e.event_date)+'</span>'+(e.event_time?'<span>◷ '+esc(e.event_time)+'</span>':'')+(e.location?'<span>⌖ '+esc(e.location)+'</span>':'')+'</div>'+(e.registration_url?'<a class="community-event-link" href="'+esc(e.registration_url)+'" target="_blank" rel="noopener noreferrer">اطلاعات بیشتر / ثبت‌نام</a>':'')+(past||e.status==='archived'?'<span class="community-event-archived">در آرشیو</span>':'')+'</div></article>';
  }).join('');
 }
 document.querySelectorAll('[data-event-filter]').forEach(b=>{const active=b.dataset.eventFilter===filter;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
 async function load(){
  try{
   if(!cfg||!window.supabase)throw new Error('اتصال سامانه در دسترس نیست.');
   const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey);window.RLS_SUPABASE_CLIENT=db;
   const {data,error}=await db.from('rls_events').select('id,title,description,event_type,event_date,event_time,location,registration_url,poster_path,status').in('status',['published','archived']).order('event_date',{ascending:true,nullsFirst:false});
   if(error)throw error;rows=data||[];render();
  }catch(error){console.warn('RLS events load failed:',error);grid.innerHTML='<div class="community-events-empty">دریافت اطلاعیه‌ها در حال حاضر ممکن نیست. لطفاً بعداً مراجعه کنید.</div>';}
 }
 load();
})();