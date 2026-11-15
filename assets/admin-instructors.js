(function(){
 const root=document.getElementById('admin-instructors-panel');if(!root)return;
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const list=document.getElementById('admin-instructors-list'),staffList=document.getElementById('admin-staff-accounts'),msg=document.getElementById('admin-instructors-message'),form=document.getElementById('admin-staff-create-form');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function call(action,body={}){
  const {data,error}=await db.functions.invoke('admin-manage-staff',{body:{action,...body}});
  if(error)throw error;if(!data?.ok)throw new Error(data?.error||'عملیات ناموفق بود.');return data;
 }
 async function load(){
  list.textContent='در حال دریافت استادان تأییدشده…';staffList.textContent='در حال دریافت حساب‌های مدیریتی…';
  const {data:{session}}=await db.auth.getSession();if(!session){list.textContent='ابتدا وارد پنل مدیریت شوید.';staffList.textContent='';return;}
  const {data:role,error:re}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
  if(re||role?.role!=='admin'){list.textContent='دسترسی مدیر کل لازم است.';staffList.textContent='';return;}
  const [staffResult,profilesResult,rolesResult]=await Promise.all([
   call('list'),
   db.from('rls_profiles').select('user_id,full_name,email,institution,category,membership_status').eq('membership_status','approved').order('full_name'),
   db.from('rls_user_roles').select('user_id,role')
  ]);
  if(profilesResult.error||rolesResult.error){list.textContent='دریافت فهرست استادان ناموفق بود: '+(profilesResult.error?.message||rolesResult.error?.message);return;}
  const roleMap=new Map((rolesResult.data||[]).map(x=>[x.user_id,x.role]));
  staffList.innerHTML=staffResult.records?.length?'<div class="admin-staff-list">'+staffResult.records.map(p=>'<article class="admin-staff-row"><div><strong>'+esc(p.full_name||'حساب مدیریتی')+'</strong><p>'+esc(p.email||'ایمیل در دسترس نیست')+'</p></div><span class="admin-staff-role '+(p.role==='admin'?'is-admin':'is-instructor')+'">'+(p.role==='admin'?'مدیر کل انجمن':'استاد / مدیر مدرس')+'</span></article>').join('')+'</div>':'<p>هنوز حساب مدیریتی مستقلی ایجاد نشده است.</p>';
  const profiles=profilesResult.data||[];
  if(!profiles.length){list.textContent='استاد تأییدشده‌ای برای تخصیص دسترسی پیدا نشد.';return;}
  list.innerHTML='<div class="admin-instructor-role-list">'+profiles.map(p=>'<article class="admin-member" data-user="'+esc(p.user_id)+'"><div><strong>'+esc(p.full_name)+'</strong><p class="admin-meta">'+esc(p.institution||'')+' · '+esc(({faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر',translator:'مترجم',student:'دانشجو',graduate:'دانش‌آموخته',culture:'فعال ادبیات و فرهنگ',honorary:'عضو افتخاری'})[p.category]||p.category||'')+' · '+esc(p.email||'ایمیل ثبت نشده')+'</p></div><div>'+(roleMap.get(p.user_id)==='admin'?'<span class="community-status community-status-approved">مدیر کل</span>':roleMap.get(p.user_id)==='instructor_admin'?'<span class="community-status community-status-approved">مدیر مدرس فعال</span><button type="button" data-revoke>لغو دسترسی</button>':'<button type="button" data-grant>اعطای دسترسی مدیر مدرس</button>')+'</div></article>').join('')+'</div>';
 }
 form?.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(form),email=String(fd.get('email')||'').trim().toLowerCase(),password=String(fd.get('password')||''),role=String(fd.get('role')||'instructor_admin');
  if(password.length<12){msg.textContent='رمز اولیه باید حداقل ۱۲ نویسه داشته باشد.';return;}
  if(role==='admin'&&!confirm('این حساب به مدیر کل تبدیل می‌شود و به همه بخش‌های مدیریت، اعضا و رویدادها دسترسی کامل خواهد داشت. ادامه می‌دهید؟'))return;
  const button=form.querySelector('[type=submit]');button.disabled=true;msg.textContent='در حال ساخت حساب و فعال‌سازی دسترسی…';
  try{
   const result=await call('create',{email,password,full_name:String(fd.get('full_name')||'').trim(),role});
   form.reset();msg.textContent='حساب '+result.email+' ساخته و دسترسی آن فعال شد. رمز اولیه را از راه امن به صاحب حساب تحویل دهید.';
   await load();
  }catch(error){msg.textContent='ساخت حساب ناموفق بود: '+(error?.message||'خطای نامشخص');}
  finally{button.disabled=false;}
 });
 list.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-grant],[data-revoke]');if(!btn)return;
  const card=btn.closest('[data-user]'),userId=card?.dataset.user;if(!userId)return;
  btn.disabled=true;msg.textContent='در حال ثبت تغییر دسترسی…';
  const action=btn.hasAttribute('data-grant');
  const {data:existing}=await db.from('rls_user_roles').select('role').eq('user_id',userId).maybeSingle();
  const result=action
   ?(existing?await db.from('rls_user_roles').update({role:'instructor_admin'}).eq('user_id',userId).eq('role','member'):await db.from('rls_user_roles').insert({user_id:userId,role:'instructor_admin'}))
   :await db.from('rls_user_roles').update({role:'member'}).eq('user_id',userId).eq('role','instructor_admin');
  if(result.error){msg.textContent='تغییر دسترسی انجام نشد: '+result.error.message;btn.disabled=false;return;}
  msg.textContent=action?'دسترسی مدیر مدرس فعال شد.':'دسترسی مدیر مدرس لغو شد.';await load();
 });
 window.addEventListener('rls-admin-section-change',e=>{if(e.detail?.section==='instructors')load();});
 load();
})();