(function(){
  const login=document.getElementById('admin-login'),dashboard=document.getElementById('admin-dashboard');
  const form=document.getElementById('admin-login-form'),msg=document.getElementById('login-message'),list=document.getElementById('admin-list');
  const cfg=window.RLS_SUPABASE_CONFIG;
  if(!cfg||!window.supabase){
    if(msg) msg.textContent='سامانهٔ ورود بارگذاری نشد. اتصال اینترنت را بررسی و صفحه را دوباره بارگذاری کنید.';
    if(login) login.hidden=false;
    if(dashboard) dashboard.hidden=true;
    return;
  }
  const client=window.RLS_SUPABASE_CLIENT || (window.RLS_SUPABASE_CLIENT = window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
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
    }catch(error){
      console.error('RLS admin access check failed:',error);
      if(msg)msg.textContent='ارتباط با سامانهٔ احراز هویت برقرار نشد: '+(error?.message||'خطای نامشخص')+' · صفحه را دوباره بارگذاری کنید.';
      if(login)login.hidden=false;
      if(dashboard)dashboard.hidden=true;
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
      const name=p.full_name||'عضو انجمن';
      const number=String(p.member_number||'').padStart(6,'0');
      const state=p.membership_status==='suspended'?' · عضویت تعلیق‌شده':' · عضویت فعال';
      return '<article class="admin-member admin-certificate-member" data-certificate-user="'+esc(p.user_id)+'">'+
        '<h3>'+esc(name)+'</h3>'+
        '<div class="admin-meta">شماره عضویت: '+esc(number)+' · گروه: '+esc(labels[p.category]||p.category||'—')+state+
        '<br>ایمیل: '+esc(p.email||'—')+' · تاریخ عضویت: '+(p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):'—')+'</div>'+
        '<div class="admin-certificate-preview"></div></article>';
    }).join('');
    data.forEach(p=>{
      const card=list.querySelector('[data-certificate-user="'+String(p.user_id)+'"]');
      const target=card?.querySelector('.admin-certificate-preview');
      if(target&&window.RLSMembershipCertificate){
        window.RLSMembershipCertificate.render(target,{
          user_id:String(p.user_id),full_name:p.full_name,category:p.category,created_at:p.created_at,
          member_number:p.member_number,membership_status:p.membership_status
        },{adminPreview:true});
      }
    });
  }
  async function loadApplications(){
    list.textContent='در حال دریافت درخواست‌های مستقل…';
    const {data,error}=await client.from('rls_membership_applications')
      .select('id,email,full_name,salutation,category,profile_data,avatar_path,evidence_path,status,created_at')
      .eq('status','pending').order('created_at',{ascending:true});
    if(error){list.textContent='خطا در دریافت درخواست‌های مستقل: '+error.message;return;}
    if(!data?.length){list.textContent='در حال حاضر درخواست مستقلی در انتظار بررسی نیست.';return;}
    const cards=await Promise.all(data.map(async p=>{
      let photo='<p class="admin-meta admin-photo-missing">عکس پروفایل هنوز ارسال نشده است؛ بارگذاری آن اختیاری است و می‌تواند بعداً انجام شود.</p>';
      if(p.avatar_path){
        const {data:signed}=await client.storage.from('rls-membership-applications').createSignedUrl(p.avatar_path,300);
        if(signed?.signedUrl)photo='<div class="admin-photo-review"><img src="'+esc(signed.signedUrl)+'" alt="عکس '+esc(p.full_name)+'" width="120" height="120" loading="lazy" decoding="async"><span>عکس ارسالی متقاضی</span></div>';
      }
      let evidence='';
      if(p.evidence_path){
        const {data:signed}=await client.storage.from('rls-membership-applications').createSignedUrl(p.evidence_path,300);
        if(signed?.signedUrl)evidence='<p><a href="'+esc(signed.signedUrl)+'" target="_blank" rel="noopener noreferrer">مشاهده مدرک پیوست</a></p>';
      }
      const d=p.profile_data||{};
      const extra=[['کشور',d.country],['شهر',d.city],['مؤسسه',d.institution],['تحصیلات',d.degree],['تخصص',d.specialty],['معرفی',d.bio],['وب‌سایت',d.website_url],['ORCID',d.orcid],['ایمیل دیگر ثبت‌شده در گزارش خطا',d.alternate_registration_email]].filter(x=>x[1]);
      return '<article class="admin-member" data-application-id="'+esc(p.id)+'"><h3>'+esc(p.full_name)+'</h3>'+photo+
        '<div class="admin-meta">ایمیل: '+esc(p.email)+' · گروه: '+esc(labels[p.category]||p.category)+
        '<br>تاریخ ثبت: '+new Date(p.created_at).toLocaleString('fa-IR')+
        (extra.length?'<br>'+extra.map(x=>'<b>'+esc(x[0])+':</b> '+esc(x[1])).join(' · '):'')+'</div>'+
        evidence+
        '<p class="admin-meta">این درخواست مستقل از ساخت حساب و ارسال ایمیل ذخیره شده است. تأیید در این بخش، تأیید خودِ درخواست عضویت است؛ ایجاد حساب ورود پس از رفع اختلال سرویس احراز هویت انجام می‌شود.</p>'+
        '<div class="admin-actions"><button class="approve" data-action="application_approve">تأیید درخواست عضویت</button><button class="reject" data-action="application_reject">رد درخواست</button></div>'+
        '<p class="admin-message" role="status"></p></article>';
    }));
    list.innerHTML=cards.join('');
  }
  async function moderateApplication(id, action, card){
    const message=card.querySelector('.admin-message');
     message.textContent='در حال ثبت تصمیم مدیر…';
    const {data:{user}}=await client.auth.getUser();
    if(!user){message.textContent='نشست مدیر منقضی شده است.';return;}
    const status=action==='application_approve'?'approved':'rejected';
    const {error}=await client.from('rls_membership_applications').update({
      status,reviewed_by:user.id,reviewed_at:new Date().toISOString(),
      review_note:status==='approved'?'درخواست توسط مدیر تأیید شد.':'درخواست توسط مدیر رد شد.'
    }).eq('id',id).eq('status','pending');
    if(error){message.textContent='ثبت تصمیم ناموفق بود: '+error.message;return;}
    await load();
  }
  async function load(){
    if(status==='certificates'){await loadCertificates();return;}
    if(status==='applications'){await loadApplications();return;}
    list.textContent='در حال دریافت اطلاعات…';
    let query=client.from('rls_profiles')
      .select('user_id,full_name,display_name,category,email,country,city,institution,degree,specialty,bio,evidence_url,website_url,orcid,avatar_path,pending_avatar_path,membership_status,member_number,is_public,created_at,profile_headline,memberships,activities,publications,research_interests,languages,phone,researchgate_url,google_scholar_url,instagram_url,telegram_url,linkedin_url,x_url,blog_url')
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
        :'<p class="admin-meta admin-photo-missing">عکس پروفایل ثبت نشده است؛ مدیر می‌تواند آن را از همین بخش بارگذاری کند یا عضو بعداً از پنل خود ارسال کند.</p>';
      const photoUploader='<div class="admin-photo-upload"><label>بارگذاری دستی عکس برای این عضو<input type="file" accept="image/jpeg,image/png,image/webp" data-admin-avatar-file></label><button type="button" class="approve" data-action="upload_member_avatar">بارگذاری عکس</button><small>JPG، PNG یا WebP؛ حداکثر ۵ مگابایت. عکس پس از بارگذاری در انتظار تأیید مدیر خواهد بود.</small></div>';
      return '<article class="admin-member" data-id="'+esc(p.user_id)+'" data-avatar-path="'+esc(p.avatar_path||'')+'" data-pending-avatar="'+esc(p.pending_avatar_path||'')+'"><h3>'+esc(p.full_name)+'</h3>'+
        photo+photoUploader+
        '<div class="admin-meta">گروه: '+esc(labels[p.category]||p.category)+' · ایمیل: '+esc(p.email)+
        '<br>محل: '+esc([p.city,p.country].filter(Boolean).join('، ')||'ثبت نشده')+' · مؤسسه: '+esc(p.institution||'ثبت نشده')+
        '<br>تحصیلات: '+esc(p.degree||'—')+' · تخصص: '+esc(p.specialty||'—')+
        '<br>معرفی: '+esc(p.bio||'—')+'<br>تاریخ درخواست: '+new Date(p.created_at).toLocaleString('fa-IR')+'</div>'+
        '<details class="admin-profile-editor"><summary>ویرایش کامل اطلاعات عضو</summary><div class="admin-profile-fields">'+
        [['display_name','نام نمایشی',p.display_name],['full_name','نام کامل',p.full_name],['country','کشور',p.country],['city','شهر',p.city],['institution','دانشگاه یا مؤسسه',p.institution],['degree','مدرک تحصیلی',p.degree],['specialty','حوزه تخصصی',p.specialty],['profile_headline','عنوان معرفی',p.profile_headline],['website_url','وب‌سایت',p.website_url],['orcid','ORCID',p.orcid],['researchgate_url','ResearchGate',p.researchgate_url],['google_scholar_url','Google Scholar',p.google_scholar_url],['instagram_url','Instagram',p.instagram_url],['telegram_url','Telegram',p.telegram_url],['linkedin_url','LinkedIn',p.linkedin_url],['x_url','X',p.x_url],['blog_url','وبلاگ',p.blog_url],['phone','شماره تماس',p.phone],['memberships','عضویت‌ها',p.memberships],['activities','فعالیت‌ها',p.activities],['publications','آثار و انتشارات',p.publications],['research_interests','علایق پژوهشی',p.research_interests],['languages','زبان‌ها',p.languages],['bio','زندگی‌نامه',p.bio]].map(([key,label,value])=>'<label>'+label+(key==='bio'||['memberships','activities','publications','research_interests','languages'].includes(key)?'<textarea data-profile-field="'+key+'" rows="3">'+esc(value||'')+'</textarea>':'<input data-profile-field="'+key+'" value="'+esc(value||'')+'">')+'</label>').join('')+
        '<label><input type="checkbox" data-profile-field="is_public" '+(p.is_public?'checked':'')+'> نمایش پروفایل در فهرست عمومی</label></div><button type="button" class="approve" data-action="save_profile">ذخیره اطلاعات عضو</button></details>'+
        evidence+'<div class="admin-category-editor"><label>گروه عضویت<select data-category-select>'+categories.map(([key,label])=>'<option value="'+key+'"'+(p.category===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label><button type="button" class="approve" data-action="change_category">ذخیره گروه عضویت</button></div>'+
        '<div class="admin-actions">'+
        (status==='pending'?'<button class="approve" data-action="approve">تأیید عضویت و عکس</button><button class="reject" data-action="reject">رد درخواست</button>':'')+
        ((status==='approved'||status==='photo_pending')&&p.pending_avatar_path?'<button class="approve" data-action="approve_avatar">تأیید عکس جدید</button><button class="reject" data-action="reject_avatar">رد عکس جدید</button>':'')+
        (status==='approved'?'<button class="approve" data-action="resend_approval_email">ارسال مجدد ایمیل تأیید عضویت</button><button class="suspend" data-action="suspend">تعلیق عضویت</button><button class="visibility" data-action="toggle_visibility">'+(p.is_public?'پنهان‌کردن پروفایل عمومی':'نمایش پروفایل عمومی')+'</button>':'')+
        (status==='suspended'?'<button class="approve" data-action="restore">فعال‌سازی دوباره عضویت</button>':'')+
        '</div>'+(status==='approved'?'<div class="admin-certificate-preview"></div>':'')+'<p class="admin-message" role="status"></p></article>';
    }));
    list.innerHTML=html.join('');
    if(status==='approved'&&window.RLSMembershipCertificate){
      data.forEach(p=>{
        if(!p.member_number)return;
        const card=list.querySelector('[data-id="'+String(p.user_id)+'"]');
        const target=card?.querySelector('.admin-certificate-preview');
        if(target)window.RLSMembershipCertificate.render(target,{
          user_id:String(p.user_id),full_name:p.full_name,category:p.category,created_at:p.created_at,
          member_number:p.member_number,membership_status:p.membership_status
        },{adminPreview:true});
      });
    }
  }
  async function moderate(id,action,card){
    const message=card.querySelector('.admin-message');message.textContent='در حال ثبت…';
    const {data:{user}}=await client.auth.getUser();
    if(!user){message.textContent='نشست مدیر منقضی شده است.';return;}
    const pendingPath=card.dataset.pendingAvatar||'';
    const currentPath=card.dataset.avatarPath||'';
    const update={};
    let removePath='';
    if(action==='save_profile'){
      const fields=['display_name','full_name','country','city','institution','degree','specialty','profile_headline','website_url','orcid','researchgate_url','google_scholar_url','instagram_url','telegram_url','linkedin_url','x_url','blog_url','phone','memberships','activities','publications','research_interests','languages','bio'];
      fields.forEach(key=>{const field=card.querySelector('[data-profile-field="'+key+'"]');if(field)update[key]=field.value.trim()||null;});
      const publicField=card.querySelector('[data-profile-field="is_public"]');
      if(publicField)update.is_public=publicField.checked;
      if(!update.full_name||update.full_name.length<2){message.textContent='نام کامل باید دست‌کم دو نویسه باشد.';return;}
      if(update.bio&&update.bio.length>3000){message.textContent='زندگی‌نامه نباید بیش از ۳۰۰۰ نویسه باشد.';return;}
    }
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
      Object.assign(update,{membership_status:'approved',is_public:true,review_note:null,
        reviewed_by:user.id,reviewed_at:new Date().toISOString()});
      if(selectedPath){
        Object.assign(update,{avatar_path:selectedPath,pending_avatar_path:null});
        if(currentPath&&currentPath!==selectedPath)removePath=currentPath;
      }else{
        update.avatar_path=null;
        update.pending_avatar_path=null;
      }
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
    const notificationEvents={approve:'membership_approved',reject:'membership_rejected',suspend:'membership_suspended',restore:'membership_restored'};
    let notificationFailed=false;
    if(notificationEvents[action]){
      try{
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError)throw sessionError;
        const token=sessionData?.session?.access_token;
        if(!token)throw new Error('Admin session unavailable');
        const {data:notice,error:noticeError}=await client.functions.invoke('notify-membership-request',{
          headers:{Authorization:'Bearer '+token},
          body:{event:notificationEvents[action],user_id:id}
        });
        if(noticeError||notice?.error)throw noticeError||new Error(notice.error);
      }catch(notificationError){
        notificationFailed=true;
        console.warn('Membership status email notification failed:',notificationError);
      }
    }
    if(action==='approve'){
      status='approved';
      document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x.dataset.status==='approved'));
    }
    await load();
    if(notificationFailed){
      const note=document.createElement('p');
      note.className='admin-message';
      note.setAttribute('role','status');
      note.textContent='تغییر وضعیت ثبت شد، اما ایمیل اطلاع‌رسانی به عضو ارسال نشد.';
      list.prepend(note);
    }
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
    const card=b.closest('.admin-member');
    if(b.dataset.action==='upload_member_avatar'){
      const message=card?.querySelector('.admin-message');
      const input=card?.querySelector('[data-admin-avatar-file]');
      const file=input?.files?.[0];
      if(!file){if(message)message.textContent='ابتدا عکس موردنظر را انتخاب کنید.';return;}
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
        if(message)message.textContent='فایل باید JPG، PNG یا WebP و حداکثر ۵ مگابایت باشد.';return;
      }
      b.disabled=true;
      if(message)message.textContent='در حال بارگذاری عکس برای این عضو…';
      try{
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError)throw sessionError;
        const token=sessionData?.session?.access_token;
        if(!token)throw new Error('نشست مدیر در دسترس نیست؛ دوباره وارد شوید.');
        const body=new FormData();
        body.append('user_id',card.dataset.id);
        body.append('file',file,file.name||'member-avatar');
        const {data:result,error}=await client.functions.invoke('admin-upload-member-avatar',{
          headers:{Authorization:'Bearer '+token},body
        });
        if(error||!result?.ok)throw error||new Error(result?.error||'بارگذاری عکس ناموفق بود.');
        await load();
        const updatedCard=list.querySelector('[data-id="'+String(card.dataset.id)+'"]');
        const updatedMessage=updatedCard?.querySelector('.admin-message');
        if(updatedMessage)updatedMessage.textContent='عکس با موفقیت بارگذاری شد و در انتظار تأیید نهایی است.';
      }catch(error){
        console.error('Administrator member photo upload failed:',error);
        if(message)message.textContent='بارگذاری عکس ناموفق بود: '+(error?.message||'خطای نامشخص');
      }finally{b.disabled=false;}
      return;
    }
    if(b.dataset.action==='resend_approval_email'){
      const message=card.querySelector('.admin-message');
      b.disabled=true;
      if(message)message.textContent='در حال ارسال ایمیل تأیید عضویت…';
      try{
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError)throw sessionError;
        const token=sessionData?.session?.access_token;
        if(!token)throw new Error('نشست مدیر در دسترس نیست.');
        const {data:notice,error:noticeError}=await client.functions.invoke('notify-membership-request',{
          headers:{Authorization:'Bearer '+token},
          body:{event:'membership_approved',user_id:card.dataset.id}
        });
        if(noticeError||notice?.error)throw noticeError||new Error(notice.error);
        if(message)message.textContent='ایمیل تأیید عضویت با موفقیت به سرویس ارسال ایمیل تحویل داده شد.';
      }catch(error){
        console.warn('Manual membership approval email resend failed:',error);
        if(message)message.textContent='ارسال ایمیل ناموفق بود. لطفاً دوباره تلاش کنید.';
      }finally{b.disabled=false;}
      return;
    }
    if(b.dataset.action==='application_approve'||b.dataset.action==='application_reject'){
      moderateApplication(card.dataset.applicationId,b.dataset.action,card);
      return;
    }
    moderate(card.dataset.id,b.dataset.action,card);
  });
  document.getElementById('admin-logout').addEventListener('click',async()=>{
    await client.auth.signOut();await checkAdmin();
  });
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')setTimeout(checkAdmin,0);
  });
  checkAdmin();
})();