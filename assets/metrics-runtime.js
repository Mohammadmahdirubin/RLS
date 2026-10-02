document.addEventListener("DOMContentLoaded", function () {
  var articles = (window.RLS_ARTICLES || []).filter(function (x) {
    return x && x.status === "published";
  });
  var extra = window.RLS_LEGACY_STATS || { rejected: 2, pending: 1 };
  var received = articles.length + (extra.rejected || 0) + (extra.pending || 0);
  var accepted = articles.length;
  var rejected = extra.rejected || 0;
  var resolved = accepted + rejected;
  var rate = resolved ? Math.round(accepted * 100 / resolved) : 0;

  function faDigits(value) {
    return String(value).replace(/\d/g, function (d) {
      return "۰۱۲۳۴۵۶۷۸۹"[Number(d)];
    });
  }

  function labelValue(value, lang) {
    var n = Math.round(value * 10) / 10;
    var s = Number.isInteger(n) ? String(n) : String(n);
    return lang === "fa" ? faDigits(s) : s;
  }

  var lang = document.documentElement.lang || "en";

  document.querySelectorAll(".metrics-svg").forEach(function (svg, index) {
    if (index === 0) {
      var max = Math.max(6, received);
      var base = 300;
      var top = 40;
      var height = base - top;
      var vals = [received, accepted, rejected];
      var lineSelectors = [".chart-line", ".chart-line-alt", ".chart-line-green"];
      var pointSelectors = [".chart-point", ".chart-point-alt", ".chart-point-green"];

      vals.forEach(function (value, i) {
        var y = base - (value / max) * height;
        var line = svg.querySelector(lineSelectors[i]);
        var point = svg.querySelector(pointSelectors[i]);
        if (line) {
          line.setAttribute("y1", y);
          line.setAttribute("y2", base);
        }
        if (point) point.setAttribute("cy", y);

        var area = svg.querySelector(".chart-area");
        if (i === 0 && area) {
          area.setAttribute("d", "M395 " + y + " L395 " + base + " L395 " + y);
        }
      });

      svg.querySelectorAll('text[x="70"]').forEach(function (el) {
        var y = Number(el.getAttribute("y"));
        var value = (base - Math.max(top, Math.min(base, y - 5))) / height * max;
        el.textContent = labelValue(value, lang);
      });
    }

    if (index === 1) {
      var yRate = 275 - (rate / 100) * 240;
      var line = svg.querySelector(".chart-line");
      var point = svg.querySelector(".chart-point");
      var area = svg.querySelector(".chart-area");

      if (line) {
        line.setAttribute("y1", yRate);
        line.setAttribute("y2", 275);
      }
      if (point) point.setAttribute("cy", yRate);
      if (area) area.setAttribute("d", "M395 " + yRate + " L395 275 L395 " + yRate);

      svg.querySelectorAll("text").forEach(function (el) {
        if (/^\d+%$/.test(el.textContent.trim()) || /^[۰-۹]+٪$/.test(el.textContent.trim())) {
          el.textContent = lang === "fa" ? faDigits(rate) + "٪" : rate + "%";
        }
      });
    }
  });
});
