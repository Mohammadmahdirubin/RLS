(function(){
  'use strict';
  var section=document.getElementById('association-council');
  if(!section||section.dataset.zoomReady==='1')return;
  section.dataset.zoomReady='1';
  var lang=(document.documentElement.lang||'fa').toLowerCase();
  var labels={
    fa:'بزرگ‌نمایی کارت به اندازه ۳۰ درصد',
    en:'Enlarge the board card by 30 percent',
    ru:'Увеличить карточку на 30 процентов'
  };
  var cards=Array.prototype.slice.call(section.querySelectorAll('.council-profile-card'));
  cards.forEach(function(card,index){
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
    card.setAttribute('aria-label',labels[lang]||labels.en);
    card.setAttribute('aria-pressed','false');
    card.addEventListener('click',function(event){
      if(event.target.closest('a'))return;
      var wasOpen=card.classList.contains('is-zoomed');
      cards.forEach(function(other){
        other.classList.remove('is-zoomed');
        other.setAttribute('aria-pressed','false');
      });
      if(!wasOpen){
        card.classList.add('is-zoomed');
        card.setAttribute('aria-pressed','true');
      }
    });
    card.addEventListener('keydown',function(event){
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        card.click();
      }else if(event.key==='Escape'){
        card.classList.remove('is-zoomed');
        card.setAttribute('aria-pressed','false');
        card.blur();
      }
    });
  });
  document.addEventListener('click',function(event){
    if(section.contains(event.target))return;
    cards.forEach(function(card){
      card.classList.remove('is-zoomed');
      card.setAttribute('aria-pressed','false');
    });
  });
})();