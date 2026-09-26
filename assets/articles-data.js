window.RLS_ARTICLES = [
  {
    id: "ai-supported-multimodal-russian-language-learning",
    number: 1,
    status: "published",
    issue: "1/1",
    type: {
      fa: "مقاله پژوهشی · مطالعه مفهومی",
      en: "Research Article · Conceptual Study",
      ru: "Научная статья · Концептуальное исследование"
    },
    title: {
      fa: "یادگیری چندوجهی زبان روسی با پشتیبانی هوش مصنوعی: چارچوبی مفهومی برای خودمختاری یادگیرنده، سواد انتقادی هوش مصنوعی و شایستگی میان‌فرهنگی",
      en: "Designing AI-Supported Multimodal Russian Language Learning: A Conceptual Framework for Learner Autonomy, Critical AI Literacy, and Intercultural Competence",
      ru: "Проектирование мультимодального обучения русскому языку с поддержкой искусственного интеллекта: концептуальная модель автономии учащегося, критической ИИ-грамотности и межкультурной компетентности"
    },
    author: "Mohammadmahdi Rubin",
    authorGiven: "Mohammadmahdi",
    authorFamily: "Rubin",
    orcid: "0009-0004-8475-2804",
    language: "en",
    affiliation: {
      fa: "دانشکده زبان‌ها و ادبیات خارجی، دانشگاه تهران، ایران",
      en: "Faculty of Languages and Foreign Literature, University of Tehran, Iran",
      ru: "Факультет языков и зарубежной литературы, Тегеранский университет, Иран"
    },
    received: "2026/08/17",
    online: "2026/09/17",
    doi: "",
    license: "",
    abstract: {
      fa: "این مقاله یک چارچوب مفهومی برای یادگیری چندوجهی زبان روسی با پشتیبانی هوش مصنوعی پیشنهاد می‌کند و بر خودمختاری یادگیرنده، سواد انتقادی هوش مصنوعی، طراحی تکلیف چندوجهی و شایستگی ارتباطی میان‌فرهنگی تمرکز دارد.",
      en: "This article proposes a conceptual framework for AI-supported multimodal Russian language learning, focusing on learner autonomy, critical AI literacy, multimodal task design and intercultural communicative competence.",
      ru: "В статье предлагается концептуальная модель мультимодального обучения русскому языку с поддержкой искусственного интеллекта с акцентом на автономию учащегося, критическую ИИ-грамотность, мультимодальный дизайн заданий и межкультурную коммуникативную компетентность."
    },
    href: "article-ai-supported-multimodal-russian-language-learning.html"
  },
  {
    id: "role-of-context-russian-verbal-aspect",
    number: 2,
    status: "published",
    issue: "1/1",
    type: {
      fa: "مقاله پژوهشی",
      en: "Research Article",
      ru: "Научная статья"
    },
    title: {
      fa: "نقش بافت در درک وجه فعلی در زبان روسی",
      en: "The Role of Context in Understanding Russian Verbal Aspect",
      ru: "Роль контекста в понимании глагольного вида в русском языке"
    },
    author: "Mohammadmahdi Rubin",
    authorGiven: "Mohammadmahdi",
    authorFamily: "Rubin",
    orcid: "0009-0004-8475-2804",
    language: "en",
    affiliation: {
      fa: "دانشکده زبان‌ها و ادبیات خارجی، دانشگاه تهران، ایران",
      en: "Faculty of Languages and Foreign Literature, University of Tehran, Iran",
      ru: "Факультет языков и зарубежной литературы, Тегеранский университет, Иран"
    },
    received: "2026/09/01",
    online: "2026/09/26",
    doi: "",
    license: "",
    abstract: {
      fa: "این مقاله نقش بافت زبانی و موقعیتی را در درک وجه فعلی (کامل/ناقص) در زبان روسی بررسی می‌کند و نشان می‌دهد که تفسیر وجه فعلی تنها به صرف فعل وابسته نیست، بلکه از تعامل معنایی با بافت جمله، گفتمان و موقعیت ارتباطی شکل می‌گیرد.",
      en: "This article examines the role of linguistic and situational context in understanding Russian verbal aspect (perfective/imperfective). It argues that aspectual interpretation is not determined by verb morphology alone, but emerges from the semantic interaction of the verb with sentence, discourse, and communicative context.",
      ru: "В статье рассматривается роль языкового и ситуативного контекста в понимании глагольного вида (совершенного/несовершенного) в русском языке. Утверждается, что видовая интерпретация определяется не только морфологией глагола, но и семантическим взаимодействием глагола с предложением, дискурсом и коммуникативной ситуацией."
    },
    href: "article-role-of-context-russian-verbal-aspect.html"
  }
];

