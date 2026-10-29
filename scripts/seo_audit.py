#!/usr/bin/env python3
"""Non-destructive SEO audit for the static RLS journal site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "admin", "workers", "vendor"}
BASE = "https://rlsj.ir"

class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = False
        self.title_text = []
        self.meta = {}
        self.links = []
        self.h1_count = 0
        self.in_title = False
        self.jsonld = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.h1_count += 1
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key.lower()] = a.get("content", "").strip()
        if tag == "link":
            self.links.append(a)
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.jsonld += 1
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        if self.in_title:
            self.title_text.append(data.strip())
    @property
    def title_value(self):
        return " ".join(x for x in self.title_text if x).strip()

def html_files():
    for p in ROOT.rglob("*.html"):
        if not any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts):
            yield p

def main():
    errors = 0
    warnings = 0
    count = 0
    for path in sorted(html_files()):
        count += 1
        try:
            parser = HeadParser()
            parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        except Exception as exc:
            print(f"ERROR {path.relative_to(ROOT)}: cannot parse ({exc})")
            errors += 1
            continue
        rel = path.relative_to(ROOT).as_posix()
        if not parser.title_value:
            print(f"ERROR {rel}: missing <title>")
            errors += 1
        elif len(parser.title_value) > 70:
            print(f"WARN  {rel}: title is {len(parser.title_value)} characters (review for truncation)")
            warnings += 1
        if not parser.meta.get("description"):
            print(f"WARN  {rel}: missing meta description")
            warnings += 1
        elif len(parser.meta["description"]) > 170:
            print(f"WARN  {rel}: meta description is {len(parser.meta['description'])} characters")
            warnings += 1
        canonicals = [x.get("href", "") for x in parser.links if x.get("rel", "").lower() == "canonical"]
        if len(canonicals) != 1 or not canonicals[0].startswith(BASE):
            print(f"WARN  {rel}: expected exactly one absolute canonical URL on {BASE}")
            warnings += 1
        langs = {x.get("hreflang", "").lower() for x in parser.links if x.get("rel", "").lower() == "alternate" and x.get("hreflang")}
        if rel == "index.html" or rel in {"en/index.html", "ru/index.html"}:
            if not {"fa", "en", "ru", "x-default"}.issubset(langs):
                print(f"WARN  {rel}: homepage should declare fa/en/ru/x-default hreflang links")
                warnings += 1
        if parser.h1_count == 0:
            print(f"WARN  {rel}: no H1 heading detected")
            warnings += 1
        if rel.endswith("article-yasnaya-polyana-wwii.html") and parser.jsonld == 0:
            print(f"WARN  {rel}: article page has no JSON-LD structured data")
            warnings += 1
    sitemap = ROOT / "sitemap.xml"
    robots = ROOT / "robots.txt"
    if not sitemap.exists():
        print("ERROR sitemap.xml is missing")
        errors += 1
    elif "https://rlsj.ir/sitemap.xml" not in robots.read_text(encoding="utf-8", errors="replace") if robots.exists() else True:
        print("WARN  robots.txt does not advertise sitemap.xml")
        warnings += 1
    print(f"\nSEO audit complete: {count} HTML files, {errors} errors, {warnings} warnings.")
    # Existing legacy pages may have warnings; fail only on parsing/title errors.
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
