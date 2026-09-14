document.querySelectorAll('nav a[href^="#"]').forEach(a=>{
  a.addEventListener('click',()=>document.body.classList.remove('nav-open'));
});