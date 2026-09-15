const menu=document.querySelector('.menu-btn');
if(menu){menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));}
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('nav-open')));

const nav=document.querySelector('.main-nav');
const currentPath=location.pathname;
const currentFile=currentPath.split('/').pop() || 'index.html';
const assetPrefix=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../':'';

// Official RLS branding: the approved rectangular header logo is used on every page.
const brand=document.querySelector('.brand');
if(brand){
  brand.innerHTML=`<img class="brand-horizontal-logo" src="${assetPrefix}assets/rls-header.svg" alt="RLS — Russian Language Studies">`;
  brand.style.gap='0';
  const logo=brand.querySelector('.brand-horizontal-logo');
  logo.style.width='220px'; logo.style.height='62px'; logo.style.objectFit='contain'; logo.style.display='block';
  const compact=()=>{ if(window.innerWidth<=560){logo.style.width='155px';logo.style.height='48px';} else if(window.innerWidth<=900){logo.style.width='185px';logo.style.height='52px';} else {logo.style.width='220px';logo.style.height='62px';} };
  compact(); window.addEventListener('resize',compact);
}

// The approved circular emblem is shown prominently, but not oversized, on the homepage.
const heroLogo=document.querySelector('.hero .hero-logo');
if(heroLogo){
  heroLogo.style.width='190px';
  heroLogo.style.height='190px';
  heroLogo.style.maxWidth='62vw';
  heroLogo.style.objectFit='contain';
  heroLogo.style.margin='0 auto 18px';
}

if(!document.querySelector('link[rel="icon"]')){
  const icon=document.createElement('link');
  icon.rel='icon'; icon.type='image/svg+xml'; icon.href=assetPrefix+'assets/rls-favicon.svg';
  document.head.appendChild(icon);
}

if(nav && !nav.querySelector('.language-switcher')){
  const path=currentPath;
  const file=currentFile;
  let fa='index.html', en='en/index.html', ru='ru/index.html';
  if(path.includes('/en/')){ fa='../'+file; en=file; ru='../ru/'+file; }
  else if(path.includes('/ru/')){ fa='../'+file; en='../en/'+file; ru=file; }
  else { fa=file; en='en/'+file; ru='ru/'+file; }
  const select=document.createElement('select');
  select.className='language-switcher';
  select.setAttribute('aria-label','Language');
  select.innerHTML=`<option value="${fa}">فارسی</option><option value="${en}">English</option><option value="${ru}">Русский</option>`;
  if(path.includes('/en/')) select.value=en;
  else if(path.includes('/ru/')) select.value=ru;
  else select.value=fa;
  select.addEventListener('change',()=>{location.href=select.value;});
  nav.appendChild(select);
}