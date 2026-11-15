(function(){
 const panel=document.getElementById('admin-events-panel');if(!panel)return;
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.RLS_SUPABASE_CLIENT=db;
 const form=document.getElementById('admin-event-form'),list=document.getElementById('admin-event-list'),msg=document.getElementById('admin-event-message');
 const labels={webinar:'وبینار',seminar:'سمینار / نشست',conference:'همایش',workshop:'کارگاه',course:'دوره آموزشی',other:'سایر اطلاعیه‌ها'};
 const statusLabels={draft:'پیش‌نویس',published:'منتشرشده',archived:'آرشیوشده'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateText=v=>{if(!v)return 'بدون تاریخ';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(d);};
 let events=[];
 async function authorize(){
  try{const {data:{session}}=await db.auth.getSession();if(!session){panel.hidden=true;return;}
   const {data:role,error}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
   const allowed=!error&&role?.role==='admin';panel.hidden=!allowed;if(allowed)await load();
  }catch(error){console.warn('Admin events authorization failed:',error);panel.hidden=true;}
 }
 async function loadAnalytics(){
  const target=document.getElementById('admin-event-analytics');if(!target)return;
  const webinars=events.filter(e=>e.event_type==='webinar'),ids=webinars.map(e=>e.id);
  if(!ids.length){target.innerHTML='<h3>آمار وبینارها</h3><p>هنوز وبیناری ثبت نشده است.</p>';return;}
  const [{data:regs,error:re},{data:att,error:ae}]=await Promise.all([
   db.from('rls_webinar_registrations').select('event_id,user_id,status').in('event_id',ids),
   db.from('rls_webinar_attendance').select('event_id,user_id,joined_at,left_at').in('event_id',ids)
  ]);
  if(re||ae){target.innerHTML='<h3>آمار وبینارها</h3><p>دریافت آمار ناموفق بود: '+esc(re?.message||ae?.message)+'</p>';return;}
  const registrations=regs||[],attendance=att||[],durations=attendance.filter(x=>x.left_at&&x.joined_at).map(x=>Math.max(0,(new Date(x.left_at)-new Date(x.joined_at))/60000));
  const avg=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  const stat=(label,value)=>'<article class="admin-stat-card"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></article>';
  const owners=[...new Set(webinars.map(e=>e.created_by).filter(Boolean))];
  const {data:profiles}=owners.length?await db.from('rls_profiles').select('user_id,full_name').in('user_id',owners):{data:[]};
  const names=new Map((profiles||[]).map(p=>[p.user_id,p.full_name]));
  const rows=owners.map(owner=>{const mine=webinars.filter(e=>e.created_by===owner),mineIds=mine.map(e=>e.id),mr=registrations.filter(r=>mineIds.includes(r.event_id)&&r.status!=='cancelled'),ma=attendance.filter(a=>mineIds.includes(a.event_id));return {name:names.get(owner)||'مدرس',count:mine.length,regs:mr.length,present:new Set(ma.map(a=>a.user_id)).size};}).sort((a,b)=>b.present-a.present);
  target.innerHTML='<h3>آمار کلی وبینارها</h3><div class="admin-stat-grid">'+stat('کل وبینارها',webinars.length)+stat('وبینارهای منتشرشده',webinars.filter(e=>e.status==='published').length)+stat('مجموع ثبت‌نام‌ها',registrations.filter(r=>r.status!=='cancelled').length)+stat('شرکت‌کنندگان ثبت‌شده',new Set(attendance.map(a=>a.user_id)).size)+stat('میانگین مدت حضور',avg?avg+' دقیقه':'—')+'</div><h3>عملکرد مدرسین</h3>'+(rows.length?'<div class="admin-list"><div class="admin-member"><strong>مدرس</strong><strong>وبینار</strong><strong>ثبت‌نام</strong><strong>حاضر</strong></div>'+rows.map(r=>'<div class="admin-member"><span>'+esc(r.name)+'</span><span>'+r.count+'</span><span>'+r.regs+'</span><span>'+r.present+'</span></div>').join('')+'</div>':'<p>آماری برای مدرسین ثبت نشده است.</p>');
 }
 async function load(){
  list.textContent='در حال دریافت فهرست رویدادها…';
  const {data,error}=await db.from('rls_events').select('*').order('created_at',{ascending:false});
  if(error){list.textContent='دریافت رویدادها ناموفق بود: '+error.message;return;}
  events=data||[];await loadAnalytics();if(!events.length){list.innerHTML='<p>هنوز اطلاعیه‌ای ثبت نشده است.</p>';return;}
  list.innerHTML=events.map(e=>'<article class="admin-event-row" data-id="'+esc(e.id)+'"><div><strong>'+esc(e.title)+'</strong><p>'+esc(labels[e.event_type]||e.event_type)+' · '+dateText(e.event_date)+' · '+esc(statusLabels[e.status]||e.status)+'</p></div><div class="admin-event-row-actions"><button type="button" data-edit>ویرایش</button>'+(e.status==='archived'?'<button type="button" data-restore>بازگردانی</button>':'<button type="button" data-archive>انتقال به آرشیو</button>')+'<button type="button" data-delete style="background:#fff0f0;color:#a32121">حذف</button></div></article>').join('');
 }
 function reset(){form.reset();form.elements.event_id.value='';form.dataset.action='draft';msg.textContent='فرم برای ثبت اطلاعیه جدید آماده است.';}
 async function save(action){
  const fd=new FormData(form),id=String(fd.get('event_id')||''),file=fd.get('poster'),title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||'').trim();
  if(title.length<3||description.length<3){msg.textContent='عنوان و توضیحات را کامل وارد کنید.';return;}
  if(file&&file.size&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)){msg.textContent='پوستر باید JPG، PNG یا WebP و حداکثر ۱۰ مگابایت باشد.';return;}
  const buttons=[...form.querySelectorAll('[data-event-submit]')];buttons.forEach(b=>b.disabled=true);
  try{
   msg.textContent='در حال ذخیره اطلاعات رویداد…';
   const eventType=String(fd.get('event_type'));const payload={title,description,event_type:eventType,event_date:fd.get('event_date')||null,event_time:String(fd.get('event_time')||'').trim()||null,location:String(fd.get('location')||'').trim()||null,registration_url:String(fd.get('registration_url')||'').trim()||null,webinar_mode:String(fd.get('webinar_mode')||'external'),webinar_platform:String(fd.get('webinar_platform')||'google_meet'),capacity:fd.get('capacity')?Number(fd.get('capacity')):null,starts_at:fd.get('starts_at')?new Date(fd.get('starts_at')).toISOString():null,ends_at:fd.get('ends_at')?new Date(fd.get('ends_at')).toISOString():null,registration_enabled:fd.get('registration_enabled')!=='false',status:action==='draft'?'draft':'published',published_at:action==='draft'?null:new Date().toISOString(),updated_at:new Date().toISOString()};
   let event;
   if(id){const {data,error}=await db.from('rls_events').update(payload).eq('id',id).select('*').single();if(error)throw error;event=data;}
   else{const {data:{user}}=await db.auth.getUser();const {data,error}=await db.from('rls_events').insert({...payload,created_by:user?.id||null}).select('*').single();if(error)throw error;event=data;}
   const meetingUrl=String(fd.get('meeting_url')||'').trim();if(eventType==='webinar'&&meetingUrl){const ir=await db.from('rls_webinar_integrations').upsert({event_id:event.id,meeting_url:meetingUrl,created_by:(await db.auth.getUser()).data.user.id,updated_at:new Date().toISOString()},{onConflict:'event_id'});if(ir.error)throw ir.error;}else if(eventType==='webinar'){const ir=await db.from('rls_webinar_integrations').delete().eq('event_id',event.id);if(ir.error)throw ir.error;}
   if(file&&file.size){
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path=event.id+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await db.storage.from('rls-event-posters').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
    const {data,error:updateError}=await db.from('rls_events').update({poster_path:path,updated_at:new Date().toISOString()}).eq('id',event.id).select('*').single();if(updateError)throw updateError;event=data;
   }
   form.elements.event_id.value=event.id;
   if(action==='email'){
    const {count,error:countError}=await db.from('rls_profiles').select('user_id',{count:'exact',head:true}).eq('membership_status','approved').not('email','is',null);
    if(countError)throw countError;
    if(!confirm('این رویداد منتشر شد. ایمیل آن برای '+(count??'تمام')+' عضو تأییدشده دارای ایمیل ارسال شود؟')){msg.textContent='رویداد منتشر شد؛ ارسال ایمیل لغو شد.';await load();return;}
    msg.textContent='در حال ارسال ایمیل جداگانه به اعضا…';
    const {data:result,error}=await db.functions.invoke('admin-send-event-notification',{body:{event_id:event.id}});
    if(error)throw error;
    if(!result?.ok)throw new Error('ارسال کامل نشد؛ ارسال‌شده: '+(result?.sent||0)+'، ناموفق: '+(result?.failed||0)+'، ردشده/تکراری: '+(result?.skipped||0));
    msg.textContent='رویداد منتشر شد؛ ایمیل با موفقیت به '+result.sent+' عضو ارسال شد. موارد تکراری/ردشده: '+result.skipped+'.';
   }else msg.textContent=action==='draft'?'پیش‌نویس ذخیره شد.':'رویداد با موفقیت منتشر شد.';
   await load();
  }catch(error){console.error('Event management failed:',error);msg.textContent='عملیات ناموفق بود: '+(error?.message||'خطای نامشخص');}
  finally{buttons.forEach(b=>b.disabled=false);}
 }
 form.addEventListener('click',e=>{const b=e.target.closest('[data-event-submit]');if(b)form.dataset.action=b.dataset.eventSubmit;});
 form.addEventListener('submit',e=>{e.preventDefault();save(form.dataset.action||'draft');form.dataset.action='draft';});
 document.getElementById('admin-event-reset').addEventListener('click',reset);
 list.addEventListener('click',async e=>{
  const row=e.target.closest('.admin-event-row');if(!row)return;const event=events.find(x=>x.id===row.dataset.id);if(!event)return;
  if(e.target.closest('[data-edit]')){const {data:integration}=await db.from('rls_webinar_integrations').select('meeting_url').eq('event_id',event.id).maybeSingle();form.elements.meeting_url.value=integration?.meeting_url||'';form.elements.webinar_mode.value=event.webinar_mode||'external';form.elements.webinar_platform.value=event.webinar_platform||'google_meet';form.elements.capacity.value=event.capacity||'';form.elements.starts_at.value=event.starts_at?new Date(event.starts_at).toISOString().slice(0,16):'';form.elements.ends_at.value=event.ends_at?new Date(event.ends_at).toISOString().slice(0,16):'';form.elements.registration_enabled.value=String(event.registration_enabled!==false);form.elements.event_id.value=event.id;form.elements.title.value=event.title;form.elements.event_type.value=event.event_type;form.elements.event_date.value=event.event_date||'';form.elements.event_time.value=event.event_time||'';form.elements.location.value=event.location||'';form.elements.registration_url.value=event.registration_url||'';form.elements.description.value=event.description;msg.textContent='در حال ویرایش: '+event.title;form.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(e.target.closest('[data-delete]')){
   if(!confirm('آیا از حذف دائمی «'+event.title+'» مطمئن هستید؟ این عملیات قابل بازگشت نیست. گزارش‌های ایمیل مرتبط نیز حذف خواهند شد.'))return;
   const deleteButton=e.target.closest('[data-delete]');deleteButton.disabled=true;msg.textContent='در حال حذف اطلاعیه…';
   const {data:deleted,error}=await db.from('rls_events').delete().eq('id',event.id).select('id').maybeSingle();
   if(error){deleteButton.disabled=false;msg.textContent='حذف ناموفق بود: '+error.message;return;}
   if(!deleted){deleteButton.disabled=false;msg.textContent='اطلاعیه حذف نشد؛ دسترسی مدیر یا مجوز حذف را بررسی کنید.';return;}
   let posterWarning='';
   if(event.poster_path){const {error:posterError}=await db.storage.from('rls-event-posters').remove([event.poster_path]);if(posterError){console.warn('Event poster cleanup failed:',posterError);posterWarning=' فایل پوستر در فضای ذخیره‌سازی باقی مانده و نیازمند پاک‌سازی است.';}}
   if(form.elements.event_id.value===event.id)reset();
   msg.textContent='اطلاعیه «'+event.title+'» با موفقیت حذف شد.'+posterWarning;await load();return;
  }
  const status=e.target.closest('[data-archive]')?'archived':e.target.closest('[data-restore]')?'published':null;
  if(status){const {error}=await db.from('rls_events').update({status,updated_at:new Date().toISOString()}).eq('id',event.id);if(error){msg.textContent='تغییر وضعیت ناموفق بود: '+error.message;return;}msg.textContent=status==='archived'?'به آرشیو منتقل شد.':'دوباره منتشر شد.';await load();}
 });
 db.auth.onAuthStateChange(()=>setTimeout(authorize,0));authorize();
})();