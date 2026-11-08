(function () {
  const root = document.querySelector('[data-community]');
  if (!root) return;
  const cfg = window.RLS_SUPABASE_CONFIG;
  const db = cfg && window.supabase ? (window.RLS_SUPABASE_CLIENT || (window.RLS_SUPABASE_CLIENT = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))) : null;
  const search = root.querySelector('#member-search');
  const category = root.querySelector('#member-category');
  const country = root.querySelector('#member-country');
  const wrap = root.querySelector('.community-members');
  const lang = document.documentElement.lang || 'en';
  const labels = {
    fa: {student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر',translator:'مترجم',culture:'ادبیات و فرهنگ',honorary:'عضو افتخاری'},
    en: {student:'Student',graduate:'Graduate',faculty:'Faculty member',researcher:'Researcher',translator:'Translator',culture:'Literature and culture',honorary:'Honorary member'},
    ru: {student:'Студент',graduate:'Выпускник',faculty:'Преподаватель',researcher:'Исследователь',translator:'Переводчик',culture:'Литература и культура',honorary:'Почётный участник'}
  };
  const words = {
    fa:{back:'بازگشت به فهرست اعضا',headline:'معرفی کوتاه',bio:'زندگی‌نامه و سوابق',country:'کشور',city:'شهر',institution:'دانشگاه یا مؤسسه',degree:'مدرک تحصیلی',specialty:'حوزه تخصصی',memberships:'عضویت‌ها و وابستگی‌ها',activities:'فعالیت‌های علمی، آموزشی و فرهنگی',publications:'آثار، مقاله‌ها و ترجمه‌ها',research_interests:'علایق و زمینه‌های پژوهشی',languages:'زبان‌ها و مهارت‌ها',website_url:'وب‌سایت',orcid:'شناسه ORCID',email:'ایمیل',phone:'شماره تماس',empty:'این عضو هنوز اطلاعات تکمیلی عمومی ثبت نکرده است.'},
    en:{back:'Back to member directory',headline:'Short introduction',bio:'Biography and experience',country:'Country',city:'City',institution:'Institution',degree:'Degree',specialty:'Specialty',memberships:'Memberships and affiliations',activities:'Academic, educational and cultural activities',publications:'Publications, articles and translations',research_interests:'Research interests',languages:'Languages and skills',website_url:'Website',orcid:'ORCID iD',email:'Email',phone:'Phone',empty:'This member has not added further public profile information yet.'},
    ru:{back:'Вернуться к списку участников',headline:'Краткое представление',bio:'Биография и опыт',country:'Страна',city:'Город',institution:'Университет или организация',degree:'Образование',specialty:'Специализация',memberships:'Членство и объединения',activities:'Научная, образовательная и культурная деятельность',publications:'Публикации, статьи и переводы',research_interests:'Научные интересы',languages:'Языки и навыки',website_url:'Веб-сайт',orcid:'ORCID',email:'Электронная почта',phone:'Телефон',empty:'Участник пока не добавил дополнительную общедоступную информацию.'}
  };
  const w = words[lang] || words.en;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u=new URL(String(value||'')); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  const initials = name => String(name || 'RLS').trim().split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase();
  let cards = [];
  function filter() {
    const q=(search?.value||'').trim().toLocaleLowerCase(); let shown=0;
    cards.forEach(card=>{const ok=(!category?.value||category.value===card.dataset.category)&&(!country?.value||country.value===card.dataset.country)&&(!q||(card.dataset.search||'').toLocaleLowerCase().includes(q));card.hidden=!ok;if(ok)shown++;});
    const empty=wrap.querySelector('.community-empty'); if(empty) empty.hidden=shown>0;
    root.querySelectorAll('[data-category-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.categoryFilter===(category?.value||''))));
  }
  function avatarUrl(path){return path ? db.storage.from('rls-member-avatars').getPublicUrl(path).data.publicUrl : '';}
  async function showMember(id) {
    const {data:m,error}=await db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,degree,specialty,bio,avatar_path,website_url,orcid,profile_headline,memberships,activities,publications,research_interests,languages,email,phone,created_at').eq('user_id',id).maybeSingle();
    const detail=document.createElement('section'); detail.className='community-section container member-public-page'; detail.id='member-public-page';
    const directory=root.querySelector('#member-directory');
    directory?.before(detail);
    root.querySelectorAll('.community-section').forEach(section=>{if(section!==detail)section.hidden=true;});
    if(error||!m){detail.innerHTML='<p class="community-empty">'+esc(lang==='fa'?'پروفایل عمومی این عضو پیدا نشد یا در دسترس نیست.':lang==='ru'?'Публичный профиль не найден или недоступен.':'This public member profile was not found or is unavailable.')+'</p><a class="community-button primary" href="'+esc(location.pathname)+'">'+esc(w.back)+'</a>';return;}
    const name=esc(m.display_name||'RLS Member'),photo=avatarUrl(m.avatar_path);
    const fields=[['profile_headline',m.profile_headline],['bio',m.bio],['email',m.email],['phone',m.phone],['country',m.country],['city',m.city],['institution',m.institution],['degree',m.degree],['specialty',m.specialty],['memberships',m.memberships],['activities',m.activities],['publications',m.publications],['research_interests',m.research_interests],['languages',m.languages],['orcid',m.orcid]].filter(x=>String(x[1]||'').trim());
    const website=safeUrl(m.website_url);
    detail.innerHTML='<a class="community-button outline member-back" href="'+esc(location.pathname)+'">'+esc(w.back)+'</a><article class="member-public-card"><div class="member-public-heading">'+(photo?'<img class="member-public-avatar" src="'+esc(photo)+'" alt="'+name+'">':'<div class="member-public-avatar member-profile-avatar-fallback">'+esc(initials(m.display_name))+'</div>')+'<div><h1>'+name+'</h1><span class="member-category">'+esc((labels[lang]||labels.en)[m.category]||m.category||'')+'</span></div></div><div class="member-public-fields">'+fields.map(([key,value])=>'<section class="member-public-field"><h2>'+esc(w[key]||key)+'</h2><p>'+(key==='email'?'<a href="mailto:'+esc(value)+'">'+esc(value)+'</a>':key==='phone'?'<a href="tel:'+esc(String(value).replace(/[^0-9+]/g,''))+'">'+esc(value)+'</a>':esc(value).replace(/\\n/g,'<br>'))+'</p></section>').join('')+(website?'<section class="member-public-field"><h2>'+esc(w.website_url)+'</h2><p><a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(website).hostname)+'</a></p></section>':'')+'</div>'+(fields.length||website?'':'<p class="community-empty">'+esc(w.empty)+'</p>')+'</article>';
  }
  async function load() {
    if(!db){wrap.innerHTML='<div class="community-empty">Member directory is temporarily unavailable.</div>';return;}
    const memberId=new URLSearchParams(location.search).get('member');
    if(memberId){await showMember(memberId);return;}
    wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'در حال بارگذاری اعضا…':lang==='ru'?'Загрузка участников…':'Loading approved members…')+'</div>';
    const {data,error}=await db.from('rls_public_members').select('user_id,display_name,category,country,city,institution,degree,specialty,bio,avatar_path,website_url,orcid,profile_headline,memberships,activities,publications,research_interests,languages,email,phone').order('display_name',{ascending:true});
    if(error){wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'دریافت فهرست اعضا با خطا روبه‌رو شد.':'Could not load the member directory.')+'</div>';return;}
    if(!data||!data.length){wrap.innerHTML='<div class="community-empty">'+(lang==='fa'?'پروفایل اعضا پس از تأیید انجمن نمایش داده می‌شود.':lang==='ru'?'Профили появятся после утверждения заявок.':'Approved member profiles will appear here.')+'</div>';return;}
    wrap.innerHTML=data.map(m=>{
      const name=esc(m.display_name||'RLS Member'),desc=[m.profile_headline||m.specialty,m.institution,m.city,m.country].filter(Boolean).join(' · '),hay=[m.display_name,m.profile_headline,m.specialty,m.institution,m.city,m.country,m.bio,m.activities,m.publications].filter(Boolean).join(' '),photo=avatarUrl(m.avatar_path);
      return '<article class="community-member" data-category="'+esc(m.category)+'" data-country="'+esc(m.country||'')+'" data-search="'+esc(hay)+'"><a class="community-member-link" href="?member='+encodeURIComponent(m.user_id)+'">'+(photo?'<img class="community-avatar-image" src="'+esc(photo)+'" alt="'+name+'" loading="lazy">':'<div class="community-avatar">'+esc(initials(m.display_name))+'</div>')+'<h3>'+name+'</h3><span class="member-category">'+esc((labels[lang]||labels.en)[m.category]||m.category)+'</span><p>'+esc(desc)+'</p><span class="member-open-profile">'+esc(lang==='fa'?'مشاهده پروفایل کامل':lang==='ru'?'Открыть профиль':'View full profile')+' ←</span></a></article>';
    }).join('');
    cards=[...wrap.querySelectorAll('.community-member')];
    if(country){const current=country.value,all=lang==='fa'?'همه کشورها':lang==='ru'?'Все страны':'All countries',countries=[...new Set(data.map(m=>m.country).filter(Boolean))].sort();country.innerHTML='<option value="">'+all+'</option>'+countries.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');country.value=current;}
    filter();
  }
  search?.addEventListener('input',filter);category?.addEventListener('change',filter);country?.addEventListener('change',filter);
  root.querySelectorAll('[data-category-filter]').forEach(b=>b.addEventListener('click',()=>{if(category)category.value=b.dataset.categoryFilter||'';filter();}));
  root.querySelector('[data-clear-filters]')?.addEventListener('click',()=>{if(search)search.value='';if(category)category.value='';if(country)country.value='';filter();});
  load();
})();