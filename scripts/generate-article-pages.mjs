import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "articles");
const langs = ["fa", "en", "ru"];

const page = (lang, a) => lang === "fa"
  ? `article-${a.slug || a.id}.html`
  : `${lang}/article-${a.slug || a.id}.html`;
const url = (lang, a) => `https://rlsj.ir/${page(lang, a)}`;
const rel = lang => lang === "fa" ? "" : "../";

const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const date = (value, lang) => new Intl.DateTimeFormat(
  lang === "fa" ? "fa-IR" : lang === "ru" ? "ru-RU" : "en-GB",
  { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
).format(new Date(String(value).replace(/\//g, "-") + "T00:00:00Z"));

const journalName = lang =>
  lang === "fa" ? "دوفصلنامه مطالعات زبان روسی" :
  lang === "ru" ? "Исследования по русскому языку" :
  "Russian Language Studies";

const langName = lang =>
  lang === "fa" ? "فارسی" : lang === "ru" ? "русский" : "English";

const labels = {
  fa: {
    abstract: "چکیده", keywords: "کلیدواژه‌ها", history: "تاریخچه انتشار",
    cite: "نحوه استناد", files: "فایل‌های مقاله", full: "دانلود متن کامل:",
    download: "دانلود PDF", view: "مشاهده PDF", type: "نوع مقاله",
    language: "زبان", volume: "دوره / شماره", pages: "صفحات",
    received: "دریافت", accepted: "پذیرش", online: "انتشار آنلاین",
    doi: "تعیین نشده", info: "اطلاعات مقاله", author: "نویسنده"
  },
  en: {
    abstract: "Abstract", keywords: "Keywords", history: "Publication history",
    cite: "How to cite", files: "Article files", full: "Full text:",
    download: "Download PDF", view: "View PDF", type: "Article type",
    language: "Language", volume: "Volume / Issue", pages: "Pages",
    received: "Received", accepted: "Accepted", online: "Published online",
    doi: "Pending", info: "Article information", author: "Author"
  },
  ru: {
    abstract: "Аннотация", keywords: "Ключевые слова", history: "История публикации",
    cite: "Как цитировать", files: "Файлы статьи", full: "Полный текст:",
    download: "Скачать PDF", view: "Открыть PDF", type: "Тип статьи",
    language: "Язык", volume: "Том / Выпуск", pages: "Страницы",
    received: "Получено", accepted: "Принято", online: "Опубликовано онлайн",
    doi: "не присвоен", info: "Сведения о статье", author: "Автор"
  }
};

const all = fs.readdirSync(dir)
  .filter(file => file.endsWith(".json") && !file.startsWith("_"))
  .map(file => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
const published = all.filter(article => article.status === "published");

fs.writeFileSync(
  path.join(root, "assets", "articles-data.js"),
  "window.RLS_ARTICLES = " + JSON.stringify(all, null, 2) + ";\n"
);

function buildHead(lang, a, template) {
  const r = rel(lang), u = url(lang, a), t = a.title[lang], j = journalName(lang);
  const description = String(a.abstract[lang] || "").slice(0, 250);
  const citationTitle = a.title.en || t;
  const ld = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": u + "#article",
    headline: t,
    description: a.abstract[lang],
    datePublished: String(a.online).replace(/\//g, "-"),
    dateModified: String(a.online).replace(/\//g, "-"),
    author: [{
      "@type": "Person",
      name: a.authorNames?.[lang] || a.author,
      ...(a.orcid ? { sameAs: "https://orcid.org/" + a.orcid } : {})
    }],
    inLanguage: lang,
    isPartOf: { "@type": "Periodical", name: j, url: "https://rlsj.ir/" },
    pagination: a.firstPage + "-" + a.lastPage,
    url: u,
    mainEntityOfPage: { "@type": "WebPage", "@id": u },
    encoding: { "@type": "MediaObject", contentUrl: "https://rlsj.ir/" + a.pdf, encodingFormat: "application/pdf" }
  };
  const jsonLd = JSON.stringify(ld, null, 2);
  const css = lang === "fa"
    ? '<link rel="stylesheet" href="assets/style.css?v=20261002article">\n<link rel="stylesheet" href="assets/article-header-footer.css?v=20261002article">'
    : '<link rel="stylesheet" href="../assets/style.css?v=20261002article">\n<link rel="stylesheet" href="../assets/article-header-footer.css?v=20261002article">';

  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t)} | ${j}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(a.author)}">
<meta name="keywords" content="${esc(a.keywords[lang])}">
<meta name="robots" content="index,follow">
<meta name="citation_title" content="${esc(citationTitle)}">
<meta name="citation_author" content="${esc(a.author)}">
<meta name="citation_publication_date" content="${String(a.online).replace(/\//g, "-")}">
<meta name="citation_firstpage" content="${a.firstPage}">
<meta name="citation_lastpage" content="${a.lastPage}">
<meta name="citation_journal_title" content="Russian Language Studies">
<meta name="citation_volume" content="${a.volume}">
<meta name="citation_issue" content="${a.issueNumber}">
<meta name="citation_language" content="${lang}">
<meta name="citation_fulltext_world_readable" content="true">
<meta name="citation_pdf_url" content="https://rlsj.ir/${a.pdf}">
<link rel="canonical" href="${u}">
<link rel="alternate" hreflang="fa" href="${url("fa", a)}">
<link rel="alternate" hreflang="en" href="${url("en", a)}">
<link rel="alternate" hreflang="ru" href="${url("ru", a)}">
<link rel="alternate" hreflang="x-default" href="${url("fa", a)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${j}">
<meta property="og:title" content="${esc(t)} | ${j}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${u}">
<meta property="og:locale" content="${lang === "fa" ? "fa_IR" : lang === "ru" ? "ru_RU" : "en_US"}">
<meta property="og:locale:alternate" content="fa_IR">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:locale:alternate" content="ru_RU">
<meta property="article:published_time" content="${String(a.online).replace(/\//g, "-")}">
<meta property="article:author" content="${esc(a.author)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(t)} | ${j}">
<meta name="twitter:description" content="${esc(description)}">
${css}
<script type="application/ld+json">
${jsonLd}
</script>
</head>`;
}

function replaceFirst(text, pattern, replacement, label) {
  const out = text.replace(pattern, replacement);
  if (out === text) throw new Error("Template fragment not found: " + label);
  return out;
}

function buildMain(lang, a, templateMain) {
  const r = rel(lang), l = labels[lang];
  const title = a.title[lang], name = a.authorNames?.[lang] || a.author;
  const pdf = r + a.pdf;
  const year = String(a.online).slice(0, 4);
  const citation = `${esc(a.authorFamily || a.author)}, ${esc(a.authorGiven || "")} (${year}). “${esc(a.title.en || title)}.” <em>Russian Language Studies</em>, ${a.volume}(${a.issueNumber}), ${a.firstPage}–${a.lastPage}. <a href="${url(lang,a)}">${url(lang,a)}</a>. DOI: ${esc(a.doi || "Pending")}.`;
  const heroMeta = lang === "fa"
    ? `دوره ${a.volume} · شماره ${a.issueNumber} · مقاله ${a.number} · صص ${a.firstPage}–${a.lastPage}`
    : lang === "ru"
      ? `Том ${a.volume} · Выпуск ${a.issueNumber} · Статья ${a.number} · С. ${a.firstPage}–${a.lastPage}`
      : `Volume ${a.volume} · Issue ${a.issueNumber} · Article ${a.number} · pp. ${a.firstPage}–${a.lastPage}`;
  const heroSecondary = lang === "fa"
    ? (a.title.en || title)
    : lang === "ru"
      ? (a.title.fa || title)
      : `Online publication: ${date(a.online, "en")}`;
  const emailLabel = lang === "fa" ? "ایمیل" : "Email";
  const byline = `<div class="article-byline">
<strong${lang === "fa" || lang === "en" || lang === "ru" ? " dir=\"ltr\"" : ""}>${esc(name)}</strong><br>
<span>${esc(a.affiliation[lang])}</span>${a.orcid ? `<br><span>ORCID: <a dir="ltr" href="https://orcid.org/${esc(a.orcid)}" target="_blank" rel="noopener noreferrer">${esc(a.orcid)}</a></span>` : ""}${a.email ? `<br><span>${emailLabel}: <a dir="ltr" href="mailto:${esc(a.email)}">${esc(a.email)}</a></span>` : ""}
</div>`;
  const notice = `<div class="notice" style="margin:18px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
<strong>${l.full}</strong>
<a class="button primary"${lang === "fa" || lang === "en" || lang === "ru" ? ' dir="ltr"' : ""} href="${pdf}" download target="_blank" rel="noopener">${l.download}</a>
<a class="button secondary"${lang === "fa" || lang === "en" || lang === "ru" ? ' dir="ltr"' : ""} href="${pdf}" target="_blank" rel="noopener">${l.view}</a>
</div>`;
  let out = templateMain;
  out = replaceFirst(out, /(<div class="eyebrow">)[\\s\\S]*?(<\\/div>)/, `$1${heroMeta}$2`, "hero metadata");
  out = replaceFirst(out, /(<h1(?: [^>]*)?>)[\\s\\S]*?(<\\/h1>)/, `$1${esc(title)}$2`, "hero title");
  out = replaceFirst(out, /(<section class="page-hero">[\\s\\S]*?<h1(?: [^>]*)?>[\\s\\S]*?<\\/h1>\\s*<p(?: [^>]*)?>)[\\s\\S]*?(<\\/p>)/, `$1${esc(heroSecondary)}$2`, "hero secondary");
  out = replaceFirst(out, /<div class="article-byline">[\\s\\S]*?<\\/div>/, byline, "byline");
  out = replaceFirst(out, /<div class="notice" style="margin:18px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;">[\\s\\S]*?<\\/div>/, notice, "PDF notice");

  const abstractLabel = esc(l.abstract);
  const keywordsLabel = esc(l.keywords);
  const abstractRe = new RegExp(`<h2>${abstractLabel}<\\/h2>[\\s\\S]*?<p>([\\s\\S]*?)<\\/p>`);
  out = replaceFirst(out, abstractRe, `<h2>${abstractLabel}</h2>\\n<p>${esc(a.abstract[lang])}</p>`, "abstract");
  const keywordsRe = new RegExp(`<h2>${keywordsLabel}<\\/h2>[\\s\\S]*?<p>([\\s\\S]*?)<\\/p>`);
  out = replaceFirst(out, keywordsRe, `<h2>${keywordsLabel}</h2>\\n<p>${esc(a.keywords[lang])}</p>`, "keywords");

  if (lang === "fa") {
    out = replaceFirst(out, /(<h2 dir="ltr">Article Title \(English\)<\\/h2>\\s*<p dir="ltr">)[\\s\\S]*?(<\\/p>)/,
      `$1${esc(a.title.en || title)}$2`, "Persian English title");
    out = replaceFirst(out, /(<h2 dir="ltr">English Abstract<\\/h2>\\s*<p dir="ltr">)[\\s\\S]*?(<\\/p>)/,
      `$1${esc(a.abstract.en || a.abstract[lang])}$2`, "Persian English abstract");
  }

  const historyHeading = esc(l.history);
  const historyRe = new RegExp(`<h2>${historyHeading}<\\/h2>[\\s\\S]*?<div class="table-wrap">[\\s\\S]*?<\\/table>\\s*<\\/div>`);
  const historyRows = `<h2>${historyHeading}</h2>
<div class="table-wrap"><table class="academic-table"${lang === "fa" || lang === "ru" ? ' dir="rtl"' : ""}>
<tr><th>${lang === "ru" ? "Этап" : lang === "en" ? "Stage" : "مرحله"}</th><th>${lang === "en" ? "Date / status" : lang === "ru" ? "Дата" : "تاریخ"}</th></tr>
<tr><td>${l.received}</td><td>${date(a.received,lang)}</td></tr>
<tr><td>${l.accepted}</td><td>${date(a.accepted,lang)}</td></tr>
<tr><td>${l.online}</td><td>${date(a.online,lang)}</td></tr>
</table></div>`;
  out = replaceFirst(out, historyRe, historyRows, "publication history");

  const citeHeading = esc(l.cite);
  const citeRe = new RegExp(`<h2>${citeHeading}<\\/h2>\\s*<div class="citation-box">[\\s\\S]*?<\\/div>`);
  out = replaceFirst(out, citeRe, `<h2>${citeHeading}</h2>\\n<div class="citation-box">${citation}</div>`, "citation");

  const filesHeading = esc(l.files);
  const filesRe = new RegExp(`<h2>${filesHeading}<\\/h2>[\\s\\S]*?(?=<\\/article>)`);
  const filesBlock = `<h2>${filesHeading}</h2>
<p><a class="button primary" href="${pdf}" download target="_blank" rel="noopener">${l.download}</a></p>
`;
  out = replaceFirst(out, filesRe, filesBlock, "article files");

  const sidebarInfo = /<div class="side-card">\\s*<strong>[^<]+<\\/strong>[\\s\\S]*?<\\/div>(?=\\s*<div class="side-card">|\\s*<\\/aside>)/;
  const infoCard = `<div class="side-card">
<strong>${l.info}</strong>
<p>${l.type}<br><b>${esc(a.type[lang])}</b></p>
<p>${l.language}<br><b>${esc(langName(a.language || lang))}</b></p>
<p>${l.volume}<br><b>${a.volume} / ${a.issueNumber}</b></p>
<p>${l.pages}<br><b>${a.firstPage}–${a.lastPage}</b></p>
<p>${l.received}<br><b>${date(a.received,lang)}</b></p>
<p>${l.accepted}<br><b>${date(a.accepted,lang)}</b></p>
<p>${l.online}<br><b>${date(a.online,lang)}</b></p>
<p>DOI<br><b>${esc(a.doi || l.doi)}</b></p>
<p><a class="button primary" dir="ltr" href="${pdf}" target="_blank" rel="noopener">${l.view}</a></p>
<p><a class="button secondary" dir="ltr" href="${pdf}" download>${l.download}</a></p>
</div>`;
  out = replaceFirst(out, sidebarInfo, infoCard, "sidebar information");

  const authorCard = /<div class="side-card">\\s*<strong>(?:Author|نویسنده|Автор)<\\/strong>[\\s\\S]*?<\\/div>/;
  if (authorCard.test(out)) {
    const card = `<div class="side-card">
<strong>${l.author}</strong>
<p><b>${esc(name)}</b></p>
<p>${esc(a.affiliation[lang])}</p>
${a.orcid ? `<p>ORCID<br><a href="https://orcid.org/${esc(a.orcid)}" target="_blank" rel="noopener noreferrer">${esc(a.orcid)}</a></p>` : ""}
</div>`;
    out = replaceFirst(out, authorCard, card, "sidebar author");
  }
  return out;
}

for (const a of published) {
  for (const lang of langs) {
    const out = path.join(root, page(lang, a));
    if (fs.existsSync(out)) continue;

    const templatePath = path.join(root,
      lang === "fa"
        ? "article-ai-supported-multimodal-russian-language-learning.html"
        : `${lang}/article-ai-supported-multimodal-russian-language-learning.html`
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Safe article template is missing: ${templatePath}`);
    }

    const template = fs.readFileSync(templatePath, "utf8");
    const headEnd = template.indexOf("</head>");
    const bodyStart = template.indexOf("<body>");
    const mainStart = template.indexOf("<main>", bodyStart);
    const mainEnd = template.indexOf("</main>", mainStart);
    const footerStart = template.indexOf("<footer", mainEnd);

    if (headEnd < 0 || bodyStart < 0 || mainStart < 0 || mainEnd < 0 || footerStart < 0) {
      throw new Error(`Unsafe template structure: ${templatePath}`);
    }

    const head = buildHead(lang, a, template);
    const bodyPrefix = template.slice(bodyStart, mainStart);
    const footerAndScripts = template.slice(footerStart, template.length);
    const html = template.slice(0, template.indexOf("<head>"))
      + head
      + bodyPrefix
      + buildMain(lang, a, template.slice(mainStart, mainEnd + "</main>".length))
      + "\n"
      + footerAndScripts;

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    console.log(`Created safe template-based page: ${out}`);
  }
}
