import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "content", "articles");
const outManifest = path.join(root, "content", "generated-manifest.json");
const languages = ["fa", "en", "ru"];

const errors = [];
const generated = [];

if (fs.existsSync(articlesDir)) {
  for (const file of fs.readdirSync(articlesDir).filter(f => f.endsWith(".json") && !f.startsWith("_"))) {
    const article = JSON.parse(fs.readFileSync(path.join(articlesDir, file), "utf8"));
    for (const key of ["id","number","status","title","abstract","keywords","author","affiliation","received","accepted","online","volume","issueNumber","firstPage","lastPage","pdf"]) {
      if (article[key] === undefined || article[key] === null) errors.push(`${file}: missing ${key}`);
    }
    for (const key of ["title","abstract","keywords","affiliation"]) {
      for (const lang of languages) {
        if (!article[key]?.[lang]) errors.push(`${file}: missing ${key}.${lang}`);
      }
    }
    if (article.status === "published") {
      for (const language of languages) {
        generated.push({
          articleId: article.id,
          number: article.number,
          language,
          source: file,
          output: `${language === "fa" ? "" : language + "/"}article-${article.slug || article.id}.html`,
          pdf: article.pdf
        });
      }
    }
  }
}

fs.writeFileSync(outManifest, JSON.stringify({
  generatedAt: new Date().toISOString(),
  generator: "RLS multilingual content system v1",
  languages,
  articleCount: generated.length / languages.length,
  generated
}, null, 2) + "\n");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`RLS content validation passed: ${generated.length / languages.length} published source article(s).`);
