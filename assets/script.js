const initRLS=()=>{
  const currentPath=location.pathname;
  const header=document.querySelector('.site-header');

  if(header&&!header.querySelector('.rls-site-banner')){
    const banner=document.createElement('div');
    banner.className='rls-site-banner';
    const image=document.createElement('img');
    image.src=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../H.png':'H.png';
    image.alt='Russian Language Studies Journal';
    image.loading='eager';
    image.decoding='async';
    banner.appendChild(image);
    header.insertBefore(banner,header.firstChild);

    const brand=header.querySelector('.brand');
    if(brand)brand.style.display='none';
    const inner=header.querySelector('.header-inner');
    if(inner){inner.style.justifyContent='flex-end';inner.style.minHeight='76px';}

    if(!document.getElementById('rls-banner-style')){
      const style=document.createElement('style');
      style.id='rls-banner-style';
      style.textContent=`
        .site-header{padding:0!important;}
        .rls-site-banner{width:100%;background:#fff;line-height:0;overflow:hidden;}
        .rls-site-banner img{display:block;width:100%;height:auto;max-width:none;margin:0;padding:0;border:0;}
        .site-header .header-inner{width:100%;max-width:1200px;}
        @media(min-width:901px){
          .rls-site-banner img{height:220px;width:100%;object-fit:contain;}
        }
        @media(max-width:900px){
          .site-header .header-inner{min-height:70px!important;}
          .nav-open .main-nav{top:100%!important;}
        }
      `;
      document.head.appendChild(style);
    }
  }

  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.rlsBound){
    menu.dataset.rlsBound='1';
    menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));
  }

  document.querySelectorAll('.main-nav a').forEach(a=>{
    if(!a.dataset.rlsBound){
      a.dataset.rlsBound='1';
      a.addEventListener('click',()=>document.body.classList.remove('nav-open'));
    }
  });

  const nav=document.querySelector('.main-nav');
  if(nav&&!nav.querySelector('.language-switcher')){
    const file=currentPath.split('/').pop()||'index.html';
    let fa='index.html',en='en/index.html',ru='ru/index.html';
    if(currentPath.includes('/en/')){fa='../'+file;en=file;ru='../ru/'+file;}
    else if(currentPath.includes('/ru/')){fa='../'+file;en='../en/'+file;ru=file;}
    else{fa=file;en='en/'+file;ru='ru/'+file;}
    const select=document.createElement('select');
    select.className='language-switcher';
    select.setAttribute('aria-label','Language');
    select.innerHTML=`<option value="${fa}">فارسی</option><option value="${en}">English</option><option value="${ru}">Русский</option>`;
    select.value=currentPath.includes('/en/')?en:currentPath.includes('/ru/')?ru:fa;
    select.addEventListener('change',()=>location.href=select.value);
    nav.appendChild(select);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLS);else initRLS();