document.addEventListener("DOMContentLoaded",function(){
  var a=(window.RLS_ARTICLES||[]).filter(function(x){return x&&x.status==="published";});
  var extra=window.RLS_LEGACY_STATS||{rejected:2,pending:1};
  var received=a.length+(extra.rejected||0)+(extra.pending||0),accepted=a.length,rejected=extra.rejected||0;
  document.querySelectorAll(".metrics-svg").forEach(function(svg,index){
    if(index===0){
      var max=Math.max(6,received), base=300, top=40, height=260, xs=[300,395,490], vals=[received,accepted,rejected];
      [".chart-line",".chart-line-alt",".chart-line-green"].forEach(function(sel,i){
        var el=svg.querySelector(sel),pt=svg.querySelector([".chart-point",".chart-point-alt",".chart-point-green"][i]);
        if(!el||!pt)return; var y=base-(vals[i]/max)*height;
        el.setAttribute("y1",y);el.setAttribute("y2",base);pt.setAttribute("cy",y);
      });
      svg.querySelectorAll('text[x="70"]').forEach(function(el,i){var v=Math.round(max*i/4*10)/10;el.textContent=String(max-v);});
    }
    if(index===1){
      var resolved=accepted+rejected,rate=resolved?Math.round(accepted*100/resolved):0,y=275-(rate/100)*240;
      var line=svg.querySelector(".chart-line"),pt=svg.querySelector(".chart-point");
      if(line){line.setAttribute("y1",y);line.setAttribute("y2",275)}
      if(pt)pt.setAttribute("cy",y);
      svg.querySelectorAll("text").forEach(function(el){if(el.textContent.trim().match(/^\d+%$/))el.textContent=rate+"%";});
    }
  });
});