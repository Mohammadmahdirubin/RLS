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
      await load();
    }finally{checking=false;}
  }
  async function loadCertificates(){
    list.textContent='در حال دریافت فهرست گواهی‌ها…';
    const {data,error}=await client.from('rls_profiles')
      .select('user_id,full_name,display_name,category,email,created_at,membership_status,member_number')
      .in('membership_status',['approved','suspended'])
      .not('member_number','is',null)
      .order('member_number',{ascending:true});
    if(error){list.textContent='خطا در دریافت فهرست گواهی‌ها: '+error.message;return;}
    if(!data?.length){list.textContent='هنوز گواهی صادرشده‌ای برای بررسی وجود ندارد.';return;}
    list.innerHTML=data.map(p=>{
      const name=p.display_name||p.full_name||'عضو انجمن';
      const number=String(p.member_number||'').padStart(6,'0');
      const state=p.membership_status==='suspended'?' · عضویت تعلیق‌شده':' · عضویت فعال';
      return '<article class="admin-member admin-certificate-member" data-certificate-user="'+esc(p.user_id)+'">'+
        '<h3>'+esc(name)+'</h3>'+
        '<div class="admin-meta">شماره عضویت: '+esc(number)+' · گروه: '+esc(labels[p.category]||p.category||'—')+state+
        '<br>ایمیل: '+esc(p.email||'—')+' · تاریخ عضویت: '+(p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):'—')+'</div>'+
        '<div class="admin-certificate-preview"></div></article>';
    }).join('');
    data.forEach(p=>{
      const card=list.querySelector('[data-certificate-user="'+CSS.escape(String(p.user_id))+'"]');
      const target=card?.querySelector('.admin-certificate-preview');
      if(target&&window.RLSMembershipCertificate){
        window.RLSMembershipCertificate.render(target,{
          user_id:String(p.user_id),display_name:p.display_name||p.full_name,
          full_name:p.full_name,category:p.category,created_at:p.created_at,
          member_number:p.member_number,membership_status:p.membership_status
        },{adminPreview:true});
      }
    });
  }
  async function load(){
    if(status==='certificates'){await loadCertificates();return;}
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
        // Do not create hundreds of signed URLs while rendering the member list.
        // A signed link is requested only when an administrator opens the evidence.
        evidence='<p><button type="button" class="community-search-btn admin-evidence-link" data-evidence-path="'+esc(p.evidence_url)+'">ساخت پیوند امن مدرک</button></p>';
      }
      const reviewAvatarPath=p.pending_avatar_path||p.avatar_path;
      const avatarUrl=reviewAvatarPath
        ?client.storage.from('rls-member-avatars').getPublicUrl(reviewAvatarPath).data.publicUrl:'';
      const photo=avatarUrl
        ?'<div class="admin-photo-review"><img src="'+esc(avatarUrl)+'" alt="عکس پروفایل '+esc(p.full_name)+'" width="104" height="104" loading="lazy" decoding="async"><span>'+(p.pending_avatar_path?'عکس جدید در انتظار تأیید':'عکس پروفایل')+'</span></div>'
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
  list.addEventListener('click',async e=>{
    const evidenceButton=e.target.closest('[data-evidence-path]');
    if(evidenceButton){
      e.preventDefault();
      if(evidenceButton.dataset.loading==='1')return;
      evidenceButton.dataset.loading='1';
      evidenceButton.disabled=true;
      evidenceButton.textContent='در حال ساخت پیوند امن…';
      try{
        const path=evidenceButton.dataset.evidencePath||'';
        const {data:signed,error}=await client.storage.from('rls-members-private').createSignedUrl(path,300);
        if(error||!signed?.signedUrl)throw error||new Error('Signed URL unavailable');
        const link=document.createElement('a');
        link.href=signed.signedUrl;
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.textContent='باز کردن مدرک (پیوند موقت ۵ دقیقه‌ای)';
        evidenceButton.replaceWith(link);
      }catch(error){
        evidenceButton.disabled=false;
        evidenceButton.dataset.loading='0';
        evidenceButton.textContent='تلاش دوباره برای پیوند مدرک';
        console.warn('Could not create a private evidence link:',error);
      }
      return;
    }
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