import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "articles");

const all = fs.readdirSync(dir)
  .filter(f => f.endsWith(".json") && !f.startsWith("_"))
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
  .filter(a => a.status === "published")
  .sort((a,b) => Number(a.number) - Number(b.number));

const esc = v => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;");

const pageUrl = (lang, a) => {
  const filename = a.href || "article-" + (a.slug || a.id) + ".html";
  // Links are relative to the current article-list page:
  // articles.html -> article.html
  // en/articles.html -> article.html
  // ru/articles.html -> article.html
  const parts = String(filename).split("/");
  if (parts.length > 1 && ["fa","en","ru"].includes(parts[0])) parts.shift();
  return parts.join("/");
};

function titlePair(a, lang) {
  const source = a.language || a.sourceLanguage || "en";
  const main = a.title[lang] || a.title[source] || a.title.en || a.title.fa || a.title.ru || "";
  const secondaryLang = lang === source ? null : source;
  const secondary = secondaryLang ? (a.title[secondaryLang] || a.title.en || a.title.fa || a.title.ru || "") : "";
  return { main, secondary, source, secondaryLang };
}

function labels(lang) {
  return lang === "fa"
    ? { num:"مقاله", type:"نوع مقاله", received:"دریافت", online:"انتشار آنلاین", issue:"شماره", pages:"صفحات", view:"مشاهده مقاله", pdf:"دانلود PDF", doi:"DOI: تعیین نشده", keywords:"کلیدواژه‌ها" }
    : lang === "ru"
    ? { num:"Статья", type:"Тип статьи", received:"Поступление", online:"Онлайн-публикация", issue:"Выпуск", pages:"Страницы", view:"Открыть статью", pdf:"Скачать PDF", doi:"DOI: Не присвоен", keywords:"Ключевые слова" }
    : { num:"Article", type:"Article type", received:"Received", online:"Online publication", issue:"Issue", pages:"Pages", view:"View article", pdf:"Download PDF", doi:"DOI: Not assigned", keywords:"Keywords" };
}

function card(a, lang) {
  const l = labels(lang), pair = titlePair(a, lang);
  const href = pageUrl(lang,a);
  const pdf = (lang === "fa" ? "" : "../") + a.pdf;
  const type = a.type[lang] || a.type[a.language] || "";
  const affiliation = a.affiliation[lang] || a.affiliation[a.language] || "";
  const keywords = String(a.keywords?.[lang] || a.keywords?.[a.language] || a.keywords?.en || "").split(/[;；،,]+/).map(x => x.trim()).filter(Boolean);
  const keywordLinks = keywords.map(keyword => `<a href="https://www.google.com/search?q=${encodeURIComponent('site:rlsj.ir "' + keyword + '"' )}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:.2rem .25rem;padding:.2rem .55rem;border:1px solid var(--border,#d7dce3);border-radius:999px;text-decoration:none;font-size:.9em">${esc(keyword)}</a>`).join(" ");
  return `<article class="article-record">
<div class="article-number"><strong>${l.num} ${a.number}</strong></div>
<div class="article-type">${esc(type)}</div>
<h2>${esc(pair.main)}</h2>
${pair.secondary ? '<p class="article-title-translation" style="font-size:.9em;line-height:1.8;margin:.25rem 0 1rem;color:var(--muted,#666);"' + (pair.secondaryLang === "fa" ? ' dir="rtl"' : ' dir="ltr"') + '><span class="title-label">' + (lang === "fa" ? "عنوان اصلی: " : lang === "ru" ? "Оригинальное название: " : "Original title: ") + '</span>' + esc(pair.secondary) + '</p>' : ""}
<p class="authors"><strong>${esc(a.author)}</strong> · ${esc(affiliation)}</p>
<div class="meta-grid"><div><span>${l.received}</span><strong>${esc(a.received)}</strong></div><div><span>${l.online}</span><strong>${esc(a.online)}</strong></div><div><span>${l.issue}</span><strong>${esc(lang === "fa" ? "دوره " : lang === "ru" ? "Том " : "Volume ")}${a.volume}, ${lang === "fa" ? "شماره " : lang === "ru" ? "выпуск " : "Issue "}${a.issueNumber}</strong></div><div><span>${l.pages}</span><strong>${esc(a.firstPage)}–${esc(a.lastPage)}</strong></div></div>
<div class="article-keywords" style="margin:.8rem 0 1rem;line-height:2"><strong>${l.keywords}:</strong> ${keywordLinks}</div>
<div class="article-actions"><span class="status">${l.doi}</span> <a class="button secondary" href="${href}">${l.view}</a> <a class="button primary" href="${pdf}" target="_blank" rel="noopener">${l.pdf}</a></div>
</article>`;
}

for (const lang of ["fa","en","ru"]) {
  const file = lang === "fa" ? "articles.html" : `${lang}/articles.html`;
  const p = path.join(root,file);
  let html = fs.readFileSync(p,"utf8");
  const start = html.indexOf('<div id="rls-article-list">');
  const end = html.indexOf("</div>", start);
  if (start < 0) throw new Error(`Article list container missing: ${file}`);
  // Find the container's closing tag by balancing divs.
  let depth = 0, pos = start;
  const tokenRe = /<div\b[^>]*>|<\/div>/g; tokenRe.lastIndex = start;
  let close = -1, m;
  while ((m = tokenRe.exec(html))) {
    if (m[0].startsWith("<div")) depth++;
    else depth--;
    if (depth === 0) { close = m.index; break; }
  }
  if (close < 0) throw new Error(`Article list container not closed: ${file}`);
  const replacement = '<div id="rls-article-list">' + all.map(a => card(a,lang)).join("") + "</div>";
  html = html.slice(0,start) + replacement + html.slice(close + "</div>".length);
  html = html.replace(/(<span data-rls-article-count>)[^<]*(<\/span>)/g, (_, open, close) => open + all.length + close);
  fs.writeFileSync(p,html);
  console.log(`Updated article title language logic: ${file}`);
}
