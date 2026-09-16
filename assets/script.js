const initRLS=()=>{
  const currentPath=location.pathname;
  const header=document.querySelector('.site-header');
  const isRealMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>0&&Math.min(screen.width,screen.height)<=900);
  if(isRealMobile) document.documentElement.classList.add('rls-mobile-mode');

  if(header&&!header.querySelector('.rls-site-banner')){
    const banner=document.createElement('div');
    banner.className='rls-site-banner';
    const image=document.createElement('img');
    image.src=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../H.png':'H.png';
    image.alt='Russian Language Studies Journal';
    banner.appendChild(image);
    header.insertBefore(banner,header.firstChild);
    const brand=header.querySelector('.brand');
    if(brand) brand.style.display='none';
  }

  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.bound){
    menu.dataset.bound='1';
    menu.onclick=()=>document.body.classList.toggle('nav-open');
  }

  const inner=header&&header.querySelector('.header-inner');
  if(inner&&!inner.querySelector('.header-language-switcher')){
    const select=document.createElement('select');
    select.className='language-switcher header-language-switcher';
    const file=currentPath.split('/').pop()||'index.html';
    let fa=file,en='en/'+file,ru='ru/'+file;
    if(currentPath.includes('/en/')){fa='../'+file;en=file;ru='../ru/'+file;}
    if(currentPath.includes('/ru/')){fa='../'+file;en='../en/'+file;ru=file;}
    select.innerHTML=`<option value="${fa}">فارسی</option><option value="${en}">English</option><option value="${ru}">Русский</option>`;
    select.onchange=()=>location.href=select.value;
    inner.insertBefore(select,menu||inner.firstChild);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRLS);else initRLS();