(function(){
 const tabs=[...document.querySelectorAll('[data-admin-section]')];
 const panels={members:document.getElementById('admin-members-section'),events:document.getElementById('admin-events-panel')};
 if(!tabs.length)return;
 function activate(name){
  tabs.forEach(tab=>{
   const active=tab.dataset.adminSection===name;
   tab.classList.toggle('active',active);
   tab.setAttribute('aria-expanded',String(active));
  });
  Object.entries(panels).forEach(([key,panel])=>{if(panel)panel.hidden=key!==name;});
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.adminSection)));
 activate('members');
})();