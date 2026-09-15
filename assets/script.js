const menu=document.querySelector('.menu-btn');
if(menu){menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));}
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('nav-open')));

// Multilingual navigation: Persian, English and Russian are available on every page.
const nav=document.querySelector('.main-nav');
const currentPath=location.pathname;
const currentFile=currentPath.split('/').pop() || 'index.html';
const assetPrefix=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../':'';

// Official RLS visual identity: logo in the site header and favicon on every page.
const brandMark=document.querySelector('.brand-mark');
if(brandMark){
  brandMark.textContent='';
  const logo=document.createElement('img');
  logo.src=assetPrefix+'assets/rls-logo.svg';
  logo.alt='RLS — Russian Language Studies';
  logo.className='brand-logo';
  brandMark.appendChild(logo);
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