# RLS SEO implementation plan (Persian, English, Russian)

## Important limitation
This is a research and editorial map, not a block of keywords to inject into every page. Google Search does not use the `meta keywords` tag for ranking. Large, repetitive keyword lists can be treated as keyword stuffing and harm search visibility. No code can guarantee first-page placement or a fixed ranking.

## Primary topic clusters

### فارسی
- نشریه مطالعات زبان روسی
- دوفصلنامه مطالعات زبان روسی
- مقالات علمی زبان روسی
- آموزش زبان روسی
- زبان‌شناسی روسی
- دستور زبان روسی
- آموزش روسی به‌عنوان زبان خارجی
- روش تدریس زبان روسی
- ادبیات روسیه
- نقد ادبی روسیه
- فرهنگ روسیه
- ترجمه روسی به فارسی
- مطالعات ترجمه روسی
- زبان روسی برای فارسی‌زبانان
- پژوهش‌های زبان‌شناسی کاربردی روسی
- مجله علمی زبان روسی
- مقاله پژوهشی زبان روسی
- نشریه آموزش زبان روسی
- مطالعات روسی و فارسی
- منابع علمی آموزش زبان روسی

### English
- Russian language studies journal
- Russian linguistics research
- Russian language teaching
- Russian as a foreign language
- teaching Russian to Persian speakers
- Russian grammar research
- Russian language education
- Russian literature studies
- Russian culture research
- Russian translation studies
- applied linguistics Russian
- Russian language acquisition
- academic journal Russian linguistics
- research articles on Russian language
- Russian language pedagogy
- comparative linguistics Russian Persian
- Russian verbal aspect
- Russian technical terminology
- Russian literature and cultural heritage
- multilingual language education research

### Русский
- исследования русского языка
- научный журнал по русскому языку
- преподавание русского языка
- русский язык как иностранный
- методика преподавания русского языка
- русская лингвистика
- грамматика русского языка
- обучение русскому языку
- исследования русской литературы
- русская культура
- переводоведение
- сопоставительное языкознание
- русский глагольный вид
- терминология русского языка
- научные статьи о русском языке
- журнал по методике преподавания русского языка
- лингводидактика русского языка
- русский язык для персоязычных учащихся
- межкультурная коммуникация
- академические исследования русистики

## How to apply keywords safely
1. Assign one main search intent to each page; do not reuse a universal list across the whole site.
2. Use the main phrase naturally in the page title, H1, opening paragraph, and descriptive internal links where it accurately describes the content.
3. Use each article's actual subject, author, abstract, date, volume/issue, references, and language. Do not put unrelated journal-wide terms on article pages.
4. Keep Persian, English, and Russian URLs distinct and ensure each language page links to its true equivalents with reciprocal `hreflang` tags.
5. Keep canonical URLs consistent with the sitemap and internal links. Submit the sitemap in Google Search Console and inspect important URLs there; code cannot request indexing on the owner's behalf.
6. Avoid doorway pages, invisible keyword blocks, repeated keyword lists, and bulk-generated thin pages.
7. Review Search Console impressions and queries monthly. Prioritize content with relevant impressions but weak click-through rate, and improve the page itself rather than adding more tags.

## Automation
`scripts/seo_audit.py` checks HTML titles, descriptions, canonical tags, homepage hreflang declarations, H1 presence, and the sitemap declaration in robots.txt. The GitHub Actions workflow runs the audit on pushes and pull requests. Warnings are informational so legacy pages do not break deployment.
