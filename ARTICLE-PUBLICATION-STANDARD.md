# RLS Article Publication Standard

This file is the permanent operating procedure for publishing every new scholarly article on the Russian Language Studies (RLS) website. When the journal owner supplies a manuscript PDF, follow this standard automatically; do not ask the owner to repeat the formatting and publication instructions. Ask only for essential bibliographic information that cannot be established reliably from the PDF or existing journal records.

## 1. Reference design and source of truth

- Use the current published article pages as the visual and technical reference, especially:
  - `article-fate-family-human-values-don-stories.html` (latest article-page formatting and view-counter styling)
  - `article-ai-supported-multimodal-russian-language-learning.html`
  - `article-role-of-context-russian-verbal-aspect.html`
  - `article-challenges-russian-technical-military-terminology.html`
- Match the current RLS site design and the existing article-page structure. Do not redesign the page or introduce a new visual style for an individual article.
- Treat the supplied PDF as the primary source for title, authors, affiliations, abstract, keywords, references, pagination, and article text. Never invent missing bibliographic data.
- Before editing, fetch the latest version of relevant files from the default branch and inspect current paths and markup. Preserve unrelated content and existing conventions.

## 2. When a new PDF is supplied

Complete the publication workflow end-to-end in the repository, using the PDF and available journal information:

1. Read the PDF and extract the exact title, all authors and affiliations, abstract, keywords, article language, references, page range, volume/issue, and publication-history dates where available.
2. Create a consistent, readable article filename based on the title, following existing RLS naming conventions. Check that it does not already exist.
3. Store the PDF in the appropriate existing articles directory and use the exact deployed PDF URL everywhere. Verify the final path; do not assume the root directory or a subdirectory without checking the repository's existing convention.
4. Create the article HTML page by adapting the current article-page template, retaining the journal's existing layout and styles.
5. Include the same standard article components used by the existing pages:
   - RLS journal header/branding and volume/issue/page information
   - Article title and author/affiliation details
   - Double-blind peer-review mark where present in the established format
   - Abstract and keywords, including English abstract and keywords when required by the journal's established article format
   - Publication history (received, accepted, and online publication dates) in the established format, using exact dates and consistent date formatting
   - Full-text PDF link/download control
   - Citation and bibliographic metadata in the HTML head, including applicable `citation_*` tags
   - Canonical URL, alternate-language/hreflang links, Open Graph metadata, and structured data consistent with the site's existing SEO conventions
   - Author information and the article view counter
6. Make the view counter visually match the existing article pages. Reuse the same counter markup, class names, CSS rules, and script/API pattern as the current standard page. Give the new article its own unique counter identifier so its views are not mixed with another article. Do not omit the inline counter CSS if the reference pages include it.
7. Add the new article to all three published-article index pages:
   - `articles.html` (Persian)
   - `en/articles.html` (English)
   - `ru/articles.html` (Russian)
   Keep each listing in the same visual format and order as existing entries. Translate the title and summary accurately for the English and Russian listings; link all three entries to the correct page and PDF where appropriate.
8. Update the site's sitemap only if the current sitemap structure requires the new article URL to be added manually. Follow the existing sitemap conventions and include only URLs that actually exist. Ensure canonical and hreflang URLs point to real pages; never create links to missing language variants.
9. Check all links, dates, metadata, PDF paths, counter IDs, and index-card links for consistency. Compare the new article page with at least one existing article page before committing.
10. Commit the changes with a clear message describing the new article publication, then refetch the changed files to verify the repository contains the committed version.

## 3. Metadata and accuracy rules

- Use the article's actual language in `citation_language`; use the exact title and author names as printed in the PDF.
- Use the real volume, issue, and first/last page values. Do not automatically assume every article has the same page range.
- Use ISO dates (`YYYY-MM-DD`) for machine-readable citation metadata. Display dates in the same format used by the reference article page; do not convert or infer a date unless the source establishes it.
- Set `citation_pdf_url` to the exact public URL of the uploaded PDF.
- Use the journal name consistently: Persian «دوفصلنامه مطالعات زبان روسی», Russian «Исследования по русскому языку», English “Russian Language Studies”.
- Preserve the established navy/gold/white identity and the current desktop/mobile layout.
- Keep the view counter in the same location and style as the current standard article pages.
- Do not claim a change is live until the repository and, where possible, the deployed site have been checked. If deployment or caching delays are possible, say so clearly.

## 4. Default behavior for future submissions

Whenever the owner uploads a new article PDF and asks to publish/register it, interpret that as authorization to apply this complete workflow without asking for the instructions again. Proceed directly using this standard and the latest repository files. Ask a concise clarification only when a required fact cannot be obtained from the PDF or repository (for example, a missing acceptance date or unclear page range). If a requested value is unavailable, do not fabricate it; leave it out or ask only about that specific value.

## 5. Final verification checklist

- [ ] PDF is committed at the intended path and its public URL is correct.
- [ ] Article HTML follows the existing RLS article format.
- [ ] Title, author names, affiliations, abstract, keywords, page range, dates, and references match the source.
- [ ] Citation metadata, canonical URL, hreflang, and structured data are valid and internally consistent.
- [ ] View-counter markup, styling, and script match the reference; counter identifier is unique.
- [ ] Persian, English, and Russian article lists have matching entries with valid links.
- [ ] Sitemap is updated if needed.
- [ ] No unrelated files or layout settings were changed.
- [ ] Changes are committed and verified by refetching the files.
