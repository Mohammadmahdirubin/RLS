window.RLS_ARTICLES = [
  {
    id: "ai-supported-multimodal-russian-language-learning",
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
    affiliation: {
      fa: "پژوهشگر مستقل، ایران",
      en: "Independent researcher, Iran",
      ru: "Независимый исследователь, Иран"
    },
    received: "2026/08/17",
    online: "2026/09/17",
    doi: "",
    abstract: {
      fa: "این مقاله یک چارچوب مفهومی برای یادگیری چندوجهی زبان روسی با پشتیبانی هوش مصنوعی پیشنهاد می‌کند و بر خودمختاری یادگیرنده، سواد انتقادی هوش مصنوعی، طراحی تکلیف چندوجهی و شایستگی ارتباطی میان‌فرهنگی تمرکز دارد.",
      en: "This article proposes a conceptual framework for AI-supported multimodal Russian language learning, focusing on learner autonomy, critical AI literacy, multimodal task design and intercultural communicative competence.",
      ru: "В статье предлагается концептуальная модель мультимодального обучения русскому языку с поддержкой искусственного интеллекта с акцентом на автономию учащегося, критическую ИИ-грамотность, мультимодальный дизайн заданий и межкультурную коммуникативную компетентность."
    },
    href: "article-ai-supported-multimodal-russian-language-learning.html"
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
    var receivedLabel = lang === "fa" ? "دریافت" : lang === "ru" ? "Получено" : "Received";
    var onlineLabel = lang === "fa" ? "انتشار آنلاین" : lang === "ru" ? "Онлайн-публикация" : "Online publication";
    var issueLabel = lang === "fa" ? "دوره ۱، شماره ۱" : lang === "ru" ? "Том 1, выпуск 1" : "Volume 1, Issue 1";
    var viewLabel = lang === "fa" ? "مشاهده مقاله" : lang === "ru" ? "Открыть статью" : "View article";
    var doiText = a.doi ? "DOI: " + a.doi : lang === "fa" ? "DOI: هنوز اختصاص نیافته" : lang === "ru" ? "DOI: ещё не присвоен" : "DOI: Not yet assigned";
    return '<article class="article-record" data-article-id="' + a.id + '">' +
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
