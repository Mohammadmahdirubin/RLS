(function(){
  const cfg=window.RLS_SUPABASE_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.RLS_SUPABASE_CLIENT || (window.RLS_SUPABASE_CLIENT = window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  const login=document.getElementById('admin-login'),dashboard=document.getElementById('admin-dashboard');
  const form=document.getElementById('admin-login-form'),msg=document.getElementById('login-message'),list=document.getElementById('admin-list');
  let status='pending',checking=false;
  const labels={student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر مطالعات روسیه',translator:'مترجم زبان روسی',culture:'فعال ادبیات و فرهنگ روسیه',honorary:'عضو افتخاری'};
  const categories=Object.entries(labels);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function checkAdmin(){
    if(checking)return;checking=true;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session){login.hidden=false;dashboard.hidden=true;return;}
      const {data:role,error}=await client.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
      if(error){
        msg.textContent='بررسی دسترسی مدیر ناموفق بود: '+error.message+' · نشست شما حفظ شده است.';
        login.hidden=false;dashboard.hidden=true;return;
      }
      if(role?.role!=='admin'){
        msg.textContent='این حساب دسترسی مدیر انجمن را ندارد. نشست کاربری شما حفظ شده است.';
        login.hidden=false;dashboard.hidden=true;return;
      }
      login.hidden=true;dashboard.hidden=false;
      document.getElementById('admin-identity').textContent=session.user.email||'مدیر انجمن';
      await Promise.all([load(),loadPointMembers(),loadPointHistory()]);
    }finally{checking=false;}
  }
  async function load(){
    list.textContent='در حال دریافت اطلاعات…';
    let query=client.from('rls_profiles')
      .select('user_id,full_name,display_name,category,email,country,city,institution,degree,specialty,bio,evidence_url,website_url,orcid,avatar_path,pending_avatar_path,membership_status,is_public,created_at')
      .order('created_at',{ascending:true});
    if(status==='photo_pending'){
      query=query.in('membership_status',['approved','suspended']).not('pending_avatar_path','is',null);
    }else{
      query=query.eq('membership_status',status);
    }
    const {data,error}=await query;
    if(error){list.textContent='خطا در دریافت درخواست‌ها: '+error.message;return;}
    if(!data?.length){list.textContent='در این دسته درخواستی وجود ندارد.';return;}
    const html=await Promise.all(data.map(async p=>{
      let evidence='';
      if(p.evidence_url && p.evidence_url.startsWith(p.user_id + '/') && !p.evidence_url.includes('..')){
        const {data:signed,error:signedError}=await client.storage.from('rls-members-private').createSignedUrl(p.evidence_url,300);
        evidence=!signedError&&signed?.signedUrl
          ?'<p><a href="'+esc(signed.signedUrl)+'" target="_blank" rel="noopener noreferrer">مشاهده مدرک (پیوند موقت ۵ دقیقه‌ای)</a></p>'
          :'<p class="admin-meta">مدرک ثبت شده، اما ایجاد پیوند امن ناموفق بود.</p>';
      }
      const reviewAvatarPath=p.pending_avatar_path||p.avatar_path;
      const avatarUrl=reviewAvatarPath
        ?client.storage.from('rls-member-avatars').getPublicUrl(reviewAvatarPath).data.publicUrl:'';
      const photo=avatarUrl
        ?'<div class="admin-photo-review"><img src="'+esc(avatarUrl)+'" alt="عکس پروفایل '+esc(p.full_name)+'"><span>'+(p.pending_avatar_path?'عکس جدید در انتظار تأیید':'عکس پروفایل')+'</span></div>'
        :'<p class="admin-meta admin-photo-missing">عکس پروفایل ثبت نشده است.</p>';
      return '<article class="admin-member" data-id="'+esc(p.user_id)+'" data-avatar-path="'+esc(p.avatar_path||'')+'" data-pending-avatar="'+esc(p.pending_avatar_path||'')+'"><h3>'+esc(p.full_name)+'</h3>'+
        photo+
        '<div class="admin-meta">گروه: '+esc(labels[p.category]||p.category)+' · ایمیل: '+esc(p.email)+
        '<br>محل: '+esc([p.city,p.country].filter(Boolean).join('، ')||'ثبت نشده')+' · مؤسسه: '+esc(p.institution||'ثبت نشده')+
        '<br>تحصیلات: '+esc(p.degree||'—')+' · تخصص: '+esc(p.specialty||'—')+
        '<br>معرفی: '+esc(p.bio||'—')+'<br>تاریخ درخواست: '+new Date(p.created_at).toLocaleString('fa-IR')+'</div>'+
        evidence+'<div class="admin-category-editor"><label>گروه عضویت<select data-category-select>'+categories.map(([key,label])=>'<option value="'+key+'"'+(p.category===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label><button type="button" class="approve" data-action="change_category">ذخیره گروه عضویت</button></div>'+
        '<div class="admin-actions">'+
        (status==='pending'?'<button class="approve" data-action="approve">تأیید عضویت و عکس</button><button class="reject" data-action="reject">رد درخواست</button>':'')+
        ((status==='approved'||status==='photo_pending')&&p.pending_avatar_path?'<button class="approve" data-action="approve_avatar">تأیید عکس جدید</button><button class="reject" data-action="reject_avatar">رد عکس جدید</button>':'')+
        (status==='approved'?'<button class="suspend" data-action="suspend">تعلیق عضویت</button><button class="visibility" data-action="toggle_visibility">'+(p.is_public?'پنهان‌کردن پروفایل عمومی':'نمایش پروفایل عمومی')+'</button>':'')+
        (status==='suspended'?'<button class="approve" data-action="restore">فعال‌سازی دوباره عضویت</button>':'')+
        '</div><p class="admin-message" role="status"></p></article>';
    }));
    list.innerHTML=html.join('');
  }
  const pointsForm=document.getElementById('member-points-form');
  const pointsMember=document.getElementById('points-member-select');
  const pointsType=document.getElementById('points-activity-type');
  const pointsValue=document.getElementById('points-value');
  const pointsMessage=document.getElementById('points-form-message');
  const pointsHistory=document.getElementById('member-points-history');
  async function loadPointMembers(){
    if(!pointsMember)return;
    const {data,error}=await client.from('rls_profiles').select('user_id,full_name,display_name,member_number').eq('membership_status','approved').order('created_at',{ascending:true});
    if(error){pointsMember.innerHTML='<option value="">خطا در دریافت اعضا</option>';return;}
    pointsMember.innerHTML='<option value="">انتخاب عضو…</option>'+(data||[]).map(p=>'<option value="'+esc(p.user_id)+'">'+esc(p.display_name||p.full_name)+' · '+esc(String(p.member_number||''))+'</option>').join('');
  }
  async function loadPointHistory(){
    if(!pointsHistory)return;
    pointsHistory.textContent='در حال دریافت سوابق…';
    const {data,error}=await client.from('rls_member_points').select('id,user_id,activity_type,title,description,activity_date,points,evidence_url,created_at').order('activity_date',{ascending:false}).limit(100);
    if(error){pointsHistory.textContent='دریافت سوابق امتیاز ناموفق بود: '+error.message;return;}
    if(!data?.length){pointsHistory.textContent='هنوز امتیازی ثبت نشده است.';return;}
    const ids=[...new Set(data.map(x=>x.user_id))];
    const {data:profiles}=await client.from('rls_profiles').select('user_id,full_name,display_name,member_number').in('user_id',ids);
    const people=new Map((profiles||[]).map(p=>[p.user_id,p]));
    pointsHistory.innerHTML=data.map(p=>{
      const member=people.get(p.user_id)||{};
      const evidence=p.evidence_url&&/^https?:\/\//i.test(p.evidence_url)?'<a href="'+esc(p.evidence_url)+'" target="_blank" rel="noopener noreferrer">مشاهده مستند</a>':'';
      return '<article class="admin-points-record"><div><strong>'+esc(member.display_name||member.full_name||'عضو')+'</strong><span> · '+esc(String(member.member_number||''))+'</span><h4>'+esc(p.title)+'</h4><p>'+esc(p.description||'')+'</p><small>'+esc(p.activity_date)+' · ثبت در '+esc(new Date(p.created_at).toLocaleDateString('fa-IR'))+'</small>'+(evidence?'<p>'+evidence+'</p>':'')+'</div><div><b>+'+esc(String(p.points))+'</b><span>امتیاز</span><button type="button" class="reject" data-delete-point="'+esc(p.id)+'">حذف رکورد</button></div></article>';
    }).join('');
  }
  if(pointsType&&pointsValue){
    const updatePoints=()=>{const option=pointsType.selectedOptions[0];pointsValue.value=option?.dataset.points||1;pointsValue.readOnly=pointsType.value!=='other';};
    pointsType.addEventListener('change',updatePoints);updatePoints();
  }
  if(pointsForm){
    pointsForm.addEventListener('submit',async e=>{
      e.preventDefault();pointsMessage.textContent='در حال ثبت…';
      const fd=new FormData(pointsForm);
      const userId=String(fd.get('user_id')||'');
      const title=String(fd.get('title')||'').trim();
      const activityDate=String(fd.get('activity_date')||'');
      const activityType=String(fd.get('activity_type')||'');
      const points=Number(fd.get('points'));
      const evidence=String(fd.get('evidence_url')||'').trim();
      if(!userId||title.length<3||!activityDate||!activityType||!Number.isInteger(points)||points<1||points>40){pointsMessage.textContent='اطلاعات ناقص یا امتیاز نامعتبر است.';return;}
      if(evidence){try{const u=new URL(evidence);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch{pointsMessage.textContent='پیوند مدرک باید نشانی معتبر HTTP یا HTTPS باشد.';return;}}
      const {error}=await client.from('rls_member_points').insert({
        user_id:userId,activity_type:activityType,title,activity_date:activityDate,
        description:String(fd.get('description')||'').trim()||null,points,evidence_url:evidence||null
      });
      if(error){pointsMessage.textContent='ثبت امتیاز ناموفق بود: '+error.message;return;}
      pointsMessage.textContent='امتیاز با موفقیت ثبت شد و در پروفایل و گواهی عضو محاسبه می‌شود.';
      pointsForm.reset();if(pointsType&&pointsValue){pointsType.value='meeting_attendance';pointsValue.value='2';pointsValue.readOnly=true;}
      await Promise.all([loadPointMembers(),loadPointHistory()]);
    });
  }
  if(pointsHistory){
    pointsHistory.addEventListener('click',async e=>{
      const button=e.target.closest('[data-delete-point]');if(!button)return;
      if(!confirm('این رکورد امتیاز حذف شود؟ مجموع امتیاز و گواهی عضو پس از بارگذاری مجدد به‌روزرسانی می‌شود.'))return;
      button.disabled=true;
      const {error}=await client.from('rls_member_points').delete().eq('id',button.dataset.deletePoint);
      if(error){button.disabled=false;alert('حذف رکورد ناموفق بود: '+error.message);return;}
      await loadPointHistory();
    });
  }
  async function moderate(id,action,card){
    const message=card.querySelector('.admin-message');message.textContent='در حال ثبت…';
    const {data:{user}}=await client.auth.getUser();
    if(!user){message.textContent='نشست مدیر منقضی شده است.';return;}
    const pendingPath=card.dataset.pendingAvatar||'';
    const currentPath=card.dataset.avatarPath||'';
    const update={};
    let removePath='';
    if(action==='change_category'){
      const selected=card.querySelector('[data-category-select]')?.value;
      if(!categories.some(([key])=>key===selected)){message.textContent='گروه انتخاب‌شده معتبر نیست.';return;}
      update.category=selected;
    }
    if(action==='toggle_visibility'){
      const {data:current,error:readError}=await client.from('rls_profiles').select('is_public,membership_status').eq('user_id',id).single();
      if(readError){message.textContent='خواندن وضعیت پروفایل ناموفق بود: '+readError.message;return;}
      if(current.membership_status!=='approved'){message.textContent='فقط اعضای تأییدشده امکان نمایش عمومی دارند.';return;}
      update.is_public=!current.is_public;
    }
    if(action==='restore'){
      Object.assign(update,{membership_status:'approved',is_public:true,review_note:null,reviewed_by:user.id,reviewed_at:new Date().toISOString()});
    }
    if(action==='approve'){
      const selectedPath=pendingPath||currentPath;
      if(!selectedPath){message.textContent='تا پیش از ثبت عکس پروفایل، درخواست قابل تأیید نیست.';return;}
      Object.assign(update,{membership_status:'approved',is_public:true,review_note:null,
        avatar_path:selectedPath,pending_avatar_path:null,reviewed_by:user.id,reviewed_at:new Date().toISOString()});
      if(currentPath&&currentPath!==selectedPath)removePath=currentPath;
    }
    if(action==='reject'){
      Object.assign(update,{membership_status:'rejected',is_public:false,review_note:'درخواست پس از بررسی تأیید نشد.',
        reviewed_by:user.id,reviewed_at:new Date().toISOString()});
    }
    if(action==='approve_avatar'){
      if(!pendingPath){message.textContent='عکس جدیدی برای تأیید پیدا نشد.';return;}
      Object.assign(update,{avatar_path:pendingPath,pending_avatar_path:null});
      if(currentPath&&currentPath!==pendingPath)removePath=currentPath;
    }
    if(action==='reject_avatar'){
      if(!pendingPath){message.textContent='عکس جدیدی برای رد کردن پیدا نشد.';return;}
      Object.assign(update,{pending_avatar_path:null});
      removePath=pendingPath;
    }
    if(action==='suspend'){
      Object.assign(update,{membership_status:'suspended',is_public:false,review_note:'عضویت توسط مدیر تعلیق شد.',
        reviewed_by:user.id,reviewed_at:new Date().toISOString()});
    }
    if(!Object.keys(update).length){message.textContent='تغییری برای ذخیره وجود ندارد.';return;}
    const {error}=await client.from('rls_profiles').update(update).eq('user_id',id);
    if(error){message.textContent='خطا: '+error.message;return;}
    if(removePath){
      const {error:removeError}=await client.storage.from('rls-member-avatars').remove([removePath]);
      if(removeError)console.warn('Old avatar cleanup failed:',removeError.message);
    }
    await load();
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();msg.textContent='در حال ورود…';
    const fd=new FormData(form);
    const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
    if(error){msg.textContent='ورود ناموفق: '+error.message;return;}
    await checkAdmin();
  });
  document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{
    status=b.dataset.status;
    document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x===b));
    load();
  }));
  list.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    const card=b.closest('.admin-member');moderate(card.dataset.id,b.dataset.action,card);
  });
  document.getElementById('admin-logout').addEventListener('click',async()=>{
    await client.auth.signOut();await checkAdmin();
  });
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')setTimeout(checkAdmin,0);
  });
  checkAdmin();
})();