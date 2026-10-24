# Indexing and machine-readable metadata

## Public metadata exports
- `/metadata/journal.json` — journal and issue metadata.
- `/metadata/articles.json` — article metadata, multilingual titles/abstracts/keywords, landing pages and direct PDF URLs.
- `/feed.xml` — RSS 2.0 feed for published articles.
- `/oai-worker.js` — Cloudflare Worker source for an OAI-PMH 2.0 endpoint supporting Identify, ListMetadataFormats, ListSets, ListIdentifiers, ListRecords and GetRecord in oai_dc.

## OAI-PMH deployment is required
GitHub Pages cannot run a dynamic OAI-PMH endpoint by itself. Deploy `oai-worker.js` as a Cloudflare Worker and configure the route `rlsj.ir/oai*` to that Worker. Do not give the OAI URL to the Humanities Portal until deployed and tested.

Test after deployment:
- https://rlsj.ir/oai?verb=Identify
- https://rlsj.ir/oai?verb=ListMetadataFormats
- https://rlsj.ir/oai?verb=ListRecords&metadataPrefix=oai_dc
- https://rlsj.ir/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:rlsj.ir:ai-supported-multimodal-russian-language-learning

Before submitting, verify every article record, direct PDF URL, issue/volume/page metadata, and ensure each URL returns successfully without login. ISSN and DOI must remain blank until officially assigned. The metadata endpoint does not replace the requested full-issue PDF and does not guarantee acceptance by an index.
