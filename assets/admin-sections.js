(function(){
 const tabs=[...document.querySelectorAll('#admin-dashboard [data-admin-section]')];
 const panels={
  members:document.getElementById('admin-members-section'),
  events:document.getElementById('admin-events-panel'),
  broadcast:document.getElementById('admin-broadcast-panel')
 };
 if(!tabs.length)return;
 function activate(name){
  tabs.forEach(tab=>{
   const active=tab.dataset.adminSection===name;
   tab.classList.toggle('active',active);
   tab.setAttribute('aria-expanded',String(active));
  });
  Object.entries(panels).forEach(([key,panel])=>{
   if(!panel)return;
   const active=key===name;
   panel.hidden=!active;
   panel.style.display=active?'block':'none';
   panel.setAttribute('aria-hidden',String(!active));
  });
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.adminSection)));
 activate('members');
})();