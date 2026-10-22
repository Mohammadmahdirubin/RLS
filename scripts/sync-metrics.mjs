import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "articles");
const all = fs.readdirSync(dir)
  .filter(f => f.endsWith(".json") && !f.startsWith("_"))
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const pub = all.filter(a => a.status === "published");
const legacy = JSON.parse(fs.readFileSync(path.join(root, "content", "editorial-stats.json"), "utf8"));
const rejected = all.filter(a => a.status === "rejected").length + (legacy.legacyRejected || 0);
const pending = all.filter(a => ["pending", "under-review"].includes(a.status)).length + (legacy.legacyPending || 0);
const accepted = pub.length;
const received = accepted + rejected + pending;
const rate = accepted + rejected ? Math.round(accepted * 100 / (accepted + rejected)) : 0;

function formatNumber(value, lang) {
  const s = String(value);
  if (lang !== "fa") return s;
  const digits = "۰۱۲۳۴۵۶۷۸۹";
  return s.replace(/[0-9]/g, d => digits[Number(d)]);
}

function run(file, l) {
  const p = path.join(root, file);
  let h = fs.readFileSync(p, "utf8");
  const articleCount = formatNumber(pub.length, l);
  const status = l === "fa" ? "منتشر شده" : l === "ru" ? "Опубликован" : "Published";
  h = h.replace(/(<span class="num" data-rls-article-count>)[^<]*(<\/span>)/g, "$1" + articleCount + "$2");
  h = h.replace(/(<span class="status-badge">)[^<]*(<\/span>)/i, "$1" + status + "$2");

  const startHeading = l === "fa" ? "<h2>۲. شاخص‌های عملکردی</h2>" :
    l === "ru" ? "<h2>2. Показатели работы со статьями</h2>" :
    "<h2>2. Performance indicators</h2>";
  const endHeading = l === "fa" ? "<h2>۳. آمار مقالات به تفکیک دوره</h2>" :
    l === "ru" ? "<h2>3. Статьи по томам</h2>" :
    "<h2>3. Articles by volume</h2>";
  const s = h.indexOf(startHeading);
  const e = h.indexOf(endHeading, s);
  if (s >= 0 && e > s) {
    let sec = h.slice(s, e);
    const values = [
      formatNumber(received, l),
      formatNumber(accepted, l),
      formatNumber(rejected, l),
      l === "fa" ? formatNumber(rate, l) + "٪" : rate + "%",
      formatNumber(pending, l),
      l === "fa" ? "۵ روز" : "5 days",
      l === "fa" ? "۲ هفته" : "2 weeks"
    ];
    let i = 0;
    sec = sec.replace(/<span class="num">[^<]*(<\/span>)/g, function(original) {
      const value = values[i++];
      return value === undefined ? original : '<span class="num">' + value + '</span>';
    });
    const notes = l === "fa"
      ? "از مجموع " + formatNumber(received,l) + " مقاله دریافتی، " + formatNumber(accepted,l) + " مقاله پذیرفته شده، " + formatNumber(pending,l) + " مقاله در حال بررسی / تعیین‌تکلیف و " + formatNumber(rejected,l) + " مقاله رد شده است."
      : l === "ru"
      ? "Из " + received + " полученных статей " + accepted + " приняты, " + pending + " находятся на рассмотрении / ожидают решения и " + rejected + " отклонены."
      : "Of " + received + " manuscripts received, " + accepted + " have been accepted, " + pending + " are under review / awaiting a decision, and " + rejected + " have been rejected.";
    sec = sec.replace(/<p class="stat-note">[\s\S]*?<\/p>/i, '<p class="stat-note">' + notes + '</p>');
    h = h.slice(0, s) + sec + h.slice(e);
  }
  fs.writeFileSync(p, h);
}

run("journal-metrics.html", "fa");
run("en/journal-metrics.html", "en");
run("ru/journal-metrics.html", "ru");
