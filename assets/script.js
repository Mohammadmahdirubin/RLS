const initRLS=()=>{
  const path=location.pathname;
  const inEn=path.includes('/en/');
  const inRu=path.includes('/ru/');
  const lang=inEn?'en':inRu?'ru':'fa';
  const root=inEn||inRu?'../':'';
  const file=(path.split('/').pop()||'index.html').toLowerCase();
  const asset=name=>root+encodeURI(name);
  const header=document.querySelector('.site-header');
  const nav=document.querySelector('.main-nav');
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>0&&Math.min(screen.width,screen.height)<=900);
  if(mobile)document.documentElement.classList.add('rls-mobile-mode');

  const labels={
    fa:{home:'صفحه اصلی',about:'درباره نشریه',board:'هیئت تحریریه',policies:'سیاست‌ها',review:'داوری',ethics:'اخلاق نشر',plagiarism:'سرقت علمی',conflict:'تعارض منافع',copyright:'حقوق نشر',fees:'هزینه‌های انتشار',corrections:'اصلاح و ابطال',publication:'انتشار',articles:'مقالات',issues:'شماره‌ها',archive:'آرشیو',authors:'نویسندگان',guidelines:'راهنمای نویسندگان',authorInfo:'اطلاعات نویسندگان',metrics:'اطلاعات و آمار',contact:'تماس با نشریه',privacy:'حریم خصوصی',submit:'ارسال مقاله'},
    en:{home:'Home',about:'About',board:'Editorial Board',policies:'Policies',review:'Peer Review',ethics:'Publication Ethics',plagiarism:'Plagiarism',conflict:'Conflict of Interest',copyright:'Copyright',fees:'Publication Fees',corrections:'Corrections & Retractions',publication:'Publication',articles:'Articles',issues:'Issues',archive:'Archive',authors:'Authors',guidelines:'Author Guidelines',authorInfo:'Author Information',metrics:'Journal Information & Metrics',contact:'Contact',privacy:'Privacy',submit:'Submit a Manuscript'},
    ru:{home:'Главная',about:'О журнале',board:'Редколлегия',policies:'Политики',review:'Рецензирование',ethics:'Этика публикации',plagiarism:'Плагиат',conflict:'Конфликт интересов',copyright:'Авторские права',fees:'Публикационные сборы',corrections:'Исправления и ретракции',publication:'Публикация',articles:'Статьи',issues:'Выпуски',archive:'Архив',authors:'Авторам',guidelines:'Руководство для авторов',authorInfo:'Информация об авторах',metrics:'Информация и статистика',contact:'Контакты',privacy:'Конфиденциальность',submit:'Отправить рукопись'}
  }[lang];

  const p=name=>name;
  const active=name=>file===name?' class="active"':'';
  const link=(name,label)=>`<a href="${p(name)}"${active(name)}>${label}</a>`;
  const group=(label,items)=>{
    const open=items.some(([name])=>file===name)?' open':'';
    return `<details class="nav-group"${open}><summary>${label}</summary><div class="nav-submenu">${items.map(([name,text])=>link(name,text)).join('')}</div></details>`;
  };
  if(nav){
    nav.innerHTML=[
      link('index.html',labels.home),link('about.html',labels.about),link('editorial-board.html',labels.board),
      group(labels.policies,[['editorial-policy.html',labels.policies],['peer-review.html',labels.review],['publication-ethics.html',labels.ethics],['plagiarism.html',labels.plagiarism],['conflict-of-interest.html',labels.conflict],['copyright.html',labels.copyright],['publication-fees.html',labels.fees],['corrections-retractions.html',labels.corrections]]),
      group(labels.publication,[['articles.html',labels.articles],['issues.html',labels.issues],['archive.html',labels.archive]]),
      group(labels.authors,[['author-guidelines.html',labels.guidelines],['authors.html',labels.authorInfo],['submit.html',labels.submit]]),
      link('journal-metrics.html',labels.metrics),link('contact.html',labels.contact),link('privacy.html',labels.privacy)
    ].join('');
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('nav-open')));
    nav.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)nav.querySelectorAll('details').forEach(other=>{if(other!==d)other.removeAttribute('open');});}));
  }

  const langUrls=lang==='fa'?{fa:'index.html',en:'en/index.html',ru:'ru/index.html'}:lang==='en'?{fa:'../index.html',en:'index.html',ru:'../ru/index.html'}:{fa:'../index.html',en:'../en/index.html',ru:'index.html'};
  if(header){
    header.querySelectorAll('.rls-site-banner').forEach(el=>el.remove());
    const inner=header.querySelector('.header-inner');
    if(inner){
      inner.querySelectorAll('.brand').forEach(el=>el.remove());
      inner.querySelectorAll('.main-nav .language-switcher').forEach(el=>el.remove());
      let switcher=inner.querySelector('.header-language-switcher');
      if(!switcher){
        switcher=document.createElement('select');
        switcher.className='language-switcher header-language-switcher';
        inner.appendChild(switcher);
      }
      switcher.setAttribute('aria-label',lang==='fa'?'انتخاب زبان':lang==='en'?'Language':'Язык');
      switcher.innerHTML=`<option value="${langUrls.fa}">فارسی</option><option value="${langUrls.en}">English</option><option value="${langUrls.ru}">Русский</option>`;
      switcher.value=langUrls[lang];
      switcher.onchange=()=>{location.href=switcher.value;};
    }
    const banner=document.createElement('div');
    banner.className='rls-site-banner';
    const bannerLink=document.createElement('a');
    bannerLink.href=langUrls[lang];
    bannerLink.setAttribute('aria-label',lang==='ru'?'Исследования по русскому языку':lang==='en'?'Russian Language Studies':'دوفصلنامه مطالعات زبان روسی');
    const image=document.createElement('img');
    image.src=asset('Banner.png');
    image.alt=lang==='ru'?'Исследования по русскому языку':'Russian Language Studies Journal';
    image.loading='eager';
    image.decoding='async';
    bannerLink.appendChild(image);
    banner.appendChild(bannerLink);
    header.insertBefore(banner,header.firstChild);
  }


  // ===== Global visitor counter =====
  if(!document.getElementById('rls-visitor-counter')){
    const counter=document.createElement('aside');
    counter.id='rls-visitor-counter';
    counter.className='rls-visitor-counter';
    counter.setAttribute('aria-label',lang==='fa'?'شمارنده بازدید سایت':lang==='en'?'Website visitor counter':'Счётчик посещений сайта');
    counter.innerHTML=`
      <div class="rls-counter-title">${lang==='fa'?'بازدید سایت':lang==='en'?'Site Visits':'Посещения сайта'}</div>
      <div class="counterapi" style="min-height:44px"></div>
    `;
    document.body.appendChild(counter);
    if(!document.getElementById('counterapi-script')){
      const cs=document.createElement('script');
      cs.id='counterapi-script';
      cs.src='https://counterapi.com/c.js?ns=rlsj.ir';
      cs.async=true;
      document.head.appendChild(cs);
    }
  }

  const title=lang==='fa'?'دوفصلنامه مطالعات زبان روسی':lang==='en'?'Russian Language Studies':'Исследования по русскому языку';
  const pageNames={'index.html':title,'about.html':labels.about,'editorial-board.html':labels.board,'editorial-policy.html':labels.policies,'peer-review.html':labels.review,'publication-ethics.html':labels.ethics,'plagiarism.html':labels.plagiarism,'conflict-of-interest.html':labels.conflict,'copyright.html':labels.copyright,'publication-fees.html':labels.fees,'corrections-retractions.html':labels.corrections,'author-guidelines.html':labels.guidelines,'authors.html':labels.authorInfo,'articles.html':labels.articles,'issues.html':labels.issues,'archive.html':labels.archive,'journal-metrics.html':labels.metrics,'submit.html':labels.submit,'submission-success.html':lang==='fa'?'ارسال با موفقیت انجام شد':lang==='en'?'Submission received':'Отправка получена','contact.html':labels.contact,'privacy.html':labels.privacy,'article-sample.html':lang==='fa'?'نمونه مقاله':lang==='en'?'Article Sample':'Образец статьи'};
  if(pageNames[file])document.title=`${pageNames[file]} | ${title}`;

  document.querySelectorAll('.dark-section').forEach(el=>el.remove());
  document.querySelectorAll('body>footer').forEach((item,index)=>{if(index>0)item.remove();});
  const footer=document.querySelector('body>footer');
  const ministryLabel=lang==='fa'?'وزارت فرهنگ و ارشاد اسلامی':lang==='en'?'Ministry of Culture and Islamic Guidance':'Министерство культуры и исламской ориентации';
  const mediaLabel=lang==='fa'?'سامانه جامع رسانه‌های کشور':lang==='en'?'National Comprehensive Media System':'Национальная комплексная медиасистема';
  const footerJournalName=lang==='ru'?'Исследования по русскому языку':lang==='en'?'Russian Language Studies (RLS)':'دوفصلنامه مطالعات زبان روسی';
  if(footer){
    footer.innerHTML=`<div class="container rls-footer-inner">
      <div class="rls-footer-main">
        <div class="rls-footer-col"><strong>${footerJournalName}</strong><p>${lang==='ru'?'Научный журнал, выходящий два раза в год':lang==='en'?'Biannual journal':'نشریه علمی دو فصلنامه'}</p></div>
        <div class="rls-footer-col"><p>${lang==='ru'?'Главный редактор и издатель: Mohammadmahdi Rubin':lang==='en'?'Publisher & Managing Editor: Mohammadmahdi Rubin':'مدیرمسئول و صاحب‌امتیاز: محمدمهدی روبین'}</p><p>${lang==='ru'?'Лицензия Министерства № 94254':lang==='en'?'Ministry License No. 94254':'شماره مجوز وزارت فرهنگ و ارشاد اسلامی: 94254'}</p><p>${lang==='ru'?'Дата выдачи лицензии: 2023/07/24':lang==='en'?'License Date: 2023/07/24':'تاریخ مجوز: 1402/05/02'}</p></div>
        <div class="rls-footer-col"><p>${lang==='ru'?'ISSN: в процессе получения':lang==='en'?'ISSN: Pending':'ISSN: در دست اقدام'}</p><p class="rls-email-line">Email: <a href="mailto:mm.rubin@ut.ac.ir">mm.rubin@ut.ac.ir</a></p><p>© 2026 RLS</p></div>
      </div>
      <div class="rls-footer-official-logos">
        <div class="rls-footer-official-logo"><div class="rls-footer-logo-box"><img src="${asset('وزارت فرهنگ و ارشاد اسلامی.webp')}" alt="${ministryLabel}" loading="lazy"></div><span>${ministryLabel}</span></div>
        <div class="rls-footer-official-logo"><a class="rls-footer-logo-box" href="https://www.e-rasaneh.ir/" target="_blank" rel="noopener noreferrer"><img src="${asset('سامانه جامع مطبوعات کشور.jpg')}" alt="${mediaLabel}" loading="lazy"></a><span>${mediaLabel}</span></div>
      </div>
    </div>`;
  }

  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.bound){
    menu.dataset.bound='1';
    menu.addEventListener('click',e=>{e.preventDefault();document.documentElement.classList.toggle('nav-open');document.body.classList.toggle('nav-open');});
  }

  if(!document.getElementById('rls-runtime-style')){
    const style=document.createElement('style');
    style.id='rls-runtime-style';
    style.textContent=`
:root{--paper:#faf7ec!important}
html,body{background:#faf7ec!important}
.site-header{background:#faf7ec!important;box-shadow:none!important}
.rls-site-banner{background:#faf7ec!important}
.rls-site-banner a{display:block;text-decoration:none}
.rls-site-banner img{display:block}
.site-header .header-inner{position:relative;display:flex;align-items:center;gap:12px}
.site-header .main-nav{order:1;flex:1 1 auto;display:flex!important;align-items:center;justify-content:flex-end;gap:12px;font-size:13px;font-weight:700;min-width:0}
.site-header .header-language-switcher{order:2;flex:0 0 86px;width:86px;max-width:86px;height:36px;margin:0}
.site-header .menu-btn{order:3}
.main-nav>a,.nav-group>summary{padding:24px 0}
.nav-group{position:relative;display:block}
.nav-group>summary{list-style:none;cursor:pointer;color:var(--ink);white-space:nowrap}
.nav-group>summary::-webkit-details-marker{display:none}
.nav-group>summary:after{content:'⌄';font-size:10px;margin-inline-start:4px;color:var(--accent3)}
.nav-submenu{position:absolute;top:100%;min-width:210px;background:#faf7ec;border:1px solid var(--line);border-top:3px solid var(--accent3);box-shadow:0 12px 28px rgba(91,23,35,.12);padding:8px;z-index:200}
[dir="rtl"] .nav-submenu{right:0}[dir="ltr"] .nav-submenu{left:0}
.nav-submenu a{display:block!important;padding:9px 10px!important;white-space:normal!important}
.nav-submenu a.active{color:var(--accent)}.nav-submenu a.active:after{display:none!important}
footer .rls-footer-inner,footer .rls-footer-inner *{direction:ltr!important;text-align:left!important;box-sizing:border-box}
footer .rls-footer-inner{width:100%;max-width:1120px;margin:0 auto;padding:24px 20px 20px}
footer .rls-footer-main{display:grid;grid-template-columns:1.15fr 1.15fr 1.3fr;gap:24px;align-items:start}
footer .rls-footer-col{min-width:0}
footer .rls-footer-col strong{display:block;margin-bottom:8px}
footer .rls-footer-col p{margin:5px 0;line-height:1.65}
footer .rls-email-line,footer .rls-email-line a{white-space:nowrap}
footer .rls-footer-official-logos{display:flex;justify-content:center;align-items:flex-start;gap:48px;flex-wrap:wrap;margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.28)}
footer .rls-footer-official-logo{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:170px}
footer .rls-footer-logo-box{width:106px;height:74px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:8px;padding:6px;border:1px solid rgba(255,255,255,.55);box-shadow:0 4px 12px rgba(0,0,0,.12);text-decoration:none}
footer .rls-footer-logo-box img{display:block;width:auto;height:auto;max-width:94px;max-height:62px;object-fit:contain}
footer .rls-footer-official-logo span{font-size:11px;font-weight:700;line-height:1.5;text-align:center;color:inherit;max-width:190px}
@media(min-width:1101px){.rls-site-banner img{max-height:120px!important;width:100%!important;object-fit:contain!important}.header-inner{min-height:72px!important}.main-nav>a,.nav-group>summary{padding-top:20px!important;padding-bottom:20px!important}.main-nav a.active:after{bottom:14px!important}}
@media(max-width:1100px){.site-header .header-inner{min-height:62px}.site-header .main-nav{display:none!important}.site-header .header-language-switcher{order:2}.site-header .menu-btn{order:3}.nav-group{width:100%}.nav-group>summary{padding:9px 0;font-size:14px;white-space:normal}.nav-submenu{position:static;min-width:0;border:0;border-inline-start:3px solid var(--accent3);box-shadow:none;margin:0 0 6px;padding:3px 10px}.nav-submenu a{padding:8px 0!important}.nav-open .main-nav{display:flex!important;position:absolute;top:62px;left:0;right:0;width:100%;max-width:none;background:#faf7ec;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:0;padding:10px 24px;box-shadow:0 12px 25px rgba(91,23,35,.1);max-height:calc(100vh - 62px);overflow-y:auto}}
@media(min-width:1101px){.site-header .menu-btn{display:none!important}.site-header .main-nav{display:flex!important}}
@media(max-width:760px){footer .rls-footer-main{grid-template-columns:1fr 1fr}.rls-footer-official-logos{gap:24px}}
@media(max-width:560px){.site-header .header-inner{min-height:56px}.site-header .header-language-switcher{flex-basis:76px;width:76px;max-width:76px;height:34px;font-size:11px}.nav-open .main-nav{top:56px;max-height:calc(100vh - 56px);padding:10px 18px}footer .rls-footer-inner{padding:20px 14px 18px}footer .rls-footer-main{grid-template-columns:1fr;gap:12px}footer .rls-email-line,footer .rls-email-line a{white-space:normal}footer .rls-footer-official-logos{gap:20px;margin-top:16px;padding-top:14px}footer .rls-footer-official-logo{min-width:120px}footer .rls-footer-logo-box{width:92px;height:66px}footer .rls-footer-logo-box img{max-width:82px;max-height:54px}}
@media(orientation:landscape) and (max-width:900px){.site-header .header-inner{min-height:52px}.site-header .rls-site-banner img{height:78px!important;max-height:78px!important}.nav-open .main-nav{top:52px!important;max-height:calc(100vh - 52px)!important}}
`;
    document.head.appendChild(style);
  }

  // Final runtime normalization for all Russian HTML pages.
  if(inRu){
    const oldNames=['Исследования русского языка','Russian Language & Linguistics Studies','Russian Language and Linguistics Studies','Russian Language Linguistics Studies','RLLS'];
    const correctName='Исследования по русскому языку';
    document.title=document.title.replace(/Исследования русского языка|Russian Language & Linguistics Studies|Russian Language and Linguistics Studies|Russian Language Linguistics Studies|RLLS/g,correctName);
    document.querySelectorAll('meta[content],meta[property],meta[name]').forEach(el=>{
      if(el.content)el.content=el.content.replace(/Исследования русского языка|Russian Language & Linguistics Studies|Russian Language and Linguistics Studies|Russian Language Linguistics Studies|RLLS/g,correctName);
    });
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(node.parentElement && ['SCRIPT','STYLE'].includes(node.parentElement.tagName))return;
      let text=node.nodeValue;
      oldNames.forEach(name=>{text=text.split(name).join(correctName);});
      node.nodeValue=text;
    });
    document.querySelectorAll('[alt],[aria-label],[title]').forEach(el=>{
      ['alt','aria-label','title'].forEach(attr=>{
        const value=el.getAttribute(attr);
        if(value){let v=value;oldNames.forEach(name=>{v=v.split(name).join(correctName);});el.setAttribute(attr,v);}
      });
    });
  }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLS);else initRLS();
