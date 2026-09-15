const initRLS=()=>{
  const currentPath=location.pathname;
  const header=document.querySelector('.site-header');

  if(header&&!header.querySelector('.rls-site-banner')){
    const banner=document.createElement('div');
    banner.className='rls-site-banner';
    const image=document.createElement('img');
    image.src=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../H.png':'H.png';
    image.alt='Russian Language Studies Journal';
    banner.appendChild(image);
    header.insertBefore(banner,header.firstChild);

    const brand=header.querySelector('.brand');
    if(brand)brand.style.display='none';

    const inner=header.querySelector('.header-inner');
    if(inner){inner.style.justifyContent='space-between';inner.style.minHeight='76px';}

    const style=document.createElement('style');
    style.textContent=`
      .rls-site-banner{width:100%;overflow:hidden;line-height:0;background:#fff}
      .rls-site-banner img{display:block;width:100%;height:auto;object-fit:contain}
      @media(max-width:900px){
        .rls-site-banner img{max-height:120px}
        .header-language-switcher{display:block!important;position:static!important}
        .nav-open .main-nav .language-switcher{display:none!important}
      }
      @media(max-width:560px){.rls-site-banner img{max-height:100px}}
      @media(orientation:landscape) and (max-width:900px){
        .rls-site-banner img{height:85px;max-height:85px}
        .header-inner{min-height:55px!important}
      }
    `;
    document.head.appendChild(style);
  }

  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.bound){
    menu.dataset.bound='1';
    menu.onclick=()=>document.body.classList.toggle('nav-open');
  }

  const nav=document.querySelector('.main-nav');
  const inner=header&&header.querySelector('.header-inner');
  let select=document.querySelector('.header-language-switcher');

  if(!select){
    const file=currentPath.split('/').pop()||'index.html';
    let fa=file,en='en/'+file,ru='ru/'+file;
    if(currentPath.includes('/en/')){fa='../'+file;en=file;ru='../ru/'+file;}
    if(currentPath.includes('/ru/')){fa='../'+file;en='../en/'+file;ru=file;}
    select=document.createElement('select');
    select.className='language-switcher header-language-switcher';
    select.innerHTML=`<option value="${fa}">فارسی</option><option value="${en}">English</option><option value="${ru}">Русский</option>`;
    select.value=currentPath.includes('/en/')?en:currentPath.includes('/ru/')?ru:fa;
    select.onchange=()=>location.href=select.value;
  }

  if(inner&&!inner.contains(select)){
    inner.insertBefore(select,menu||nav);
  }

  if(nav){
    const navLang=nav.querySelector('.header-language-switcher');
    if(navLang)navLang.remove();
  }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLS);else initRLS();