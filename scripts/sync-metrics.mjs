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

function run(file, l) {
  const p = path.join(root, file);
  let h = fs.readFileSync(p, "utf8");
  const s = h.indexOf("<h2>2.");
  const e = h.indexOf("<h2>3.", s);
  if (s < 0 || e < 0) return;

  let sec = h.slice(s, e);
  const values = [
    String(received),
    String(accepted),
    String(rejected),
    l === "fa" ? rate + "٪" : rate + "%",
    String(pending),
    l === "fa" ? "۵ روز" : "5 days",
    l === "fa" ? "۲ هفته" : "2 weeks"
  ];
  let i = 0;
  sec = sec.replace(/<span class="num">[^<]*<\/span>/g, function(original) {
    const value = values[i++];
    return value === undefined ? arguments[0] : '<span class="num">' + value + '</span>';
  });
  h = h.slice(0, s) + sec + h.slice(e);
  fs.writeFileSync(p, h);
}

run("journal-metrics.html", "fa");
run("en/journal-metrics.html", "en");
run("ru/journal-metrics.html", "ru");
