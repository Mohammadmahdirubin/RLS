(function () {
  'use strict';
  var canonical = document.querySelector('link[rel="canonical"]');
  var canonicalUrl = canonical ? canonical.href : location.href.split('#')[0];
  var lang = (document.documentElement.lang || 'en').toLowerCase();
  var title = document.querySelector('meta[name="citation_title"]')?.content || document.querySelector('h1')?.textContent.trim() || document.title;
  var author = document.querySelector('meta[name="author"]')?.content || 'Mohammadmahdi Rubin';
  var pubDate = document.querySelector('meta[name="citation_publication_date"]')?.content || '2026-09-17';
  var description = document.querySelector('meta[name="description"]')?.content || '';
  var articleType = lang === 'fa' ? 'مقاله پژوهشی' : lang === 'ru' ? 'Научная статья' : 'Research Article';
  var publisherName = lang === 'fa' ? 'دوفصلنامه مطالعات زبان روسی' : lang === 'ru' ? 'Исследования русского языка' : 'Russian Language Studies';
  function addMeta(attr, key, value) {
    if (!value || document.head.querySelector('meta[' + attr + '=\"' + key + '\"]')) return;
    var m = document.createElement('meta'); m.setAttribute(attr, key); m.content = value; document.head.appendChild(m);
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
  addMeta('name', 'citation_journal_title', publisherName);
  addMeta('name', 'citation_volume', '1');
  addMeta('name', 'citation_issue', '1');
  addMeta('name', 'citation_inbook_title', publisherName);

  var articleLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    'headline': title,
    'description': description,
    'url': canonicalUrl,
    'datePublished': pubDate,
    'inLanguage': lang,
    'author': {
      '@type': 'Person',
      'name': author,
      'url': 'https://orcid.org/0009-0004-8475-2804',
      'sameAs': ['https://orcid.org/0009-0004-8475-2804']
    },
    'isPartOf': {
      '@type': 'Periodical',
      'name': publisherName,
      'issn': undefined
    },
    'publisher': {
      '@type': 'Person',
      'name': 'Mohammadmahdi Rubin'
    },
    'articleSection': articleType,
    'copyrightHolder': {
      '@type': 'Organization',
      'name': publisherName
    }
  };
  delete articleLd.isPartOf.issn;
  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(articleLd);
  document.head.appendChild(script);

  var labels = lang === 'fa' ? ['صفحه اصلی', 'مقالات', 'مقاله'] : lang === 'ru' ? ['Главная', 'Статьи', 'Статья'] : ['Home', 'Articles', 'Article'];
  var bases = lang === 'fa' ? ['https://mohammadmahdirubin.github.io/RLS/', 'https://mohammadmahdirubin.github.io/RLS/articles.html'] : lang === 'ru' ? ['https://mohammadmahdirubin.github.io/RLS/ru/', 'https://mohammadmahdirubin.github.io/RLS/ru/articles.html'] : ['https://mohammadmahdirubin.github.io/RLS/en/', 'https://mohammadmahdirubin.github.io/RLS/en/articles.html'];
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
      {'@type':'ListItem','position':1,'name':labels[0],'item':bases[0]},
      {'@type':'ListItem','position':2,'name':labels[1],'item':bases[1]},
      {'@type':'ListItem','position':3,'name':labels[2],'item':canonicalUrl}
    ]
  };
  var b = document.createElement('script'); b.type='application/ld+json'; b.textContent=JSON.stringify(breadcrumb); document.head.appendChild(b);
})();
