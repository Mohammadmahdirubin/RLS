(function(){
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.RLS_SUPABASE_CLIENT=db;
 const login=document.getElementById('instructor-login'),dash=document.getElementById('instructor-dashboard'),loginForm=document.getElementById('instructor-login-form'),loginMsg=document.getElementById('instructor-login-message');
 const form=document.getElementById('instructor-event-form'),list=document.getElementById('instructor-event-list'),msg=document.getElementById('instructor-event-message'),stats=document.getElementById('instructor-stats'),attPanel=document.getElementById('instructor-attendance-panel');
 let user=null,events=[];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label={webinar:'وبینار',seminar:'سمینار',conference:'همایش',workshop:'کارگاه',course:'دوره آموزشی',other:'اطلاعیه'};
 const dt=v=>v?new Date(v).toLocaleString('fa-IR'):'—';
 async function authorize(){
  const {data:{session}}=await db.auth.getSession();if(!session){login.hidden=false;dash.hidden=true;return;}
  const {data:role,error}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
  if(error||!['admin','instructor_admin'].includes(role?.role)){login.hidden=false;dash.hidden=true;loginMsg.textContent='این حساب دسترسی پنل مدرس را ندارد.';return;}
  user=session.user;login.hidden=true;dash.hidden=false;document.getElementById('instructor-identity').textContent=user.email||'مدرس';await load();
 }
 async function load(){
  list.textContent='در حال دریافت برنامه‌ها…';
  const {data,error}=await db.from('rls_events').select('*').eq('created_by',user.id).order('created_at',{ascending:false});
  if(error){list.textContent='خطا: '+error.message;return;}events=data||[];
  const ids=events.map(e=>e.id);let regs=[],att=[];
  if(ids.length){
   const [r,a]=await Promise.all([db.from('rls_webinar_registrations').select('id,event_id,user_id,status').in('event_id',ids),db.from('rls_webinar_attendance').select('id,event_id,user_id,joined_at,left_at').in('event_id',ids)]);
   if(!r.error)regs=r.data||[];if(!a.error)att=a.data||[];
  }
  const webinars=events.filter(e=>e.event_type==='webinar');const sessionsHeld=webinars.filter(e=>e.event_date&&new Date(e.event_date+'T23:59:59')<new Date()).length;const sessionsUpcoming=webinars.filter(e=>e.status==='published'&&(!e.event_date||new Date(e.event_date+'T23:59:59')>=new Date())).length;
  const durations=att.filter(x=>x.left_at&&x.joined_at).map(x=>Math.max(0,(new Date(x.left_at)-new Date(x.joined_at))/60000));const avgDuration=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  stats.innerHTML=[['کل برنامه‌ها',events.length],['وبینارها',webinars.length],['جلسات برگزارشده',sessionsHeld],['جلسات پیش‌رو',sessionsUpcoming],['ثبت‌نام‌ها',regs.filter(x=>x.status!=='cancelled').length],['شرکت‌کنندگان ثبت‌شده',new Set(att.map(x=>x.user_id)).size],['میانگین مدت حضور',avgDuration?avgDuration+' دقیقه':'—']].map(([k,v])=>'<div class="instructor-stat"><strong>'+v+'</strong><span>'+k+'</span></div>').join('');
  if(!events.length){list.innerHTML='<p>هنوز برنامه‌ای ایجاد نکرده‌اید.</p>';return;}
  list.innerHTML=events.map(e=>{
   const n=regs.filter(x=>x.event_id===e.id&&x.status!=='cancelled').length,an=new Set(att.filter(x=>x.event_id===e.id).map(x=>x.user_id)).size;
   return '<article class="instructor-row" data-id="'+esc(e.id)+'"><div><strong>'+esc(e.title)+'</strong><p>'+esc(label[e.event_type]||e.event_type)+' · '+(e.status==='published'?'منتشرشده':e.status==='archived'?'آرشیو':'پیش‌نویس')+' · '+n+' ثبت‌نام · '+an+' حاضر</p></div><div class="instructor-row-actions"><button type="button" data-edit>ویرایش</button>'+(e.event_type==='webinar'?'<button type="button" data-attendees>شرکت‌کنندگان</button>':'')+'<button type="button" data-archive>'+ (e.status==='archived'?'بازگردانی':'آرشیو')+'</button></div></article>';
  }).join('');
 }
 function reset(){form.reset();form.elements.event_id.value='';document.getElementById('instructor-form-heading').textContent='ایجاد وبینار یا اطلاعیه';msg.textContent='';}
 form.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(form),id=String(fd.get('event_id')||''),file=fd.get('poster'),title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||'').trim();
  if(title.length<3||description.length<3){msg.textContent='عنوان و توضیحات را کامل وارد کنید.';return;}
  if(file&&file.size&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)){msg.textContent='فرمت یا حجم پوستر مجاز نیست.';return;}
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  try{
   const type=String(fd.get('event_type')),payload={title,description,event_type:type,event_date:fd.get('event_date')||null,event_time:String(fd.get('event_time')||'').trim()||null,location:String(fd.get('location')||'').trim()||null,registration_url:String(fd.get('registration_url')||'').trim()||null,webinar_mode:fd.get('webinar_mode'),webinar_platform:fd.get('webinar_platform'),capacity:fd.get('capacity')?Number(fd.get('capacity')):null,starts_at:fd.get('starts_at')?new Date(fd.get('starts_at')).toISOString():null,ends_at:fd.get('ends_at')?new Date(fd.get('ends_at')).toISOString():null,registration_enabled:fd.get('registration_enabled')==='true',status:fd.get('status'),published_at:fd.get('status')==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()};
   let saved;
   if(id){const r=await db.from('rls_events').update(payload).eq('id',id).eq('created_by',user.id).select('*').single();if(r.error)throw r.error;saved=r.data;}
   else{const r=await db.from('rls_events').insert({...payload,created_by:user.id}).select('*').single();if(r.error)throw r.error;saved=r.data;}
   const meetingUrl=String(fd.get('meeting_url')||'').trim();if(type==='webinar'&&meetingUrl){const ir=await db.from('rls_webinar_integrations').upsert({event_id:saved.id,meeting_url:meetingUrl,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:'event_id'});if(ir.error)throw ir.error;}else if(type==='webinar'){const ir=await db.from('rls_webinar_integrations').delete().eq('event_id',saved.id);if(ir.error)throw ir.error;}
   if(file&&file.size){const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path=saved.id+'/'+crypto.randomUUID()+'.'+ext;const up=await db.storage.from('rls-event-posters').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const r=await db.from('rls_events').update({poster_path:path}).eq('id',saved.id).eq('created_by',user.id).select('*').single();if(r.error)throw r.error;}
   msg.textContent=payload.status==='published'?'محتوا مستقیماً منتشر شد.':'پیش‌نویس ذخیره شد.';reset();await load();
  }catch(err){console.error(err);msg.textContent='ذخیره انجام نشد: '+(err.message||'خطای نامشخص');}
  finally{submit.disabled=false;}
 });
 document.getElementById('instructor-form-reset').addEventListener('click',reset);
 list.addEventListener('click',async e=>{
  const row=e.target.closest('[data-id]');if(!row)return;const ev=events.find(x=>x.id===row.dataset.id);if(!ev)return;
  if(e.target.closest('[data-edit]')){
   const {data:integration,error:integrationError}=await db.from('rls_webinar_integrations').select('meeting_url').eq('event_id',ev.id).maybeSingle();
   if(integrationError){msg.textContent='دریافت لینک جلسه ناموفق بود: '+integrationError.message;return;}
   Object.entries({event_id:ev.id,title:ev.title,event_type:ev.event_type,event_date:ev.event_date||'',event_time:ev.event_time||'',location:ev.location||'',registration_url:ev.registration_url||'',webinar_mode:ev.webinar_mode||'external',webinar_platform:ev.webinar_platform||'google_meet',meeting_url:integration?.meeting_url||'',capacity:ev.capacity||'',starts_at:ev.starts_at?new Date(ev.starts_at).toISOString().slice(0,16):'',ends_at:ev.ends_at?new Date(ev.ends_at).toISOString().slice(0,16):'',status:ev.status,registration_enabled:String(ev.registration_enabled!==false),description:ev.description}).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v;});
   document.getElementById('instructor-form-heading').textContent='ویرایش: '+ev.title;form.scrollIntoView({behavior:'smooth'});return;
  }
  if(e.target.closest('[data-archive]')){const next=ev.status==='archived'?'published':'archived';const r=await db.from('rls_events').update({status:next,updated_at:new Date().toISOString()}).eq('id',ev.id).eq('created_by',user.id);if(r.error){msg.textContent='تغییر وضعیت ناموفق بود: '+r.error.message;return;}await load();return;}
  if(e.target.closest('[data-attendees]'))await showAttendees(ev);
 });
 async function showAttendees(ev){
  attPanel.textContent='در حال دریافت ثبت‌نام‌کنندگان…';
  const {data:regs,error}=await db.from('rls_webinar_registrations').select('id,user_id,status,registered_at').eq('event_id',ev.id).order('registered_at');
  if(error){attPanel.textContent='دریافت فهرست ناموفق بود: '+error.message;return;}
  if(!regs?.length){attPanel.textContent='هنوز کسی در این وبینار ثبت‌نام نکرده است.';return;}
  const ids=regs.map(x=>x.user_id);
  const [{data:profiles,error:profileError},{data:attendance,error:attendanceError}]=await Promise.all([
   db.from('rls_profiles').select('user_id,full_name,email').in('user_id',ids),
   db.from('rls_webinar_attendance').select('id,user_id,joined_at,left_at').eq('event_id',ev.id)
  ]);
  if(profileError||attendanceError){attPanel.textContent='دریافت اطلاعات حضور ناموفق بود: '+(profileError?.message||attendanceError?.message);return;}
  const attendanceByUser=new Map((attendance||[]).map(x=>[x.user_id,x])),pmap=new Map((profiles||[]).map(x=>[x.user_id,x]));
  attPanel.innerHTML='<h3>'+esc(ev.title)+' · '+regs.length+' ثبت‌نام</h3>'+regs.map(r=>{
   const p=pmap.get(r.user_id)||{},a=attendanceByUser.get(r.user_id);
   const duration=a?Math.max(0,Math.round(((a.left_at?new Date(a.left_at):new Date())-new Date(a.joined_at))/60000)):0;
   let control='';
   if(!a)control='<button type="button" data-mark-present="'+esc(r.user_id)+'">ثبت ورود</button>';
   else if(!a.left_at)control='<button type="button" data-mark-left="'+esc(a.id)+'">ثبت خروج</button><span>حاضر · '+duration+' دقیقه</span>';
   else control='<strong>حضور ثبت شد · '+duration+' دقیقه</strong>';
   return '<div class="instructor-attendance-row"><span>'+esc(p.full_name||p.email||'شرکت‌کننده')+' · '+esc(r.status)+'</span>'+control+'</div>';
  }).join('');
  attPanel.dataset.eventId=ev.id;
 }
 attPanel.addEventListener('click',async e=>{
  const b=e.target.closest('[data-mark-present],[data-mark-left]');if(!b)return;
  b.disabled=true;let r;
  if(b.hasAttribute('data-mark-present'))r=await db.from('rls_webinar_attendance').insert({event_id:attPanel.dataset.eventId,user_id:b.dataset.markPresent,attendance_source:'manual',created_by:user.id});
  else r=await db.from('rls_webinar_attendance').update({left_at:new Date().toISOString()}).eq('id',b.dataset.markLeft);
  if(r.error){b.disabled=false;alert('ثبت ورود/خروج ناموفق بود: '+r.error.message);return;}
  await load();const ev=events.find(x=>x.id===attPanel.dataset.eventId);if(ev)await showAttendees(ev);
 });
 loginForm.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(loginForm);const r=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(r.error){loginMsg.textContent='ورود ناموفق بود: '+r.error.message;return;}await authorize();});
 document.getElementById('instructor-logout').addEventListener('click',async()=>{await db.auth.signOut();user=null;login.hidden=false;dash.hidden=true;});
 db.auth.onAuthStateChange(()=>setTimeout(authorize,0));authorize();
})();