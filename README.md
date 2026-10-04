# Russian Language Studies (RLS)

Official website repository for **Russian Language Studies (RLS)** / **دوفصلنامه مطالعات زبان روسی** / **Исследования по русскому языку**.

## Website

This repository contains the current multilingual static website for the journal, published through GitHub Pages and the custom domain:

- https://rlsj.ir/

The site currently provides Persian, English, and Russian interfaces and includes journal information, editorial-board pages, publication policies, peer-review and ethics information, author guidelines, article/issue pages, submission forms, metrics, and article metadata.

## Content architecture

Published article metadata is maintained centrally in:

- `assets/articles-data.js`

The central registry contains multilingual titles, abstracts, keywords, author metadata, publication dates, pagination, article language, and PDF paths.

For a multilingual article:

- `language` / `sourceLanguage` identify the language of the published full text.
- The original title is the bibliographic title of record.
- Localized titles are translations for discovery and presentation on the corresponding language pages.
- A translated title must never be presented as if it changes the language of the published article.

## Submission and editorial workflow

The public site provides manuscript submission forms and journal policies. It is **not an OJS installation** and does not provide a full reviewer account/manuscript-tracking system.

Confidential peer-review material and unpublished manuscripts must not be committed to this repository.

## Administration

The repository includes an `/admin/` interface for authorized publication management. It is designed to work with a GitHub token supplied at runtime and an externally configured AI endpoint where applicable. No GitHub token should be hard-coded into repository files.

## Automation and CI

The repository uses GitHub Actions for:

- GitHub Pages deployment
- multilingual content validation/build
- SEO and scholarly metadata checks
- CodeQL/security scanning

Maintenance/patch workflows that modify repository content are kept **manual-only** to avoid unnecessary push-triggered loops and permission failures.

## Journal metadata

Official journal identity and publication metadata should be kept consistent across:

- Persian, English, and Russian pages
- article metadata
- issue/archive pages
- structured data
- citation metadata
- future DOI/Crossref deposits

When DOI, ISSN, or other identifiers are not officially assigned, they should not be presented as if they were.

## Development principle

Prefer a single authoritative data source for article metadata and generate/synchronize localized views from it. Avoid hard-coded article counts, duplicated article metadata, and self-modifying workflows wherever possible.


## ثابت‌های نگهداری سایت (از 2026-10-05)

### صفحات مقالات
- هر مقاله جدید باید در هر سه زبان فارسی، انگلیسی و روسی همان ساختار شمارنده فعلی را داشته باشد.
- شمارنده در پایین بخش اطلاعات/نویسنده مقاله و داخل ستون کناری مقاله قرار می‌گیرد.
- شمارنده کلیک «مشاهده مقاله» باید با GoatCounter و شناسه مشترک مقاله در هر سه زبان ثبت شود تا بازدیدهای سه نسخه زبانی یک مقاله قابل تجمیع باشد.
- متن شمارنده در هر زبان مطابق زبان همان صفحه باشد و ساختار و ظاهر فعلی آن بدون تغییر باقی بماند.

### هیئت تحریریه
- صفحات هیئت تحریریه فارسی، انگلیسی و روسی دارای ساختار، ترتیب، چیدمان کارت‌ها، اطلاعات پروفایل و ظاهر فعلی هستند و نباید در مقالات/به‌روزرسانی‌های بعدی تغییر داده شوند.
- برای افزودن عضو جدید فقط اطلاعات همان عضو به الگوی فعلی اضافه شود و ساختار یا ظاهر اعضای موجود تغییر نکند.
