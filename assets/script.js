const initRLS=()=>{
  const currentPath=location.pathname;
  const header=document.querySelector('.site-header');
  const isRealMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>0&&Math.min(screen.width,screen.height)<=900);

  if(isRealMobile){
    document.documentElement.classList.add('rls-mobile-mode');
  }

  if(header&&!header.querySelector('.rls-site-banner')){
    const banner=document.createElement('div');
    banner.className='rls-site-banner';
    const image=document.createElement('img');
    image.src=currentPath.includes('/en/')||currentPath.includes('/ru/')?'../H.png':'H.png';
    image.alt='Russian Language Studies Journal';
    banner.appendChild(image);
    header.insertBefore(banner,header.firstChild);
  }

  const menu=document.querySelector('.menu-btn');
  const nav=document.querySelector('.main-nav');

  if(menu&&!menu.dataset.bound){
    menu.dataset.bound='1';
    menu.addEventListener('click',(e)=>{
      e.preventDefault();
      document.documentElement.classList.toggle('nav-open');
      document.body.classList.toggle('nav-open');
    });
  }

  if(nav){
    nav.style.removeProperty('display');
  }
};

if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',initRLS);
}else{
 initRLS();
}