document.addEventListener("DOMContentLoaded", function () {
  var articles = (window.RLS_ARTICLES || []).filter(function (x) {
    return x && x.status === "published";
  });
  var extra = window.RLS_LEGACY_STATS || { rejected: 2, pending: 4 };
  var received = articles.length + (extra.rejected || 0) + (extra.pending || 0);
  var accepted = articles.length;
  var rejected = extra.rejected || 0;
  var resolved = accepted + rejected;
  var rate = resolved ? Math.round(accepted * 100 / resolved) : 0;

  var lang = document.documentElement.lang || "en";
  var metricValues = { received: received, accepted: accepted, rejected: rejected, pending: extra.pending || 0, rate: rate };
  Object.keys(metricValues).forEach(function (key) {
    document.querySelectorAll("[data-metric=\"" + key + "\"]").forEach(function (el) {
      var value = metricValues[key];
      el.textContent = key === "rate" ? (lang === "fa" ? faDigits(value) + "٪" : value + "%") : labelValue(value, lang);
    });
  });

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

  document.querySelectorAll(".metrics-svg").forEach(function (svg, index) {
    if (index === 0) {
      var max = Math.max(9, received);
      var base = 245;
      var top = 35;
      var height = base - top;
      var vals = [received, accepted, rejected];
      var barSelectors = [".bar-blue", ".bar-green", ".bar-red"];

      vals.forEach(function (value, i) {
        var y = base - (value / max) * height;
        var bar = svg.querySelector(barSelectors[i]);
        if (bar) {
          bar.setAttribute("y1", y);
          bar.setAttribute("y2", base);
        }
      });

      var axisLabels = Array.from(svg.querySelectorAll('text[x="70"]')).sort(function (a, b) {
        return Number(a.getAttribute("y")) - Number(b.getAttribute("y"));
      });
      var axisValues = [max, max * 2 / 3, max / 3, 0];
      axisLabels.forEach(function (el, i) {
        if (i < axisValues.length) el.textContent = labelValue(axisValues[i], lang);
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
