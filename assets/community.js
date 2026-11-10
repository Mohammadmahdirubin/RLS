(function () {
  const root = document.querySelector('[data-community]');
  if (!root) return;
  const cfg = window.RLS_SUPABASE_CONFIG;
  const db = cfg && window.supabase ? (window.RLS_SUPABASE_CLIENT || (window.RLS_SUPABASE_CLIENT = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))) : null;
  const search = root.querySelector('#member-search');
  const category = root.querySelector('#member-category');
  const wrap = root.querySelector('.community-members');
  const lang = document.documentElement.lang || 'en';
  const labels = {
    fa: {student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر',translator:'مترجم',culture:'ادبیات و فرهنگ',honorary:'عضو افتخاری'},
    en: {student:'Student',graduate:'Graduate',faculty:'Faculty member',researcher:'Researcher',translator:'Translator',culture:'Literature and culture',honorary:'Honorary member'},
    ru: {student:'Студент',graduate:'Выпускник',faculty:'Преподаватель',researcher:'Исследователь',translator:'Переводчик',culture:'Литература и культура',honorary:'Почётный участник'}
  };
  const categoryMeta = {
    student:{symbol:'🎓',tone:'student'},
    graduate:{symbol:'📜',tone:'graduate'},
    faculty:{symbol:'👩‍🏫',tone:'faculty'},
    researcher:{symbol:'👓',tone:'researcher'},
    translator:{symbol:'📚',tone:'translator'},
    culture:{symbol:'🏛️',tone:'culture'},
    honorary:{symbol:'🏅',tone:'honorary'}
  };
  const categoryBadge = key => {
    const meta=categoryMeta[key]||{symbol:'✦',tone:'other'};
    return '<span class="member-category member-category--'+meta.tone+'"><span class="member-category-symbol" aria-hidden="true">'+meta.symbol+'</span>'+esc((labels[lang]||labels.en)[key]||key||'')+'</span>';
  };
  const words = {
    fa:{back:'بازگشت به فهرست اعضا',headline:'معرفی کوتاه',bio:'زندگی‌نامه و سوابق',country:'کشور',city:'شهر',institution:'دانشگاه یا مؤسسه',degree:'مدرک تحصیلی',specialty:'حوزه تخصصی',memberships:'عضویت‌ها و وابستگی‌ها',activities:'فعالیت‌های علمی، آموزشی و فرهنگی',publications:'آثار، مقاله‌ها و ترجمه‌ها',research_interests:'علایق و زمینه‌های پژوهشی',languages:'زبان‌ها و مهارت‌ها',articles_count:'تعداد مقاله‌ها',books_count:'تعداد کتاب‌ها',member_number:'شماره عضویت',membership_status:'وضعیت عضویت',website_url:'وب‌سایت',orcid:'شناسه ORCID',email:'ایمیل',phone:'شماره تماس',empty:'این عضو هنوز اطلاعات تکمیلی عمومی ثبت نکرده است.'},
    en:{back:'Back to member directory',headline:'Short introduction',bio:'Biography and experience',country:'Country',city:'City',institution:'Institution',degree:'Degree',specialty:'Specialty',memberships:'Memberships and affiliations',activities:'Academic, educational and cultural activities',publications:'Publications, articles and translations',research_interests:'Research interests',languages:'Languages and skills',articles_count:'Articles',books_count:'Books',member_number:'Membership number',membership_status:'Membership status',website_url:'Website',orcid:'ORCID iD',email:'Email',phone:'Phone',empty:'This member has not added further public profile information yet.'},
    ru:{back:'Вернуться к списку участников',headline:'Краткое представление',bio:'Биография и опыт',country:'Страна',city:'Город',institution:'Университет или организация',degree:'Образование',specialty:'Специализация',memberships:'Членство и объединения',activities:'Научная, образовательная и культурная деятельность',publications:'Публикации, статьи и переводы',research_interests:'Научные интересы',languages:'Языки и навыки',articles_count:'Статьи',books_count:'Книги',member_number:'Номер участника',membership_status:'Статус членства',website_url:'Веб-сайт',orcid:'ORCID',email:'Электронная почта',phone:'Телефон',empty:'Участник пока не добавил дополнительную общедоступную информацию.'}
  };
  const w = words[lang] || words.en;
  function formatMemberNumber(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) return '';
    const padded = String(number).padStart(6, '0');
    return lang === 'fa' ? padded.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : padded;
  }
  const localized = (m,key) => lang==='fa' ? (m[key] || '') : (m[key+'_'+lang] || '');
  const initials = name => String(name || 'RLS').trim().split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase();
  let cards = [];
  let currentPage = 1;
  const PAGE_SIZE = 28;
  let pagination = null;
  function renderPagination(totalPages) {
    if(!pagination){pagination=document.createElement('nav');pagination.className='community-pagination';pagination.setAttribute('aria-label',lang==='fa'?'صفحه‌بندی اعضا':'Member pagination');wrap.appendChild(pagination);}
    pagination.innerHTML='';
    if(totalPages<=1)return;
    const add=(label,page,disabled=false,current=false)=>{
      const b=document.createElement('button');b.type='button';b.className='community-page-btn';b.textContent=label;b.disabled=disabled;
      if(current)b.setAttribute('aria-current','page');
      b.addEventListener('click',()=>{currentPage=page;filter();root.querySelector('#member-directory')?.scrollIntoView({behavior:'smooth',block:'start'});});
      pagination.appendChild(b);
    };
    add(lang==='fa'?'قبلی':'‹',currentPage-1,currentPage===1);
    for(let p=1;p<=totalPages;p++){
      if(totalPages>9 && p>2 && p<totalPages-1 && Math.abs(p-currentPage)>1){if(p===3||p===totalPages-2){const dots=document.createElement('span');dots.textContent='…';pagination.appendChild(dots);}continue;}
      add(String(p),p,false,p===currentPage);
    }
    add(lang==='fa'?'بعدی':'›',currentPage+1,currentPage===totalPages);
  }
  function filter() {
    const q=(search?.value||'').trim().toLocaleLowerCase();
    const matched=cards.filter(card=>(!category?.value||category.value===card.dataset.category)&&(!q||(card.dataset.search||'').toLocaleLowerCase().includes(q)));
    const totalPages=Math.max(1,Math.ceil(matched.length/PAGE_SIZE));
    if(currentPage>totalPages)currentPage=totalPages;
    const visible=new Set(matched.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE));
    cards.forEach(card=>{card.hidden=!visible.has(card);});
    const shown=matched.length;
    const empty=wrap.querySelector('.member-filter-empty');
    if(empty) {
      empty.hidden=shown>0;
      empty.textContent=lang==='fa'
        ? 'هیچ عضوی با این دسته‌بندی یا عبارت جست‌وجو پیدا نشد.'
        : lang==='ru'
          ? 'По выбранной категории или запросу участники не найдены.'
          : 'No members match this category or search.';
    }
    renderPagination(totalPages);
    root.querySelectorAll('[data-category-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.categoryFilter===(category?.value||''))));
  }
  function avatarUrl(path, size=112, optimized=true){
    if(!path)return '';
    const options=optimized&&size?{transform:{width:size,height:size,resize:'cover',quality:78}}:undefined;
    return db.storage.from('rls-member-avatars').getPublicUrl(path,options).data.publicUrl;
  }
  function attachAvatarFallback(img,path){
    if(!img||!path)return;
    img.addEventListener('error',()=>{
      if(img.dataset.originalFallback==='1')return;
      img.dataset.originalFallback='1';
      img.src=avatarUrl(path,null,false);
    },{once:true});
  }
  async function showAdminLink(){
    const link=root.querySelector('#community-admin-link');
    if(!link)return;
    link.hidden=false;
    link.textContent=lang==='fa'?'ورود مدیریت':lang==='ru'?'Вход для администратора':'Administrator login';
    if(!db)return;
    try{
      const {data:{session}}=await db.auth.getSession();
      if(!session)return;
      const {data:role}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
      if(role?.role==='admin')link.textContent=lang==='fa'?'مدیریت انجمن':lang==='ru'?'Панель управления':'Administration';
    }catch(_){}
  }
  function setMeta(selector, attribute, key, value) {
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('meta');node.setAttribute(attribute,key);document.head.appendChild(node);}
    node.setAttribute('content',String(value||''));
  }
  function setLink(rel, href, hreflang) {
    const selector='link[rel="'+rel+'"]'+(hreflang?'[hreflang="'+hreflang+'"]':'');
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('link');node.rel=rel;if(hreflang)node.hreflang=hreflang;document.head.appendChild(node);}
    node.href=href;
  }
  function setProfileSeo(m, id) {
    const displayName=localized(m,'display_name')||localized(m,'full_name')||'RLS Member';
    const group=(labels[lang]||labels.en)[m.category]||m.category||'Member';
    const headline=localized(m,'profile_headline')||localized(m,'specialty')||group;
    const bio=localized(m,'bio')||headline;
    const description=String((headline+'. '+bio).replace(/\s+/g,' ').trim()).slice(0,300);
    const title=lang==='fa' ? displayName+' | پروفایل عضو انجمن مطالعات زبان روسی' : lang==='ru' ? displayName+' | Профиль участника RLS' : displayName+' | RLS Member Profile';
    const canonical=new URL(location.pathname,location.origin);
    canonical.searchParams.set('member',id);
    const canonicalUrl=canonical.href;
    document.title=title;
    setMeta('meta[name="description"]','name','description',description);
    setMeta('meta[name="robots"]','name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setMeta('meta[property="og:type"]','property','og:type','profile');
    setMeta('meta[property="og:title"]','property','og:title',title);
    setMeta('meta[property="og:description"]','property','og:description',description);
    setMeta('meta[property="og:url"]','property','og:url',canonicalUrl);
    setMeta('meta[name="twitter:card"]','name','twitter:card','summary');
    setMeta('meta[name="twitter:title"]','name','twitter:title',title);
    setMeta('meta[name="twitter:description"]','name','twitter:description',description);
    setLink('canonical',canonicalUrl);
    const routes=[['fa','/community.html?member='+encodeURIComponent(id)],['en','/en/community.html?member='+encodeURIComponent(id)],['ru','/ru/community.html?member='+encodeURIComponent(id)]];
    routes.forEach(([code,path])=>setLink('alternate',new URL(path,location.origin).href,code));
    setLink('alternate',new URL(routes[0][1],location.origin).href,'x-default');
    const image=avatarUrl(m.avatar_path,512);
    if(image){setMeta('meta[property="og:image"]','property','og:image',image);setMeta('meta[name="twitter:image"]','name','twitter:image',image);}
    const sameAs=[m.website_url,m.orcid,m.researchgate_url,m.google_scholar_url,m.instagram_url,m.telegram_url,m.linkedin_url,m.x_url].map(safeUrl).filter(Boolean);
    const person={
      '@context':'https://schema.org','@type':'Person','name':displayName,'url':canonicalUrl,
      'description':description,'memberOf':{'@type':'Organization','name':'Russian Language Studies Association','url':'https://rlsj.ir/'},
      'jobTitle':group,'sameAs':sameAs
    };
    if(image)person.image=image;
    let script=document.getElementById('rls-member-jsonld');
    if(!script){script=document.createElement('script');script.id='rls-member-jsonld';script.type='application/ld+json';document.head.appendChild(script);}
    script.textContent=JSON.stringify(person).replace(/</g,'\\u003c');
  }
  function markProfileUnavailable() {
    setMeta('meta[name="robots"]','name','robots','noindex,follow');
    const canonical=new URL(location.pathname,location.origin).href;
    setLink('canonical',canonical);
  }

  async function showMember(id) {
    const {data:m,error}=await db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,degree,specialty,bio,avatar_path,website_url,orcid,researchgate_url,google_scholar_url,instagram_url,telegram_url,linkedin_url,x_url,articles_count,books_count,created_at,profile_headline,memberships,activities,publications,research_interests,languages,phone,email,full_name_en,full_name_ru,display_name_en,display_name_ru,profile_headline_en,profile_headline_ru,country_en,country_ru,city_en,city_ru,institution_en,institution_ru,degree_en,degree_ru,specialty_en,specialty_ru,bio_en,bio_ru,memberships_en,memberships_ru,activities_en,activities_ru,publications_en,publications_ru,research_interests_en,research_interests_ru,languages_en,languages_ru,salutation,reviewed_at,member_number,membership_status').eq('user_id',id).maybeSingle();
    const detail=document.createElement('section'); detail.className='community-section container member-public-page'; detail.id='member-public-page';
    const directory=root.querySelector('#member-directory');
    directory?.before(detail);
    root.querySelectorAll('.community-section').forEach(section=>{if(section!==detail)section.hidden=true;});
    if(error||!m){markProfileUnavailable();detail.innerHTML='<p class="community-empty">'+esc(lang==='fa'?'پروفایل عمومی این عضو پیدا نشد یا در دسترس نیست.':lang==='ru'?'Публичный профиль не найден или недоступен.':'This public member profile was not found or is unavailable.')+'</p><a class="community-button primary" href="'+esc(location.pathname)+'">'+esc(w.back)+'</a>';return;}
    setProfileSeo(m,id);
    const honorific=m.salutation?(lang==='fa'?(m.salutation==='ms'?'خانم ':'آقای '):lang==='ru'?(m.salutation==='ms'?'г-жа ':'г-н '):(m.salutation==='ms'?'Ms ':'Mr ')):''; const name=esc(honorific+(localized(m,'display_name')||localized(m,'full_name')||'RLS Member')),photo=avatarUrl(m.avatar_path,320);
    const fields=[['profile_headline',localized(m,'profile_headline')],['bio',localized(m,'bio')],['phone',m.phone],['email',m.email],['country',localized(m,'country')],['city',localized(m,'city')],['institution',localized(m,'institution')],['degree',localized(m,'degree')],['specialty',localized(m,'specialty')],['memberships',localized(m,'memberships')],['activities',localized(m,'activities')],['publications',localized(m,'publications')],['research_interests',localized(m,'research_interests')],['languages',localized(m,'languages')],['articles_count',m.articles_count===null||m.articles_count===undefined?'':String(m.articles_count)],['books_count',m.books_count===null||m.books_count===undefined?'':String(m.books_count)],['member_number',formatMemberNumber(m.member_number)],['membership_status',approvedStatusLabel],['orcid',m.orcid]].filter(x=>String(x[1]||'').trim());
    const website=safeUrl(m.website_url);
    detail.innerHTML='<article class="member-public-card member-public-card--'+esc(categoryMeta[m.category]?.tone||'other')+'">'+profileLinks(m)+'<div class="member-public-heading">'+(photo?'<img class="member-public-avatar" src="'+esc(photo)+'" data-avatar-path="'+esc(m.avatar_path)+'" alt="'+name+'" decoding="async" width="190" height="190">':'<div class="member-public-avatar member-profile-avatar-fallback">'+esc(initials(m.display_name))+'</div>')+'<div><h1>'+name+'</h1><span class="member-category">'+esc((labels[lang]||labels.en)[m.category]||m.category||'')+'</span><p class="member-public-join-date">'+esc(lang==='fa'?'تاریخ عضویت: ':lang==='ru'?'Дата вступления: ':'Membership date: ')+esc(formatJoinDate(m.created_at))+'</p>'+(m.member_number?'<p class="member-public-number">'+esc(lang==='fa'?'شماره عضویت: ':lang==='ru'?'Номер участника: ':'Membership number: ')+esc(formatMemberNumber(m.member_number))+'</p>':'')+'<p class="member-public-status">'+esc(lang==='fa'?'وضعیت عضویت: تأییدشده':lang==='ru'?'Статус членства: подтверждено':'Membership status: Approved')+'</p></div></div><div class="member-public-fields">'+fields.map(([key,value])=>'<section class="member-public-field"><h2>'+esc(w[key]||key)+'</h2><p>'+(key==='email'?'<a href="mailto:'+esc(value)+'">'+esc(value)+'</a>':key==='phone'?'<a href="tel:'+esc(String(value).replace(/[^0-9+]/g,''))+'">'+esc(value)+'</a>':esc(value).replace(/\\n/g,'<br>'))+'</p></section>').join('')+(website?'<section class="member-public-field"><h2>'+esc(w.website_url)+'</h2><p><a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(website).hostname)+'</a></p></section>':'')+'</div>'+(fields.length||website?'':'<p class="community-empty">'+esc(w.empty)+'</p>')+'</article>';
    const detailAvatar=detail.querySelector('img[data-avatar-path]');
    if(detailAvatar)attachAvatarFallback(detailAvatar,detailAvatar.dataset.avatarPath);
    if(window.RLSMembershipCertificate) window.RLSMembershipCertificate.render(detail,m);
  }
  async function load(forceDirectory = false) {
    if(!db){wrap.innerHTML='<div class="community-empty">Member directory is temporarily unavailable.</div>';return;}
    const memberId=new URLSearchParams(location.search).get('member');
    if(memberId && !forceDirectory){await showMember(memberId);return;}
    wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'در حال بارگذاری اعضا…':lang==='ru'?'Загрузка участников…':'Loading approved members…')+'</div>';
    const {data,error}=await db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,specialty,avatar_path,created_at,display_name_en,display_name_ru,profile_headline,profile_headline_en,profile_headline_ru,specialty_en,specialty_ru,email,website_url,orcid,researchgate_url,google_scholar_url,instagram_url,telegram_url,linkedin_url,x_url,articles_count,books_count,salutation,reviewed_at,member_number').order('display_name',{ascending:true}).limit(500);
    if(error){wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'دریافت فهرست اعضا با خطا روبه‌رو شد.':'Could not load the member directory.')+'</div>';return;}
    if(!data||!data.length){wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'پروفایل اعضا پس از تأیید انجمن نمایش داده می‌شود.':lang==='ru'?'Профили появятся после утверждения заявок.':'Approved member profiles will appear here.')+'</div>';return;}
    wrap.innerHTML=data.map(m=>{
      const displayName=localized(m,'display_name')||localized(m,'full_name'),headline=localized(m,'profile_headline'),specialty=localized(m,'specialty'),institution=localized(m,'institution'),city=localized(m,'city'),country=localized(m,'country'),bio=localized(m,'bio'),activities=localized(m,'activities'),publications=localized(m,'publications'),interests=localized(m,'research_interests'); const honorific=m.salutation?(lang==='fa'?(m.salutation==='ms'?'خانم ':'آقای '):lang==='ru'?(m.salutation==='ms'?'г-жа ':'г-н '):(m.salutation==='ms'?'Ms ':'Mr ')):''; const name=esc(honorific+(displayName||'RLS Member')),desc=[headline||specialty,institution,city,country].filter(Boolean).join(' · '),hay=[displayName,headline,specialty,institution,city,country,(labels[lang]||labels.en)[m.category],m.category].filter(Boolean).join(' ');
      const profileHref=memberProfileUrl(m.user_id);
      return '<article class="community-member community-member--'+esc(categoryMeta[m.category]?.tone||'other')+'" data-category="'+esc(m.category)+'" data-country="'+esc(m.country||'')+'" data-search="'+esc(hay)+'">'+profileLinks(m)+'<a class="community-member-link" href="'+profileHref+'">'+'<div class="community-avatar community-avatar-placeholder" data-avatar-placeholder="1" data-avatar-path="'+esc(m.avatar_path||'')+'">'+esc(initials(m.display_name))+'</div>'+'<h3>'+name+'</h3>'+categoryBadge(m.category)+'<p>'+esc(desc)+'</p><span class="community-member-joined">'+esc(lang==='fa'?'تاریخ عضویت: ':lang==='ru'?'Дата вступления: ':'Membership date: ')+esc(formatJoinDate(m.created_at))+'</span>'+'</a><a class="member-open-profile" href="'+profileHref+'">'+esc(lang==='fa'?'مشاهده پروفایل کامل':lang==='ru'?'Открыть профиль':'View full profile')+' ←</a>'+'<div class="member-qr-deferred" data-qr-user="'+esc(m.user_id)+'" data-qr-name="'+esc(displayName||'RLS Member')+'"></div>'+'</article>';
    }).join('');
    // Cards and text become visible immediately; portraits and QR codes are hydrated later.
    cards=[...wrap.querySelectorAll('.community-member')];
    const hydrateCard = card => {
      const avatar=card.querySelector('[data-avatar-placeholder="1"]');
      if(avatar && avatar.dataset.avatarPath){
        const img=document.createElement('img');
        img.className='community-avatar-image'; img.alt=card.querySelector('h3')?.textContent||'Member';
        img.width=76; img.height=76; img.loading='lazy'; img.decoding='async';
        img.src=avatarUrl(avatar.dataset.avatarPath,112);
        img.dataset.avatarPath=avatar.dataset.avatarPath;
        attachAvatarFallback(img,img.dataset.avatarPath);
        avatar.replaceWith(img);
      }
      const qr=card.querySelector('.member-qr-deferred');
      if(qr && !qr.dataset.ready){
        qr.dataset.ready='1';
        try{
          const holder=document.createElement('div');
          holder.innerHTML=profileQr(qr.dataset.qrUser,qr.dataset.qrName);
          qr.replaceWith(holder.firstElementChild || document.createTextNode(''));
          const qrImg=wrap.querySelectorAll('.member-card-qr img[data-fallback-src]');
          qrImg.forEach(img=>img.addEventListener('error',()=>{
            if(img.dataset.fallbackAttempted==='1')return;
            img.dataset.fallbackAttempted='1';
            if(img.dataset.fallbackSrc)img.src=img.dataset.fallbackSrc;
          },{once:true}));
        }catch(_){qr.remove();}
      }
    };
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting){hydrateCard(entry.target);observer.unobserve(entry.target);}});
      },{rootMargin:'300px'});
      cards.forEach(card=>observer.observe(card));
    }else{
      cards.slice(0,12).forEach(hydrateCard);
      let next=12;
      const hydrateNext=()=>{cards.slice(next,next+12).forEach(hydrateCard);next+=12;if(next<cards.length)setTimeout(hydrateNext,250);};
      if(next<cards.length)setTimeout(hydrateNext,250);
    }
    const emptyState=document.createElement('div');
    emptyState.className='community-empty member-filter-empty';
    emptyState.hidden=true;
    wrap.appendChild(emptyState);
    filter();
  }
  search?.addEventListener('input',()=>{currentPage=1;filter();});category?.addEventListener('change',()=>{currentPage=1;filter();});
  // Make the hero's "View members" action work even when a public profile
  // has hidden the directory sections or the URL contains ?member=...
  root.querySelector('.community-actions a[href="#member-directory"]')?.addEventListener('click', async event => {
    event.preventDefault();
    root.querySelectorAll('.community-section').forEach(section => { section.hidden = false; });
    root.querySelector('#member-public-page')?.remove();
    if (location.search) history.replaceState(null, '', location.pathname);
    await load(true);
    const directory = root.querySelector('#member-directory');
    directory?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (directory) directory.setAttribute('tabindex', '-1');
    directory?.focus({ preventScroll: true });
  });
  showAdminLink();
  db?.auth.onAuthStateChange(()=>{showAdminLink();});
  root.querySelectorAll('[data-category-filter]').forEach(b=>b.addEventListener('click',()=>{if(category)category.value=b.dataset.categoryFilter||'';currentPage=1;filter();}));
  root.querySelector('[data-clear-filters]')?.addEventListener('click',()=>{if(search)search.value='';if(category)category.value='';currentPage=1;filter();});

  // Keep portrait zoom local to the image: no lightbox, original-image navigation,
  // or full-screen overlay. Capture clicks before the surrounding profile link.
  document.addEventListener('click',event=>{
    const img=event.target.closest('.community-avatar-image,.member-public-avatar,.member-profile-avatar');
    if(!img||img.hidden||!img.getAttribute('src'))return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    img.classList.toggle('is-zoomed');
  },true);
  // Remove any stale viewer left by an older cached script.
  document.querySelectorAll('.avatar-lightbox,.image-lightbox,.community-image-overlay').forEach(node=>node.remove());
  load();
})();