# RLS Article Publication Standard

This file is the permanent operating procedure for publishing every new scholarly article on the Russian Language Studies (RLS) website. When the journal owner supplies a manuscript PDF, follow this standard automatically; do not ask the owner to repeat the formatting and publication instructions. Ask only for essential bibliographic information that cannot be established reliably from the PDF or existing journal records.

## 1. Reference design and source of truth

- Use the current published article pages as the visual and technical reference, especially:
  - `article-fate-family-human-values-don-stories.html` and its `en/` and `ru/` counterparts: primary reference for the complete article-page layout, view-counter styling, citation table, and metadata presentation.
  - `article-mythological-significance-water-russian-literature.html`, `article-teaching-russian-indian-university-communicative-activity-approach.html`, and `article-yasnaya-polyana-wwii.html`, including language counterparts, as additional references for the current full article format.
  - Earlier first-issue pages may be consulted for established content patterns, but do not downgrade or omit components present in the newer reference pages.
- Match the current RLS site design and the existing article-page structure. Do not redesign the page or introduce a new visual style for an individual article.
- Treat the supplied PDF as the primary source for title, authors, affiliations, abstract, keywords, references, pagination, and article text. Never invent missing bibliographic data.
- Before editing, fetch the latest version of relevant files from the default branch and inspect current paths and markup. Preserve unrelated content and existing conventions.

## 2. When a new PDF is supplied

Complete the publication workflow end-to-end in the repository, using the PDF and available journal information:

1. Read the PDF and extract the exact title, all authors and affiliations, abstract, keywords, article language, references, page range, volume/issue, and publication-history dates where available.
2. Create a consistent, readable article filename based on the title, following existing RLS naming conventions. Check that it does not already exist.
3. Store the PDF in the appropriate existing articles directory and use the exact deployed PDF URL everywhere. Verify the final path; do not assume the root directory or a subdirectory without checking the repository's existing convention.
4. Create the article HTML page by adapting the latest complete article-page template, retaining the journal's existing layout, styles, and functional components.
5. Include the complete standard article components used by the reference pages, including:
   - RLS journal header/branding and volume/issue/year/page information
   - Article title and complete author/affiliation details, with ORCID or other identifiers when supplied
   - Double-blind peer-review mark where present in the established format
   - Full abstract and keywords in the page language; maintain complete aligned abstracts and keywords across all three languages
   - Article type and language
   - Publication history (received, accepted, and online publication dates) in the established format, using exact dates and consistent date formatting
   - DOI display/link when assigned, or a clear pending/not-yet-assigned status when appropriate
   - Full-text PDF link/download control
   - All reference-page information boxes, bibliographic details, citation/copy-citation area, and citation-format table
   - Reference list and in-text citation presentation as applicable to the source article
   - Author information and the article view counter
   - Any additional article-level panels, labels, share/copy controls, and visual elements present in the selected current reference template
6. Make the view counter visually and functionally match the latest complete reference article pages. Reuse the same counter markup, class names, CSS rules, and script/API pattern. Give every new article its own unique counter identifier so its views are not mixed with another article. Do not omit inline counter CSS if the reference pages include it.
7. Create and maintain all three language versions: Persian (root), English (`/en/`), and Russian (`/ru/`). Translate accurately; do not shorten abstracts or omit references, metadata, information boxes, or functional elements in one language. Keep page structure and capabilities equivalent across languages, with correct RTL/LTR direction.
8. Add the new article to all three published-article index pages:
   - `articles.html` (Persian)
   - `en/articles.html` (English)
   - `ru/articles.html` (Russian)
   Keep each listing in the same visual format and order as existing entries. Translate the title and summary accurately for the English and Russian listings; link all three entries to the correct page and PDF where appropriate.
9. Update the site's sitemap only if the current sitemap structure requires the new article URL to be added manually. Follow the existing sitemap conventions and include only URLs that actually exist. Ensure canonical and hreflang URLs point to real pages; never create links to missing language variants.
10. Check all links, dates, metadata, PDF paths, counter IDs, citation formats, references, and index-card links for consistency. Compare all three new language pages with the reference pages before committing.
11. Commit the changes with a clear message describing the new article publication, then refetch the changed files to verify the committed version.

