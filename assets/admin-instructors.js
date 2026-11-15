(function(){
 const root=document.getElementById('admin-instructors-panel');if(!root)return;
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const list=document.getElementById('admin-instructors-list'),msg=document.getElementById('admin-instructors-message');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function load(){
  list.textContent='در حال دریافت استادان تأییدشده…';
  const {data:{session}}=await db.auth.getSession();if(!session){list.textContent='ابتدا وارد پنل مدیریت شوید.';return;}
  const {data:role,error:re}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
  if(re||role?.role!=='admin'){list.textContent='دسترسی مدیر کل لازم است.';return;}
  const [{data:profiles,error:pe},{data:roles,error:rr}]=await Promise.all([
   db.from('rls_profiles').select('user_id,full_name,email,institution,category,membership_status').eq('category','faculty').eq('membership_status','approved').order('full_name'),
   db.from('rls_user_roles').select('user_id,role')
  ]);
  if(pe||rr){list.textContent='دریافت اطلاعات ناموفق بود: '+(pe?.message||rr?.message);return;}
  const roleMap=new Map((roles||[]).map(x=>[x.user_id,x.role]));
  if(!profiles?.length){list.textContent='استاد تأییدشده‌ای برای تخصیص دسترسی پیدا نشد.';return;}
  list.innerHTML='<div class="admin-instructor-role-list">'+profiles.map(p=>'<article class="admin-member" data-user="'+esc(p.user_id)+'"><div><strong>'+esc(p.full_name)+'</strong><p class="admin-meta">'+esc(p.institution||'')+' · '+esc(p.email||'ایمیل ثبت نشده')+'</p></div><div>'+(roleMap.get(p.user_id)==='instructor_admin'?'<span class="community-status community-status-approved">مدیر مدرس فعال</span><button type="button" data-revoke>لغو دسترسی</button>':'<button type="button" data-grant>اعطای دسترسی مدیر مدرس</button>')+'</div></article>').join('')+'</div>';
 }
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
  msg.textContent=action?'دسترسی مدیر مدرس فعال شد.':'دسترسی مدیر مدرس لغو شد.';
  await load();
 });
 window.addEventListener('rls-admin-section-change',e=>{if(e.detail?.section==='instructors')load();});
 load();
})();