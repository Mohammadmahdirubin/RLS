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

  // Shared rendering helpers for directory cards and public member profiles.
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  function safeUrl(value) {
    const raw=String(value||'').trim();
    if(!raw)return '';
    try {
      const candidate=/^https?:\/\//i.test(raw)?raw:raw.startsWith('www.')?'https://'+raw:'https://'+raw;
      const url=new URL(candidate);
      return ['http:','https:'].includes(url.protocol)?url.href:'';
    } catch (_) { return ''; }
  }
  function orcidUrl(value) {
    const raw=String(value||'').trim();
    if(!raw)return '';
    const id=raw.replace(/^https?:\/\/(?:www\.)?orcid\.org\//i,'').replace(/^orcid\.org\//i,'').replace(/\/$/,'').trim();
    return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(id) ? 'https://orcid.org/'+id : '';
  }
  function formatJoinDate(value) {
    if(!value)return '—';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '—';
    const locale=lang==='fa'?'fa-IR':lang==='ru'?'ru-RU':'en-GB';
    try{return new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran'}).format(date);}
    catch(_){return date.toISOString().slice(0,10);}
  }
  function memberProfileUrl(id) {
    return 'https://rlsj.ir/community.html?member='+encodeURIComponent(String(id||''));
  }
  function profileLinks(m, detailed=false) {
    const links=[

      ['وبلاگ RussianLan',m.blog_url,'blogger','/assets/brand-icons/blogger.svg'],
      ['ORCID',orcidUrl(m.orcid),'orcid','/assets/brand-icons/orcid.svg'],
      ['ResearchGate',m.researchgate_url,'researchgate','/assets/brand-icons/researchgate.svg'],
      ['Google Scholar',m.google_scholar_url,'scholar','/assets/brand-icons/google-scholar.svg'],
      ['Instagram',m.instagram_url,'instagram','/assets/brand-icons/instagram.svg'],
      ['Telegram',m.telegram_url,'telegram','/assets/brand-icons/telegram.svg'],
      ['LinkedIn',m.linkedin_url,'linkedin','/assets/brand-icons/linkedin.svg'],
      ['X',m.x_url,'x','/assets/brand-icons/x.svg']
    ].map(([label,value,key,logo])=>[label,safeUrl(value),key,logo]).filter(([,url])=>url);
    if(!links.length)return '';
    if(detailed){
      return '<nav class="member-profile-links" aria-label="'+(lang==='fa'?'شناسه‌ها و شبکه‌های علمی عضو':'Academic identifiers and social links')+'">'+
        links.map(([label,url,key,logo])=>'<a class="member-profile-link member-profile-link--'+key+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(label)+'">'+
          '<img src="'+esc(logo)+'" alt="'+esc(label)+'" width="36" height="36" loading="eager" decoding="async">'+
          '<span>'+esc(label)+'</span></a>').join('')+'</nav>';
    }
    return '<nav class="member-card-links" aria-label="'+(lang==='fa'?'پیوندهای عضو':'Member links')+'">'+
      links.map(([label,url,key])=>'<a class="member-social-icon member-social-icon--'+key+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+esc(key==='website'?'وب':key==='researchgate'?'RG':key==='scholar'?'GS':key==='instagram'?'IG':key==='telegram'?'TG':key==='linkedin'?'in':key==='orcid'?'iD':'X')+'</a>').join('')+
      '</nav>';
  }
  function profileQr(id,name) {
    const url=memberProfileUrl(id);
    const encoded=encodeURIComponent(url);
    const primary='https://quickchart.io/qr?text='+encoded+'&size=160&margin=1&format=png';
    const fallback='https://api.qrserver.com/v1/create-qr-code/?size=160x160&format=png&data='+encoded;
    return '<div class="member-card-qr"><a class="member-card-qr-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc((lang==='fa'?'باز کردن پروفایل ':'Open profile ')+(name||''))+'"><img src="'+esc(primary)+'" data-fallback-src="'+esc(fallback)+'" alt="'+esc((lang==='fa'?'کد QR پروفایل ':'Profile QR for ')+(name||''))+'" width="76" height="76" loading="eager" decoding="async" referrerpolicy="no-referrer"></a></div>';
  }
  const approvedStatusLabel=lang==='fa'?'عضویت تأییدشده':lang==='ru'?'Членство подтверждено':'Approved membership';
  function formatMemberNumber(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) return '';
    const padded = String(number).padStart(6, '0');
    return lang === 'fa' ? padded.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : padded;
  }
  const localized = (m,key) => lang==='fa' ? (m[key] || '') : (m[key+'_'+lang] || '');
  const stripSalutation = value => String(value || '').replace(/^\s*(?:(?:آقای|خانم|جناب آقای|سرکار خانم)\s*|(?:Mr\\.?|Mrs\\.?|Ms\\.?|г-н|г-жа)\s*)/i,'').trim();
  const initials = name => String(name || 'RLS').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase();
  function degreeStars(m) {
    const value=String(m.degree||'').toLowerCase();
    if(/دکتری|دکترا|ph\.?d|doctor/.test(value)) return 3;
    if(/ارشد|کارشناسی ارشد|master|ma\b|msc\b/.test(value)) return 2;
    if(/کارشناسی|لیسانس|bachelor|ba\b|bsc\b/.test(value)) return 1;
    return 1;
  }
  function facultyLevel(m) {
    const value=[m.degree,m.specialty,m.profile_headline,m.bio].filter(Boolean).join(' ').toLowerCase();
    // Assistant professor, including former/previous assistant professor, and unknown ranks use level 3.
    if(/استادیار|assistant professor|formerly assistant professor|previously assistant professor/.test(value)) return 3;
    if(/دانشیار|associate professor/.test(value)) return 4;
    if(/استاد تمام|استاد دانشگاه|full professor|(^|\\s)professor(\\s|$)/.test(value)) return 5;
    if(/مربی|instructor|lecturer/.test(value)) return 1;
    return 3;
  }
  function memberEmblem(m, profile=false) {
    const cat=m.category||'';
    const faculty=cat==='faculty';
    const count=faculty?facultyLevel(m):degreeStars(m);
    const color=cat==='student'?'#c7d0df':'#d8a72d';
    const pale=cat==='student'?'#f3f6fb':'#fff0bd';
    let rays='';
    if(faculty){
      const total=24+count*12;
      for(let i=0;i<total;i++){
        const angle=(360/total)*i;
        const outer=count===1?47:count===3?50:count===4?53:56;
        const inner=44;
        rays+='<line x1="50" y1="'+inner+'" x2="50" y2="'+outer+'" transform="rotate('+angle+' 50 50)" stroke="#d9a52d" stroke-width="'+(count>=4?1.35:1.1)+'" stroke-linecap="round"/>';
      }
      return '<span class="member-emblem member-emblem--faculty member-emblem--level-'+count+'" title="'+esc((labels[lang]||labels.en).faculty)+'" aria-label="'+esc((labels[lang]||labels.en).faculty)+'"><svg class="member-emblem-svg" viewBox="0 0 100 100" role="img" aria-hidden="true">'+rays+'<circle cx="50" cy="50" r="43.5" fill="none" stroke="#d9a52d" stroke-width="2.2"/><circle cx="50" cy="50" r="40.8" fill="none" stroke="#f8df91" stroke-width="1"/><path d="M44 91 L42 99 L50 95 L58 99 L56 91 Z" fill="#d9a52d"/><path d="M50 91 L48 99 L50 97 L52 99 L50 91 Z" fill="#f8df91"/><circle cx="50" cy="87.5" r="6.5" fill="#f5cf62" stroke="#a97917" stroke-width="1.4"/><path d="M50 82.5 L51.5 86 L55 86.5 L52.5 89 L53 92 L50 90.5 L47 92 L47.5 89 L45 86.5 L48.5 86 Z" fill="#a97917"/></svg></span>';
    }
    let glyph='✦', title=(labels[lang]||labels.en)[cat]||cat;
    if(cat==='student'||cat==='graduate'){
      const stars=Array.from({length:count},(_,i)=>{const angle=(-90+(360/count)*i)*Math.PI/180;const x=50+46*Math.cos(angle);const y=50+46*Math.sin(angle);return '<text x="'+x.toFixed(2)+'" y="'+(y+4.5).toFixed(2)+'" text-anchor="middle" font-size="12" font-weight="700" stroke="'+pale+'" stroke-width="1.2" paint-order="stroke" fill="'+color+'">★</text>';}).join('');
      return '<span class="member-emblem member-emblem--stars member-emblem--'+(cat==='student'?'silver':'gold')+'" title="'+esc(title)+'" aria-label="'+esc(title)+'"><svg class="member-emblem-svg" viewBox="0 0 100 100" role="img" aria-hidden="true"><circle cx="50" cy="50" r="43.5" fill="none" stroke="'+color+'" stroke-width="2.5"/><circle cx="50" cy="50" r="40.5" fill="none" stroke="'+pale+'" stroke-width="1.2"/>'+stars+'</svg></span>';
    }
    if(cat==='researcher')glyph='⌕';
    else if(cat==='translator')glyph='✒';
    else if(cat==='culture')glyph='▤';
    else if(cat==='honorary')glyph='✹';
    return '<span class="member-emblem member-emblem--special member-emblem--'+esc(cat||'other')+'" title="'+esc(title)+'" aria-label="'+esc(title)+'"><svg class="member-emblem-svg" viewBox="0 0 100 100" role="img" aria-hidden="true"><circle cx="50" cy="50" r="43.5" fill="none" stroke="#d8a72d" stroke-width="2.5"/><circle cx="50" cy="50" r="40.5" fill="none" stroke="#f4d98a" stroke-width="1.2"/><path d="M44 91 L42 99 L50 95 L58 99 L56 91 Z" fill="#d8a72d"/><circle cx="50" cy="87.5" r="6.5" fill="#14284b" stroke="#d8a72d" stroke-width="1.8"/><text x="50" y="91" text-anchor="middle" font-size="12" fill="#f4d98a">'+glyph+'</text></svg></span>';
  }
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
  function avatarUrl(path){
    if(!path)return '';
    // Use the original public object URL: avoids paid image-transform endpoints
    // and lets the browser/CDN cache the uniquely named member image.
    return db.storage.from('rls-member-avatars').getPublicUrl(path).data.publicUrl;
  }
  function attachAvatarFallback(img,path){
    if(!img||!path)return;
    img.addEventListener('error',()=>{
      const fallback=document.createElement('div');
      fallback.className='community-avatar community-avatar-placeholder';
      fallback.textContent=initials(img.alt||'RLS Member');
      fallback.setAttribute('aria-label',img.alt||'Member photo unavailable');
      img.replaceWith(fallback);
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
    const {data:m,error}=await db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,degree,specialty,bio,avatar_path,website_url,blog_url,orcid,researchgate_url,google_scholar_url,instagram_url,telegram_url,linkedin_url,x_url,articles_count,books_count,created_at,profile_headline,memberships,activities,publications,research_interests,languages,phone,email,full_name_en,full_name_ru,display_name_en,display_name_ru,profile_headline_en,profile_headline_ru,country_en,country_ru,city_en,city_ru,institution_en,institution_ru,degree_en,degree_ru,specialty_en,specialty_ru,bio_en,bio_ru,memberships_en,memberships_ru,activities_en,activities_ru,publications_en,publications_ru,research_interests_en,research_interests_ru,languages_en,languages_ru,salutation,reviewed_at,member_number,membership_status').eq('user_id',id).maybeSingle();
    const detail=document.createElement('section'); detail.className='community-section container member-public-page'; detail.id='member-public-page';
    const directory=root.querySelector('#member-directory');
    directory?.before(detail);
    root.querySelectorAll('.community-section').forEach(section=>{if(section!==detail)section.hidden=true;});
    if(error||!m){markProfileUnavailable();detail.innerHTML='<p class="community-empty">'+esc(lang==='fa'?'پروفایل عمومی این عضو پیدا نشد یا در دسترس نیست.':lang==='ru'?'Публичный профиль не найден или недоступен.':'This public member profile was not found or is unavailable.')+'</p><a class="community-button primary" href="'+esc(location.pathname)+'">'+esc(w.back)+'</a>';return;}
    setProfileSeo(m,id);
    const name=esc(stripSalutation(localized(m,'display_name')||localized(m,'full_name'))||'RLS Member'),photo=avatarUrl(m.avatar_path,320);
    const fields=[['profile_headline',localized(m,'profile_headline')],['bio',localized(m,'bio')],['phone',m.phone],['email',m.email],['country',localized(m,'country')],['city',localized(m,'city')],['institution',localized(m,'institution')],['degree',localized(m,'degree')],['specialty',localized(m,'specialty')],['memberships',localized(m,'memberships')],['activities',localized(m,'activities')],['publications',localized(m,'publications')],['research_interests',localized(m,'research_interests')],['languages',localized(m,'languages')],['articles_count',m.articles_count===null||m.articles_count===undefined?'':String(m.articles_count)],['books_count',m.books_count===null||m.books_count===undefined?'':String(m.books_count)],['member_number',formatMemberNumber(m.member_number)],['membership_status',approvedStatusLabel]].filter(x=>String(x[1]||'').trim());
    const website=safeUrl(m.website_url);
    detail.innerHTML='<article class="member-public-card member-public-card--'+esc(categoryMeta[m.category]?.tone||'other')+'">'+profileLinks(m,true)+'<div class="member-public-heading">'+(photo?'<img class="member-public-avatar" src="'+esc(photo)+'" data-avatar-path="'+esc(m.avatar_path)+'" alt="'+name+'" loading="eager" fetchpriority="high" decoding="async" width="180" height="210">':'<div class="member-public-avatar member-profile-avatar-fallback">'+esc(initials(m.display_name))+'</div>')+'<div><h1>'+name+'</h1><span class="member-category">'+esc((labels[lang]||labels.en)[m.category]||m.category||'')+'</span><p class="member-public-join-date">'+esc(lang==='fa'?'تاریخ عضویت: ':lang==='ru'?'Дата вступления: ':'Membership date: ')+esc(formatJoinDate(m.created_at))+'</p>'+(m.member_number?'<p class="member-public-number">'+esc(lang==='fa'?'شماره عضویت: ':lang==='ru'?'Номер участника: ':'Membership number: ')+esc(formatMemberNumber(m.member_number))+'</p>':'')+'<p class="member-public-status">'+esc(lang==='fa'?'وضعیت عضویت: تأییدشده':lang==='ru'?'Статус членства: подтверждено':'Membership status: Approved')+'</p></div></div><div class="member-public-fields">'+fields.map(([key,value])=>'<section class="member-public-field"><h2>'+esc(w[key]||key)+'</h2><p>'+(key==='email'?'<a href="mailto:'+esc(value)+'">'+esc(value)+'</a>':key==='phone'?'<a href="tel:'+esc(String(value).replace(/[^0-9+]/g,''))+'">'+esc(value)+'</a>':key==='orcid'&&orcidUrl(value)?'<a href="'+esc(orcidUrl(value))+'" target="_blank" rel="noopener noreferrer">'+esc(value)+'</a>':esc(value).replace(/\\n/g,'<br>'))+'</p></section>').join('')+(website?'<section class="member-public-field"><h2>'+esc(w.website_url)+'</h2><p><a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(website).hostname)+'</a></p></section>':'')+'</div>'+(fields.length||website?'':'<p class="community-empty">'+esc(w.empty)+'</p>')+'</article>';
    const detailAvatar=detail.querySelector('img[data-avatar-path]');
    if(detailAvatar)attachAvatarFallback(detailAvatar,detailAvatar.dataset.avatarPath);
// Approved membership certificates are public and are generated only from
    // fields returned by rls_public_members (never private documents or account data). are public and are generated only from
    // fields returned by rls_public_members (never private documents or account data).
    if(window.RLSMembershipCertificate && m.membership_status === 'approved') {
      try {
        await window.RLSMembershipCertificate.render(detail,m);
      } catch(certificateError) {
        console.warn('Public membership certificate could not be rendered:', certificateError);
      }
    }
  }
  async function load(forceDirectory = false) {
    if(!db){wrap.innerHTML='<div class="community-empty">Member directory is temporarily unavailable.</div>';return;}
    const memberId=new URLSearchParams(location.search).get('member');
    if(memberId && !forceDirectory){await showMember(memberId);return;}
    wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'در حال بارگذاری اعضا…':lang==='ru'?'Загрузка участников…':'Loading approved members…')+'</div>';
    let result;
    let timeoutId;
    try {
      const request=db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,degree,specialty,profile_headline,avatar_path,created_at,display_name_en,display_name_ru,profile_headline,profile_headline_en,profile_headline_ru,specialty_en,specialty_ru,website_url,blog_url,orcid,researchgate_url,instagram_url,telegram_url,linkedin_url,x_url,salutation,member_number').order('display_name',{ascending:true}).limit(500);
      const timeout=new Promise(resolve=>{timeoutId=setTimeout(()=>resolve({data:null,error:{message:'timeout'}}),15000);});
      result=await Promise.race([request,timeout]);
    } catch(requestError) {
      result={data:null,error:requestError};
    } finally {
      if(timeoutId)clearTimeout(timeoutId);
    }
    const {data,error}=result||{};
    if(error){
      wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'دریافت فهرست اعضا با تأخیر یا خطا روبه‌رو شد. لطفاً دوباره تلاش کنید.':lang==='ru'?'Не удалось загрузить список участников. Попробуйте ещё раз.':'The member directory could not be loaded. Please try again.')+' <button type="button" class="community-search-btn" data-retry-members>'+(lang==='fa'?'تلاش دوباره':'Retry')+'</button></div>';
      wrap.querySelector('[data-retry-members]')?.addEventListener('click',()=>load(forceDirectory),{once:true});
      return;
    }
    if(!data||!data.length){wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'پروفایل اعضا پس از تأیید انجمن نمایش داده می‌شود.':lang==='ru'?'Профили появятся после утверждения заявок.':'Approved member profiles will appear here.')+'</div>';return;}
    wrap.innerHTML=data.map(m=>{
      const displayName=stripSalutation(localized(m,'display_name')||localized(m,'full_name')),headline=localized(m,'profile_headline'),specialty=localized(m,'specialty'),institution=localized(m,'institution'),city=localized(m,'city'),country=localized(m,'country'),bio=localized(m,'bio'),activities=localized(m,'activities'),publications=localized(m,'publications'),interests=localized(m,'research_interests'); const name=esc(displayName||'RLS Member'),desc=[headline||specialty,institution,city,country].filter(Boolean).join(' · '),hay=[displayName,headline,specialty,institution,city,country,(labels[lang]||labels.en)[m.category],m.category].filter(Boolean).join(' ');
      const profileHref=memberProfileUrl(m.user_id);
      return '<article class="community-member community-member--'+esc(categoryMeta[m.category]?.tone||'other')+'" data-member-id="'+esc(m.user_id)+'" data-category="'+esc(m.category)+'" data-country="'+esc(m.country||'')+'" data-search="'+esc(hay)+'">'+profileLinks(m)+'<a class="community-member-link" href="'+profileHref+'">'+'<div class="member-avatar-emblem member-avatar-emblem--card"><div class="community-avatar community-avatar-placeholder" data-avatar-placeholder="1" data-avatar-path="'+esc(m.avatar_path||'')+'">'+esc(initials(m.display_name))+'</div>'+memberEmblem(m,false)+'</div>'+'<h3>'+name+'</h3>'+categoryBadge(m.category)+'<p>'+esc(desc)+'</p><span class="community-member-joined">'+esc(lang==='fa'?'تاریخ عضویت: ':lang==='ru'?'Дата вступления: ':'Membership date: ')+esc(formatJoinDate(m.created_at))+'</span>'+'</a><a class="member-open-profile" href="'+profileHref+'">'+esc(lang==='fa'?'مشاهده پروفایل کامل':lang==='ru'?'Открыть профиль':'View full profile')+' ←</a>'+'<div class="member-qr-deferred" data-qr-user="'+esc(m.user_id)+'" data-qr-name="'+esc(displayName||'RLS Member')+'"></div>'+'</article>';
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
          const qrImg=holder.querySelector('img[data-fallback-src]') || card.querySelector('.member-card-qr img[data-fallback-src]');
          if(qrImg){
            qrImg.addEventListener('error',()=>{
              if(qrImg.dataset.fallbackAttempted==='1'){
                qrImg.closest('.member-card-qr')?.classList.add('member-card-qr--unavailable');
                return;
              }
              qrImg.dataset.fallbackAttempted='1';
              qrImg.src=qrImg.dataset.fallbackSrc;
            });
          }
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