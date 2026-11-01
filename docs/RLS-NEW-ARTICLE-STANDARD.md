# RLS New Article Publishing Standard
Version: 2026-11-01

This is the standing checklist for every new article published in Russian Language Studies (RLS). Consult it before preparing or changing article pages. The full publication workflow is defined in the repository-root `ARTICLE-PUBLICATION-STANDARD.md`; this document is the operational quality-control checklist.

## 1. Three-language completeness
- Publish and check the article in all three site languages: Persian (root), English (`/en/`), and Russian (`/ru/`).
- Keep titles, author names and affiliations, abstracts, keywords, article metadata, links, references, citation information, and publication details aligned across all three versions.
- Provide a complete academic abstract in each language. Do not replace the full abstract with a shortened summary. Preserve the author's meaning and research findings in translation.
- Ensure the full abstract appears on the dedicated article page and the corresponding article-listing entry; update shared article data files as applicable.
- Maintain feature parity: information boxes, bibliographic details, citation formats, reference list, view counter, PDF controls, metadata, and other functional components must be present in each language version where applicable.

## 2. Article text and readability
- Justify the abstract and main article prose in all three languages.
- Apply justification to appropriate prose elements such as paragraphs, list items, and blockquotes; do not force titles, navigation, buttons, or compact metadata into justified alignment.
- Set language and text direction correctly for Persian (RTL) and English/Russian (LTR).
- Preserve the current RLS visual identity, responsive behavior, spacing, typography, and article-page component styling. Use the newest complete published article pages as the reference rather than creating a reduced template.

## 3. Complete article record
Include the applicable information supplied for the article:
- Full title and complete author names.
- Author affiliations and identifiers (such as ORCID), where supplied.
- Full abstract and keywords in the page language.
- Article type and language.
- Volume, issue, page range, and publication year/date.
- Received, accepted, and online-publication dates, when available.
- DOI or an explicit pending status when no DOI has been assigned.
- Correct official PDF link and any supplied supporting materials.
- Bibliographic information boxes, citation formats, references, and article-level information displayed in the reference pages.
- An individual view counter with the established styling and a unique identifier.

Do not invent missing bibliographic information, dates, identifiers, or DOI values.

## 4. Second issue and protection of the first issue
- The second issue (Autumn) is a separate publication batch. Create new article pages and records for it; do not overwrite, rename, move, or otherwise alter the seven articles already published in issue one.
- Use the first-issue pages as the design and functionality reference only. Their URLs, PDFs, metadata, and counters must remain intact.
- Apply the full article-page feature set to second-issue articles from the first publication commit. Do not defer boxes, citations, references, counters, metadata, or language parity to a later pass.
- Verify the repository's current directory and URL conventions before choosing the second-issue PDF or HTML paths; never assume a directory name without checking.
- Give each new article its own stable, unique view-counter identifier.
- Use confirmed issue number, year, page range, and dates. Do not copy first-issue bibliographic values unless they are confirmed for the new issue.

## 5. Technical and discoverability checks
- Check page title and description metadata, citation meta tags, canonical URL, language-specific alternate/hreflang links, Open Graph metadata, and structured data/Schema where used by the existing site.
- Check internal links, PDF links, article-listing entries, and language-switch links for incorrect duplicated prefixes such as `/en/en/` or `/ru/ru/`.
- Keep the article content and relevant metadata consistent between the page and shared article data.
- Update the sitemap and Crossref-related metadata/XML only according to the current repository architecture and verified DOI information.
- Preserve the site's existing design and conventions.

## 6. Change-safety rule
- Make only the requested article changes and necessary related updates.
- Do not alter unrelated text, photos, logos, ordering, header, menus, footer, CSS, banners, or page layout. Do not reduce image quality.
- Before finishing, inspect the Persian, English, and Russian source versions and verify the changes in all three languages.
- Distinguish source/commit verification from live-site visual verification; never claim the live site was checked if it was not accessible.

## Required final checklist
- [ ] Persian, English, and Russian article pages updated and checked.
- [ ] Complete abstract and keywords in all three languages on dedicated pages and listing entries.
- [ ] Equivalent article-page features in all three languages, including information boxes, citation formats, references, PDF controls, and counter.
- [ ] Abstract and article prose justified without disrupting headings or metadata.
- [ ] Bibliographic fields, dates, author information, DOI status, page range, and PDF links checked.
- [ ] SEO metadata, citation tags, canonical/hreflang/Schema, internal links, and language switching checked where applicable.
- [ ] Unique view-counter ID and established counter implementation verified.
- [ ] Issue two changes do not modify issue one files, URLs, PDFs, metadata, or counters.
- [ ] Existing design and unrelated content preserved.
- [ ] Changes committed and source verified; live verification status stated accurately.
