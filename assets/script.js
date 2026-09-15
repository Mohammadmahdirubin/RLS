const initRLS=()=>{
  const currentPath=location.pathname;
  const menu=document.querySelector('.menu-btn');
  if(menu&&!menu.dataset.rlsBound){menu.dataset.rlsBound='1';menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));}
  document.querySelectorAll('.main-nav a').forEach(a=>{if(!a.dataset.rlsBound){a.dataset.rlsBound='1';a.addEventListener('click',()=>document.body.classList.remove('nav-open'));}});
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