window.RLS_ARTICLE_STATUS = function () {
  return (window.RLS_ARTICLES || []).filter(function (a) {
    return a.status === "published";
  });
};

window.renderRLSArticleList = function (containerId, lang) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var articles = window.RLS_ARTICLE_STATUS();
  if (!articles.length) {
    container.innerHTML = '<div class="notice">' +
      (lang === "fa" ? "هنوز مقاله‌ای منتشر نشده است." : lang === "ru" ? "Опубликованных статей пока нет." : "No articles have been published yet.") +
      '</div>';
    return;
  }
  container.innerHTML = articles.map(function (a) {
    var title = a.title[lang] || a.title.en;
    var type = a.type[lang] || a.type.en;
    var affiliation = a.affiliation[lang] || a.affiliation.en;
    var abstractText = a.abstract[lang] || a.abstract.en;
    var articleNumberLabel = lang === "fa" ? "مقاله" : lang === "ru" ? "Статья" : "Article";
    var articleNumber = a.number != null ? a.number : "";
    var receivedLabel = lang === "fa" ? "دریافت" : lang === "ru" ? "Получено" : "Received";
    var onlineLabel = lang === "fa" ? "انتشار آنلاین" : lang === "ru" ? "Онлайн-публикация" : "Online publication";
    var issueLabel = lang === "fa" ? "دوره ۱&nbsp;، شماره ۱" : lang === "ru" ? "Том 1, выпуск 1" : "Volume 1, Issue 1";
    var viewLabel = lang === "fa" ? "مشاهده مقاله" : lang === "ru" ? "Открыть статью" : "View article";
    var doiText = a.doi ? "DOI: " + a.doi : lang === "fa" ? "DOI: هنوز اختصاص نیافته" : lang === "ru" ? "DOI: ещё не присвоен" : "DOI: Not yet assigned";
    return '<article class="article-record" data-article-id="' + a.id + '">' +
      '<div class="article-number"><strong>' + articleNumberLabel + ' ' + articleNumber + '</strong></div>' +
      '<div class="article-type">' + type + '</div>' +
      '<h2>' + title + '</h2>' +
      '<p class="authors"><strong dir="ltr">' + a.author + '</strong> · ' + affiliation + '</p>' +
      '<div class="meta-grid">' +
      '<div><span>' + receivedLabel + '</span><strong>' + a.received + '</strong></div>' +
      '<div><span>' + onlineLabel + '</span><strong>' + a.online + '</strong></div>' +
      '<div><span>' + (lang === "fa" ? "شماره" : lang === "ru" ? "Выпуск" : "Issue") + '</span><strong>' + issueLabel + '</strong></div>' +
      '<div><span>DOI</span><strong>' + (a.doi || (lang === "fa" ? "تعیین نشده" : lang === "ru" ? "Не присвоен" : "Not assigned")) + '</strong></div>' +
      '</div>' +
      '<p>' + abstractText + '</p>' +
      '<div class="article-actions"><span class="status">' + doiText + '</span> <a class="button secondary" href="' + a.href + '">' + viewLabel + '</a></div>' +
      '</article>';
  }).join('');
};

window.updateRLSArticleCounters = function () {
  var count = window.RLS_ARTICLE_STATUS().length;
  document.querySelectorAll('[data-rls-article-count]').forEach(function (el) {
    el.textContent = count.toLocaleString();
  });
};

document.addEventListener('DOMContentLoaded', function () {
  window.updateRLSArticleCounters();
});
