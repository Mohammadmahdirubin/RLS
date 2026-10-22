(function () {
  'use strict';
  var canonicalEl = document.querySelector('link[rel="canonical"]');
  var canonicalUrl = canonicalEl ? canonicalEl.href : location.href.split('#')[0];
  var lang = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
  var title = document.querySelector('meta[property="og:title"]')?.content || document.querySelector('h1')?.textContent.trim() || document.title;
  var description = document.querySelector('meta[name="description"]')?.content || '';
  var publisherName = lang === 'fa' ? 'دوفصلنامه مطالعات زبان روسی' : lang === 'ru' ? 'Исследования по русскому языку' : 'Russian Language Studies';
  function addMeta(attr, key, value) {
    if (!value) return;
    var selector = 'meta[' + attr + '="' + key + '"]';
    var m = document.head.querySelector(selector);
    if (m) { if (!m.content) m.content = value; return; }
    m = document.createElement('meta'); m.setAttribute(attr, key); m.content = value; document.head.appendChild(m);
  }
  addMeta('property', 'og:type', 'article');
  addMeta('property', 'og:title', title);
  addMeta('property', 'og:description', description);
  addMeta('property', 'og:url', canonicalUrl);
  addMeta('property', 'og:site_name', publisherName);
  addMeta('property', 'og:locale', lang === 'fa' ? 'fa_IR' : lang === 'ru' ? 'ru_RU' : 'en_US');
  addMeta('name', 'twitter:card', 'summary');
  addMeta('name', 'twitter:title', title);
  addMeta('name', 'twitter:description', description);
  addMeta('name', 'citation_journal_title', 'Russian Language Studies');
  addMeta('name', 'citation_volume', '1');
  addMeta('name', 'citation_issue', '1');
  addMeta('name', 'citation_inbook_title', 'Russian Language Studies');

  // Article pages already contain their authoritative ScholarlyArticle JSON-LD.
  // Avoid adding duplicate schema or assigning the editor's ORCID to other authors.
  var labels = lang === 'fa' ? ['صفحه اصلی', 'مقالات', 'مقاله'] : lang === 'ru' ? ['Главная', 'Статьи', 'Статья'] : ['Home', 'Articles', 'Article'];
  var bases = lang === 'fa' ? ['https://rlsj.ir/', 'https://rlsj.ir/articles.html'] : lang === 'ru' ? ['https://rlsj.ir/ru/', 'https://rlsj.ir/ru/articles.html'] : ['https://rlsj.ir/en/', 'https://rlsj.ir/en/articles.html'];
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
      {'@type':'ListItem','position':1,'name':labels[0],'item':bases[0]},
      {'@type':'ListItem','position':2,'name':labels[1],'item':bases[1]},
      {'@type':'ListItem','position':3,'name':labels[2],'item':canonicalUrl}
    ]
  };
  var b = document.createElement('script'); b.type='application/ld+json'; b.textContent=JSON.stringify(breadcrumb); document.head.appendChild(b);
})();
