const menu=document.querySelector('.menu-btn');
if(menu){menu.addEventListener('click',()=>document.body.classList.toggle('nav-open'));}
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('nav-open')));

// Multilingual navigation: Persian, English and Russian are available on every page.
const nav=document.querySelector('.main-nav');
if(nav && !nav.querySelector('.language-switcher')){
  const path=location.pathname;
  const file=path.split('/').pop() || 'index.html';
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