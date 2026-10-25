document.addEventListener("DOMContentLoaded", function () {
  var lang = document.documentElement.lang || "en";
  var received = 13, pending = 1, accepted = 7, rejected = 5;
  var resolved = accepted + rejected;
  var rate = Math.round(accepted * 100 / resolved);
  function faDigits(value) {
    return String(value).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[Number(d)]; });
  }
  function fmt(value) { return lang === "fa" ? faDigits(value) : String(value); }
  var values = { received: received, accepted: accepted, rejected: rejected, pending: pending, rate: rate };
  Object.keys(values).forEach(function (key) {
    document.querySelectorAll('[data-metric="' + key + '"]').forEach(function (el) {
      el.textContent = key === "rate" ? (lang === "fa" ? faDigits(rate) + "٪" : rate + "%") : fmt(values[key]);
    });
  });
  var notes = {
    fa: "از مجموع ۱۳ مقاله دریافتی، ۷ مقاله پذیرفته شده، ۱ مقاله در حال بررسی و ۵ مقاله رد شده است.",
    en: "Of 13 manuscripts received, 7 have been accepted, 1 is under review, and 5 have been rejected.",
    ru: "Из 13 полученных статей 7 приняты, 1 находится на рассмотрении и 5 отклонены."
  };
  document.querySelectorAll(".stat-note").forEach(function (el) {
    if (/مقاله دریافتی|manuscripts received|полученных статей|سال ۱۴۰۵ تاکنون|In 2026, 10 articles|В 2026 году получено 10 статей/.test(el.textContent)) el.textContent = notes[lang] || notes.en;
  });
  var svgs = document.querySelectorAll(".metrics-svg");
  if (svgs[0]) {
    var svg = svgs[0];
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 760 340");
    var ns = "http://www.w3.org/2000/svg";
    function node(tag, attrs, text) {
      var el = document.createElementNS(ns, tag);
      Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      if (text !== undefined) el.textContent = text;
      svg.appendChild(el); return el;
    }
    var max = 15, base = 250, top = 35, height = base - top;
    node("line",{x1:90,y1:top,x2:90,y2:base,class:"chart-axis"});
    node("line",{x1:90,y1:base,x2:700,y2:base,class:"chart-axis"});
    [0,3,6,9,12,15].forEach(function(v){
      var y = base - v / max * height;
      node("line",{x1:90,y1:y,x2:700,y2:y,class:"chart-gridline"});
      node("text",{x:70,y:y+5,class:"chart-label","text-anchor":"end"},fmt(v));
    });
    var labels = lang === "fa" ? ["دریافتی","در حال بررسی","ردشده","پذیرفته‌شده"] : lang === "ru" ? ["Получено","На рассмотрении","Отклонено","Принято"] : ["Received","Under review","Rejected","Accepted"];
    var data = [received,pending,rejected,accepted], xs = [200,330,460,590], classes = ["bar-blue","bar-gold","bar-red","bar-green"];
    data.forEach(function(v,i){
      var y = base - v / max * height;
      node("line",{x1:xs[i],y1:y,x2:xs[i],y2:base,class:"chart-bar "+classes[i]});
      node("text",{x:xs[i],y:Math.max(22,y-10),class:"chart-label","text-anchor":"middle"},fmt(v));
      node("text",{x:xs[i],y:base+27,class:"chart-label","text-anchor":"middle"},labels[i]);
    });
    node("text",{x:395,y:315,class:"chart-label","text-anchor":"middle"},lang==="fa"?"۱۴۰۵ — دوره ۱":lang==="ru"?"2026 — Том 1":"2026 — Volume 1");
  }
  if (svgs[1]) {
    var svg2=svgs[1], yRate=275-(rate/100)*240;
    var line=svg2.querySelector(".chart-line"), point=svg2.querySelector(".chart-point"), area=svg2.querySelector(".chart-area");
    if(line){line.setAttribute("y1",yRate);line.setAttribute("y2",275);}
    if(point)point.setAttribute("cy",yRate);
    if(area)area.setAttribute("d","M395 "+yRate+" L395 275 L395 "+yRate);
    svg2.querySelectorAll("text").forEach(function(el){
      if(/^\d+%$/.test(el.textContent.trim()) || /^[۰-۹]+٪$/.test(el.textContent.trim())) el.textContent=lang==="fa"?faDigits(rate)+"٪":rate+"%";
    });
  }
});