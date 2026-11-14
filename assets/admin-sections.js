(function(){
 const tabs=[...document.querySelectorAll('#admin-dashboard [data-admin-section]')];
 const panels={overview:document.getElementById('admin-overview-panel'),members:document.getElementById('admin-members-section'),history:document.getElementById('admin-history-panel'),'email-archive':document.getElementById('admin-email-archive-panel'),events:document.getElementById('admin-events-panel'),broadcast:document.getElementById('admin-broadcast-panel')};
 if(!tabs.length)return;
 function activate(name){
  tabs.forEach(tab=>{const active=tab.dataset.adminSection===name;tab.classList.toggle('active',active);tab.setAttribute('aria-expanded',String(active));});
  Object.entries(panels).forEach(([key,panel])=>{if(!panel)return;const active=key===name;panel.hidden=!active;panel.style.display=active?'block':'none';panel.setAttribute('aria-hidden',String(!active));});
  window.dispatchEvent(new CustomEvent('rls-admin-section-change',{detail:{section:name}}));
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.adminSection)));
 activate('overview');
})();