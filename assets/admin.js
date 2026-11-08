(function(){
  const cfg=window.RLS_SUPABASE_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey);
  const login=document.getElementById('admin-login'),dashboard=document.getElementById('admin-dashboard');
  const form=document.getElementById('admin-login-form'),msg=document.getElementById('login-message'),list=document.getElementById('admin-list');
  let status='pending',checking=false;
  const labels={student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر مطالعات روسیه',translator:'مترجم زبان روسی',culture:'فعال ادبیات و فرهنگ روسیه',honorary:'عضو افتخاری'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function checkAdmin(){
    if(checking)return;checking=true;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session){login.hidden=false;dashboard.hidden=true;return;}
      const {data:role,error}=await client.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
      if(error||role?.role!=='admin'){
        msg.textContent='این حساب دسترسی مدیر انجمن را ندارد.';
        await client.auth.signOut();login.hidden=false;dashboard.hidden=true;return;
      }
      login.hidden=true;dashboard.hidden=false;
      document.getElementById('admin-identity').textContent=session.user.email||'مدیر انجمن';
      await load();
    }finally{checking=false;}
  }
  async function load(){
    list.textContent='در حال دریافت اطلاعات…';
    const {data,error}=await client.from('rls_profiles')
      .select('user_id,full_name,display_name,category,email,country,city,institution,degree,specialty,bio,evidence_url,website_url,orcid,membership_status,created_at')
      .eq('membership_status',status).order('created_at',{ascending:true});
    if(error){list.textContent='خطا در دریافت درخواست‌ها: '+error.message;return;}
    if(!data?.length){list.textContent='در این دسته درخواستی وجود ندارد.';return;}
    const html=await Promise.all(data.map(async p=>{
      let evidence='';
      if(p.evidence_url){
        const {data:signed,error:signedError}=await client.storage.from('rls-members-private').createSignedUrl(p.evidence_url,300);
        evidence=!signedError&&signed?.signedUrl
          ?'<p><a href="'+esc(signed.signedUrl)+'" target="_blank" rel="noopener noreferrer">مشاهده مدرک (پیوند موقت ۵ دقیقه‌ای)</a></p>'
          :'<p class="admin-meta">مدرک ثبت شده، اما ایجاد پیوند امن ناموفق بود.</p>';
      }
      return '<article class="admin-member" data-id="'+esc(p.user_id)+'"><h3>'+esc(p.full_name)+'</h3>'+
        '<div class="admin-meta">گروه: '+esc(labels[p.category]||p.category)+' · ایمیل: '+esc(p.email)+
        '<br>محل: '+esc([p.city,p.country].filter(Boolean).join('، ')||'ثبت نشده')+' · مؤسسه: '+esc(p.institution||'ثبت نشده')+
        '<br>تحصیلات: '+esc(p.degree||'—')+' · تخصص: '+esc(p.specialty||'—')+
        '<br>معرفی: '+esc(p.bio||'—')+'<br>تاریخ درخواست: '+new Date(p.created_at).toLocaleString('fa-IR')+'</div>'+
        evidence+'<div class="admin-actions">'+
        (status==='pending'?'<button class="approve" data-action="approve">تأیید و انتشار پروفایل</button><button class="reject" data-action="reject">رد درخواست</button>':'')+
        (status==='approved'?'<button class="suspend" data-action="suspend">تعلیق عضویت</button>':'')+
        '</div><p class="admin-message" role="status"></p></article>';
    }));
    list.innerHTML=html.join('');
  }
  async function moderate(id,action,card){
    const message=card.querySelector('.admin-message');message.textContent='در حال ثبت…';
    const {data:{user}}=await client.auth.getUser();
    if(!user){message.textContent='نشست مدیر منقضی شده است.';return;}
    const update={reviewed_by:user.id,reviewed_at:new Date().toISOString()};
    if(action==='approve')Object.assign(update,{membership_status:'approved',is_public:true,review_note:null});
    if(action==='reject')Object.assign(update,{membership_status:'rejected',is_public:false,review_note:'درخواست پس از بررسی تأیید نشد.'});
    if(action==='suspend')Object.assign(update,{membership_status:'suspended',is_public:false,review_note:'عضویت توسط مدیر تعلیق شد.'});
    const {error}=await client.from('rls_profiles').update(update).eq('user_id',id);
    if(error){message.textContent='خطا: '+error.message;return;}
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