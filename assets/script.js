const initRLSBranding=()=>{
  const currentPath=location.pathname;
  const assetPrefix=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../':'';
  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.rlsBound){menu.dataset.rlsBound='1';menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));}
  document.querySelectorAll('.main-nav a').forEach(a=>{if(!a.dataset.rlsBound){a.dataset.rlsBound='1';a.addEventListener('click',()=>document.body.classList.remove('nav-open'));}});
  const brand=document.querySelector('.brand');
  if(brand){
    brand.innerHTML=`<img class="brand-horizontal-logo" src="${assetPrefix}assets/rls-header.svg?v=20260924" alt="RLS — Russian Language Studies" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="brand-fallback"><strong dir="ltr">Russian Language Studies</strong><small>دوفصلنامه مطالعات زبان روسی</small></span>`;
    brand.style.gap='.55rem';
    const logo=brand.querySelector('.brand-horizontal-logo');
    const fallback=brand.querySelector('.brand-fallback');
    fallback.style.display='none';fallback.style.flexDirection='column';
    const compact=()=>{if(window.innerWidth<=560){logo.style.width='145px';logo.style.height='38px';}else if(window.innerWidth<=900){logo.style.width='175px';logo.style.height='40px';}else{logo.style.width='210px';logo.style.height='43px';}};
    compact();window.addEventListener('resize',compact);
  }
  const heroLogo=document.querySelector('.hero .hero-logo');
  if(heroLogo){heroLogo.src=assetPrefix+'assets/rls-approved-main.svg?v=20260924';heroLogo.style.width='190px';heroLogo.style.height='190px';heroLogo.style.maxWidth='62vw';heroLogo.style.objectFit='contain';heroLogo.style.margin='0 auto 18px';}
  let icon=document.querySelector('link[rel="icon"]');
  if(!icon){icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';document.head.appendChild(icon);}
  icon.href=assetPrefix+'assets/rls-approved-main.svg?v=20260924';
  const nav=document.querySelector('.main-nav');
  if(nav&&!nav.querySelector('.language-switcher')){
    const file=currentPath.split('/').pop()||'index.html';let fa='index.html',en='en/index.html',ru='ru/index.html';
    if(currentPath.includes('/en/')){fa='../'+file;en=file;ru='../ru/'+file;}else if(currentPath.includes('/ru/')){fa='../'+file;en='../en/'+file;ru=file;}else{fa=file;en='en/'+file;ru='ru/'+file;}
    const select=document.createElement('select');select.className='language-switcher';select.setAttribute('aria-label','Language');select.innerHTML=`<option value="${fa}">فارسی</option><option value="${en}">English</option><option value="${ru}">Русский</option>`;select.value=currentPath.includes('/en/')?en:currentPath.includes('/ru/')?ru:fa;select.addEventListener('change',()=>location.href=select.value);nav.appendChild(select);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLSBranding);else initRLSBranding();