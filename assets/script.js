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
    image.loading='eager';
    image.decoding='async';
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

  if(nav){nav.style.removeProperty('display');}

  /* Keep exactly one clean, consistent footer across all pages and languages. */
  const footers=document.querySelectorAll('body > footer');
  if(footers.length){
    footers.forEach((item,index)=>{if(index>0)item.remove();});
    const footer=document.querySelector('body > footer');
    if(footer){
      footer.innerHTML=`
        <div class="container footer-grid rls-unified-footer">
          <div>
            <strong dir="ltr">Russian Language Studies (RLS)</strong>
            <p>Biannual journal</p>
          </div>
          <div>
            <p>Publisher &amp; Managing Editor: Mohammadmahdi Rubin</p>
            <p>Ministry License No. 94254</p>
            <p>License Date: 2023/07/24</p>
          </div>
          <div>
            <p>ISSN: Pending</p>
            <p>Email: <a href="mailto:mm.rubin@ut.ac.ir">mm.rubin@ut.ac.ir</a></p>
            <p>© 2026 RLS</p>
          </div>
        </div>`;
    }
  }

  /* Remove the homepage identity/CTA block that duplicated footer information. */
  document.querySelectorAll('.dark-section').forEach(el=>el.remove());
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initRLS);
}else{
  initRLS();
}