## 3. Metadata and accuracy rules

- Use the article's actual language in `citation_language`; use the exact title and author names as printed in the PDF.
- Use the real volume, issue, and first/last page values. Do not automatically assume every article has the same page range.
- Use ISO dates (`YYYY-MM-DD`) for machine-readable citation metadata. Display dates in the same format used by the reference article page; do not convert or infer a date unless the source establishes it.
- Set `citation_pdf_url` to the exact public URL of the uploaded PDF.
- Use the journal name consistently: Persian «دوفصلنامه مطالعات زبان روسی», Russian «Исследования по русскому языку», English “Russian Language Studies”.
- Preserve the established navy/gold/white identity and the current desktop/mobile layout.
- Keep the view counter in the same location and style as the current standard article pages.
- Preserve the complete reference/citation presentation and use only real bibliographic sources and identifiers.
- Do not claim a change is live until the repository and, where possible, the deployed site have been checked. If deployment or caching delays are possible, say so clearly.

## 4. Second issue (Autumn) and future issue policy

- The second issue is a new publication batch. Its article pages must be created as new records and must not overwrite, rename, move, or otherwise modify any of the seven articles already published in the first issue.
- The seven first-issue article pages are the design/feature reference only. They are not second-issue content and must remain intact, including their URLs, PDFs, metadata, and independent view counters.
- Apply the same full feature set to every second-issue article from the outset. Do not create a reduced/basic page and plan to add citation boxes, counters, references, metadata, or language versions later.
- Use the issue's confirmed volume/issue/year and the article's confirmed page range and publication dates. Do not assume these values from the first issue.
- Check the repository's current folder and filename conventions before selecting the second-issue PDF directory or article URL pattern. Do not assume a path such as `articles/2/` until verified.
- Allocate a unique view-counter ID for every second-issue article and keep it stable across that article's language variants if that is how the current counter service is structured; verify the existing implementation before choosing the ID pattern.
- Keep article-page feature parity across Persian, English, and Russian versions. A component present in one language must not be omitted from the other language versions unless it is genuinely language-specific.
- Update issue indexes, article indexes, sitemap, shared metadata/data files, and Crossref-related outputs only where the current repository architecture requires it. Do not change first-issue records as a shortcut.
- If a DOI has not yet been assigned, show the established pending status and do not fabricate a DOI. Prepare Crossref metadata/XML only from verified article metadata and the actual assigned DOI/prefix configuration.

## 5. Default behavior for future submissions

Whenever the owner uploads a new article PDF and asks to publish/register it, interpret that as authorization to apply this complete workflow without asking for the instructions again. Proceed directly using this standard and the latest repository files. Ask a concise clarification only when a required fact cannot be obtained from the PDF or repository (for example, a missing acceptance date or unclear page range). If a requested value is unavailable, do not fabricate it; leave it out or ask only about that specific value.

## 6. Final verification checklist

- [ ] PDF is committed at the intended path and its public URL is correct.
- [ ] Article HTML follows the latest complete RLS article format and contains all reference-page components.
- [ ] Title, author names, affiliations, abstract, keywords, page range, dates, article type, and references match the source.
- [ ] Persian, English, and Russian pages have equivalent structure and complete content.
- [ ] Citation metadata, canonical URL, hreflang, Open Graph, and structured data are valid and internally consistent.
- [ ] DOI is accurate or explicitly marked pending; Crossref data is generated only from verified metadata.
- [ ] View-counter markup, styling, and script match the reference; counter identifier is unique and stable.
- [ ] Citation formats, reference list, bibliographic boxes, PDF links, and other functional elements are present and checked.
- [ ] Persian, English, and Russian article lists have matching entries with valid links.
- [ ] Sitemap is updated if needed.
- [ ] All first-issue article files, URLs, PDFs, metadata, and counters remain unchanged.
- [ ] No unrelated files or layout settings were changed.
- [ ] Changes are committed and verified by refetching the files; live verification status is stated accurately.
