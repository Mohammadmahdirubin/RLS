const initRLS=()=>{
  const path=location.pathname;
  const inEn=path.includes('/en/');
  const inRu=path.includes('/ru/');
  const lang=inEn?'en':inRu?'ru':'fa';
  const root=inEn||inRu?'../':'';
  const file=(path.split('/').pop()||'index.html').toLowerCase();
  const header=document.querySelector('.site-header');
  const nav=document.querySelector('.main-nav');
  const isRealMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>0&&Math.min(screen.width,screen.height)<=900);

  if(isRealMobile) document.documentElement.classList.add('rls-mobile-mode');

  const labels={
    fa:{home:'صفحه اصلی',about:'درباره نشریه',board:'هیئت تحریریه',policies:'سیاست‌ها',review:'داوری',ethics:'اخلاق نشر',plagiarism:'سرقت علمی',conflict:'تعارض منافع',copyright:'حقوق نشر',fees:'هزینه‌های انتشار',corrections:'اصلاح و ابطال',publication:'انتشار',articles:'مقالات',issues:'شماره‌ها',archive:'آرشیو',authors:'نویسندگان',guidelines:'راهنمای نویسندگان',authorInfo:'اطلاعات نویسندگان',metrics:'اطلاعات و آمار',contact:'تماس با نشریه',privacy:'حریم خصوصی',submit:'ارسال مقاله'},
    en:{home:'Home',about:'About',board:'Editorial Board',policies:'Policies',review:'Peer Review',ethics:'Publication Ethics',plagiarism:'Plagiarism',conflict:'Conflict of Interest',copyright:'Copyright',fees:'Publication Fees',corrections:'Corrections & Retractions',publication:'Publication',articles:'Articles',issues:'Issues',archive:'Archive',authors:'Authors',guidelines:'Author Guidelines',authorInfo:'Author Information',metrics:'Journal Information & Metrics',contact:'Contact',privacy:'Privacy',submit:'Submit a Manuscript'},
    ru:{home:'Главная',about:'О журнале',board:'Редколлегия',policies:'Политики',review:'Рецензирование',ethics:'Этика публикации',plagiarism:'Плагиат',conflict:'Конфликт интересов',copyright:'Авторские права',fees:'Публикационные сборы',corrections:'Исправления и ретракции',publication:'Публикация',articles:'Статьи',issues:'Выпуски',archive:'Архив',authors:'Авторам',guidelines:'Руководство для авторов',authorInfo:'Информация об авторах',metrics:'Информация и статистика',contact:'Контакты',privacy:'Конфиденциальность',submit:'Отправить рукопись'}
  }[lang];

  const p=(name)=>root+name;
  const active=(name)=>file===name?' class="active"':'';
  const link=(name,label)=>`<a href="${p(name)}"${active(name)}>${label}</a>`;
  const group=(label,items)=>{const open=items.some(([name])=>file===name)?' open':'';return `<details class="nav-group"${open}><summary>${label}</summary><div class="nav-submenu">${items.map(([name,text])=>link(name,text)).join('')}</div></details>`;};

  const menuHTML=[
    link('index.html',labels.home),link('about.html',labels.about),link('editorial-board.html',labels.board),
    group(labels.policies,[['editorial-policy.html',labels.policies],['peer-review.html',labels.review],['publication-ethics.html',labels.ethics],['plagiarism.html',labels.plagiarism],['conflict-of-interest.html',labels.conflict],['copyright.html',labels.copyright],['publication-fees.html',labels.fees],['corrections-retractions.html',labels.corrections]]),
    group(labels.publication,[['articles.html',labels.articles],['issues.html',labels.issues],['archive.html',labels.archive]]),
    group(labels.authors,[['author-guidelines.html',labels.guidelines],['authors.html',labels.authorInfo],['submit.html',labels.submit]]),
    link('journal-metrics.html',labels.metrics),link('contact.html',labels.contact),link('privacy.html',labels.privacy)
  ].join('');

  const langUrls=lang==='fa'?{fa:'index.html',en:'en/index.html',ru:'ru/index.html'}:lang==='en'?{fa:'../index.html',en:'index.html',ru:'../ru/index.html'}:{fa:'../index.html',en:'../en/index.html',ru:'index.html'};

  if(header){
    const inner=header.querySelector('.header-inner');
    let brand=header.querySelector('.brand');
    if(!brand&&inner){brand=document.createElement('a');brand.className='brand';inner.prepend(brand);}
    if(brand){
      brand.href='index.html';
      brand.innerHTML=lang==='fa'?'<span class="brand-mark">RLS</span><span><strong dir="ltr">Russian Language Studies</strong><small>دوفصلنامه مطالعات زبان روسی</small></span>':lang==='en'?'<span class="brand-mark">RLS</span><span><strong>Russian Language Studies</strong><small>Russian Language Studies · Biannual journal</small></span>':'<span class="brand-mark">RLS</span><span><strong>Исследования русского языка</strong><small>Russian Language Studies · Два выпуска в год</small></span>';
    }
    let switcher=inner?.querySelector('.header-language-switcher');
    if(!switcher&&inner){switcher=document.createElement('select');switcher.className='language-switcher header-language-switcher';switcher.setAttribute('aria-label',lang==='fa'?'انتخاب زبان':lang==='en'?'Language':'Язык');inner.insertBefore(switcher,inner.querySelector('.menu-btn')||nav||null);}
    if(switcher){switcher.innerHTML=`<option value="${langUrls.fa}">فارسی</option><option value="${langUrls.en}">English</option><option value="${langUrls.ru}">Русский</option>`;switcher.value=langUrls[lang];switcher.onchange=()=>{location.href=switcher.value;};}
  }

  if(nav){
    nav.innerHTML=menuHTML;
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('nav-open')));
    nav.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)nav.querySelectorAll('details').forEach(other=>{if(other!==d)other.removeAttribute('open');});}));
  }

  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.bound){menu.dataset.bound='1';menu.addEventListener('click',(e)=>{e.preventDefault();document.documentElement.classList.toggle('nav-open');document.body.classList.toggle('nav-open');});}

  document.querySelectorAll('body *').forEach(el=>{if(el.children.length===0&&el.textContent){el.textContent=el.textContent.replace(/Russian Language & Linguistics Studies/g,'Russian Language Studies').replace(/\bRLLS\b/g,'RLS');}});

  const title=lang==='fa'?'دوفصلنامه مطالعات زبان روسی':lang==='en'?'Russian Language Studies':'Исследования русского языка';
  const pageNames={'index.html':title,'about.html':labels.about,'editorial-board.html':labels.board,'editorial-policy.html':labels.policies,'peer-review.html':labels.review,'publication-ethics.html':labels.ethics,'plagiarism.html':labels.plagiarism,'conflict-of-interest.html':labels.conflict,'copyright.html':labels.copyright,'publication-fees.html':labels.fees,'corrections-retractions.html':labels.corrections,'author-guidelines.html':labels.guidelines,'authors.html':labels.authorInfo,'articles.html':labels.articles,'issues.html':labels.issues,'archive.html':labels.archive,'journal-metrics.html':labels.metrics,'submit.html':labels.submit,'submission-success.html':lang==='fa'?'ارسال با موفقیت انجام شد':lang==='en'?'Submission received':'Отправка получена','contact.html':labels.contact,'privacy.html':labels.privacy,'article-sample.html':lang==='fa'?'نمونه مقاله':lang==='en'?'Article Sample':'Образец статьи'};
  if(pageNames[file])document.title=`${pageNames[file]} | ${title}`;

  document.querySelectorAll('.dark-section').forEach(el=>el.remove());

  const footers=document.querySelectorAll('body>footer');
  footers.forEach((item,index)=>{if(index>0)item.remove();});
  const footer=document.querySelector('body>footer');
  if(footer){footer.innerHTML=`<div class="container footer-grid rls-unified-footer"><div><strong>Russian Language Studies (RLS)</strong><p>Biannual journal</p></div><div><p>Publisher &amp; Managing Editor: Mohammadmahdi Rubin</p><p>Ministry License No. 94254</p><p>License Date: 2023/07/24</p></div><div><p>ISSN: Pending</p><p>Email: <a href="mailto:mm.rubin@ut.ac.ir">mm.rubin@ut.ac.ir</a></p><p>© 2026 RLS</p></div></div>`;}

  if(!document.getElementById('rls-runtime-style')){
    const style=document.createElement('style');style.id='rls-runtime-style';style.textContent=`
      .site-header .header-inner{position:relative;gap:12px}
      .brand{flex:0 1 300px}
      .header-language-switcher{order:2;flex:0 0 92px;width:92px;max-width:92px}
      .site-header .menu-btn{order:3}
      .main-nav{order:4;display:flex!important;align-items:center;gap:12px;font-size:13px;font-weight:700;min-width:0;flex:1 1 auto;justify-content:flex-end}
      .main-nav>a,.nav-group>summary{padding:24px 0}
      .nav-group{position:relative;display:block}
      .nav-group>summary{list-style:none;cursor:pointer;color:var(--ink);white-space:nowrap}
      .nav-group>summary::-webkit-details-marker{display:none}
      .nav-group>summary:after{content:'⌄';font-size:10px;margin-inline-start:4px;color:var(--accent3)}
      .nav-submenu{position:absolute;top:100%;min-width:210px;background:#fffdfb;border:1px solid var(--line);border-top:3px solid var(--accent3);box-shadow:0 12px 28px rgba(91,23,35,.12);padding:8px;z-index:200}
      [dir="rtl"] .nav-submenu{right:0}
      [dir="ltr"] .nav-submenu{left:0}
      .nav-submenu a{display:block!important;padding:9px 10px!important;white-space:normal!important}
      .nav-submenu a.active{color:var(--accent)}
      .nav-submenu a.active:after{display:none!important}
      footer .rls-unified-footer,footer .rls-unified-footer *{direction:ltr!important;text-align:left!important}
      @media(max-width:900px){
        .site-header .header-inner{min-height:62px}
        .brand{flex:1 1 auto}
        .header-language-switcher{order:2}
        .site-header .menu-btn{order:3}
        .main-nav{order:4;display:none!important;flex:none;}
        .nav-group{width:100%}
        .nav-group>summary{padding:9px 0;font-size:14px;white-space:normal}
        .nav-submenu{position:static;min-width:0;border:0;border-inline-start:3px solid var(--accent3);box-shadow:none;margin:0 0 6px;padding:3px 10px}
        .nav-submenu a{padding:8px 0!important}
        .nav-open .main-nav{display:flex!important;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:0}
      }
      @media(min-width:901px){.menu-btn{display:none!important}.main-nav{display:flex!important}}
      @media(max-width:560px){.site-header .header-inner{min-height:56px}.header-language-switcher{min-width:76px;width:76px;max-width:76px;font-size:11px}.nav-group>summary{font-size:14px}}
      @media(orientation:landscape) and (max-width:900px){.site-header .header-inner{min-height:52px}.nav-group>summary{padding:7px 0}.rls-site-banner img{height:78px!important;max-height:78px!important;object-fit:contain!important}}
    `;document.head.appendChild(style);
  }

  if(header&&!header.querySelector('.rls-site-banner')){
    const banner=document.createElement('div');banner.className='rls-site-banner';const image=document.createElement('img');image.src=lang==='fa'?'H.png':'../H.png';image.alt='Russian Language Studies Journal';image.loading='eager';image.decoding='async';banner.appendChild(image);header.insertBefore(banner,header.firstChild);
  }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLS);else initRLS();