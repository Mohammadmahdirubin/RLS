import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "articles");
const langs = ["fa", "en", "ru"];
const fields = ["title", "abstract", "keywords", "affiliation"];

const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("_"));
const errors = [];

for (const file of files) {
  const a = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  for (const field of fields) {
    if (!a[field] || typeof a[field] !== "object") {
      errors.push(file + ": missing " + field);
      continue;
    }
    for (const lang of langs) {
      if (!String(a[field][lang] || "").trim()) {
        errors.push(file + ": missing " + field + "." + lang);
      }
    }
  }
  if (!a.type || !langs.every(l => String(a.type[l] || "").trim())) errors.push(file + ": missing type translation");
}

if (errors.length) {
  console.error("Multilingual validation failed:");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}

console.log("Multilingual validation passed for " + files.length + " article record(s).");
