import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { execFileSync } from 'child_process';

const BASE = 'https://rlsj.ir/';
const langs = [
  { key: 'fa', prefix: '', journal: 'دوفصلنامه مطالعات زبان روسی' },
  { key: 'en', prefix: 'en/', journal: 'Russian Language Studies' },
  { key: 'ru', prefix: 'ru/', journal: 'Исследования по русскому языку' }
];

const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const abs = p => /^https?:\/\//i.test(p) ? p : BASE + String(p).replace(/^\//,'');
const tag = (n,v) => '<meta name="' + n + '" content="' + esc(v) + '">';
const isoDate = v => String(v ?? '').replace(/\//g,'-');

function insertHead(html, block) {
  const i = html.search(/<\/head>/i);
  if (i < 0) throw new Error('Missing </head>');
  return html.slice(0,i) + block + '\n' + html.slice(i);
}
function setMeta(html,name,value) {
  const re = new RegExp('<meta\\s+name=["\']' + name + '["\'][^>]*>','i');
  const t = tag(name,value);
  return re.test(html) ? html.replace(re,t) : insertHead(html,t);
}
function removeMeta(html,name) {
  return html.replace(new RegExp('<meta\\s+name=["\']' + name + '["\'][^>]*>\\s*','gi'),'');
}
function setAuthors(html,names) {
  html = removeMeta(html,'citation_author');
  return insertHead(html,names.map(n=>tag('citation_author',n)).join('\n'));
}
function setCanonical(html,url) {
  const re=/<link\s+rel=["']canonical["'][^>]*>/i;
  const t='<link rel="canonical" href="'+url+'">';
  return re.test(html) ? html.replace(re,t) : insertHead(html,t);
}
function setJsonLd(html,obj) {
  const re=/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i;
  const t='<script type="application/ld+json">\n'+JSON.stringify(obj,null,2)+'\n</script>';
  return re.test(html) ? html.replace(re,t) : insertHead(html,t);
}
function urlFor(a,l){return BASE+l.prefix+a.href.replace(/^\//,'');}
function authors(a){return Array.isArray(a.authors)&&a.authors.length?a.authors:[{name:a.author,orcid:a.orcid}];}

function sync(html,a,l){
  const url=urlFor(a,l), as=authors(a);
  const sourceLanguage=a.language||a.sourceLanguage||'en';
  // Keep the Scholar PDF in the same directory as each language's abstract page.
  const citationPdfUrl = BASE + l.prefix + path.basename(a.pdf);
  html=setMeta(html,'citation_title',a.title?.[sourceLanguage]||a.title?.en||a.id);
  html=setAuthors(html,as.map(x=>x.name));
  html=setMeta(html,'citation_publication_date',isoDate(a.online));
  html=setMeta(html,'citation_firstpage',a.firstPage);
  html=setMeta(html,'citation_lastpage',a.lastPage);
  html=setMeta(html,'citation_journal_title','Russian Language Studies');
  html=setMeta(html,'citation_volume',a.volume);
  html=setMeta(html,'citation_issue',a.issueNumber);
  html=setMeta(html,'citation_fulltext_world_readable','true');
  html=setMeta(html,'citation_language',sourceLanguage);
  html=setMeta(html,'citation_pdf_url',citationPdfUrl);
  html=setMeta(html,'citation_online_date',isoDate(a.online));
  html=setMeta(html,'citation_abstract',a.abstract?.[sourceLanguage]||a.abstract?.en||'');
  html=setMeta(html,'citation_keywords',a.keywords?.[sourceLanguage]||a.keywords?.en||'');
  html=setMeta(html,'robots','index,follow');
  if(a.issn) html=setMeta(html,'citation_issn',a.issn);
  const ld={
    '@context':'https://schema.org','@type':'ScholarlyArticle','@id':url+'#article',
    headline:a.title?.[l.key]||a.title?.en,description:a.abstract?.[l.key]||a.abstract?.en||'',
    datePublished:isoDate(a.online),dateModified:isoDate(a.online),
    author:as.map(x=>{const p={'@type':'Person',name:x.name};if(x.orcid)p.sameAs='https://orcid.org/'+x.orcid;if(x.affiliation)p.affiliation={'@type':'Organization',name:x.affiliation?.[l.key]||x.affiliation?.en||x.affiliation};return p;}),
    keywords:a.keywords?.[sourceLanguage]||a.keywords?.en||'',
    isAccessibleForFree:true,
    publisher:{'@type':'Organization',name:'Russian Language Studies'},
    inLanguage:sourceLanguage,isPartOf:{'@type':'Periodical',name:l.journal,url:BASE+l.prefix},
    pagination:String(a.firstPage)+'-'+String(a.lastPage),url:url,
    mainEntityOfPage:{'@type':'WebPage','@id':url},
    encoding:{'@type':'MediaObject',contentUrl:citationPdfUrl,encodingFormat:'application/pdf'}
  };
  if(a.doi) ld.identifier='https://doi.org/'+a.doi.replace(/^https?:\/\/doi\.org\//,'');
  return setCanonical(setJsonLd(html,ld),url);
}

const ctx={window:{},document:{addEventListener(){}}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/articles-data.js','utf8'),ctx);
const articles=ctx.window.RLS_ARTICLES||[];
if(!Array.isArray(articles))throw new Error('RLS_ARTICLES is invalid');
const published=articles.filter(a=>a&&a.status==='published');

for(const a of published){
  for(const req of ['id','href','pdf','online','firstPage','lastPage','volume','issueNumber','title','author'])if(!a[req])throw new Error('Missing '+req+' for '+a.id);
  if(!/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(a.online))throw new Error('Invalid online date for '+a.id);
  if(Number(a.lastPage)<Number(a.firstPage))throw new Error('Invalid pagination for '+a.id);
  const pdfPath=a.pdf.replace(/^https?:\/\/[^/]+\//,'').replace(/^\//,'');
  if(!fs.existsSync(pdfPath))throw new Error('Missing PDF: '+pdfPath);
  const bytes=fs.readFileSync(pdfPath),raw=bytes.toString('latin1');
  if(bytes.length>5*1024*1024)throw new Error('PDF exceeds 5MB: '+pdfPath);
  if(raw.slice(0,5)!=='%PDF-')throw new Error('Not a PDF: '+pdfPath);
  let searchable=false;
  try { searchable=!!execFileSync('pdftotext',[pdfPath,'-'],{encoding:'utf8',maxBuffer:20*1024*1024}).trim(); } catch {}
  if(!searchable) searchable=raw.includes('/ToUnicode') || raw.includes('/Type/Page') || raw.includes('/Type /Page');
  if(!searchable)throw new Error('PDF does not expose searchable text: '+pdfPath);
  for(const l of langs){
    const page=l.prefix+a.href.replace(/^\//,'');
    if(!fs.existsSync(page))throw new Error('Missing article page: '+page);
    const localPdfPath = path.join(l.prefix, path.basename(pdfPath));
    if(path.resolve(localPdfPath)!==path.resolve(pdfPath)) fs.copyFileSync(pdfPath, localPdfPath);
    fs.writeFileSync(page,sync(fs.readFileSync(page,'utf8'),a,l));
  }
}

function pageKeywords(file,l){
  const f=file.toLowerCase();
  const fa = ['مطالعات زبان روسی','زبان روسی','آموزش زبان روسی','مقالات روسی','پژوهش زبان روسی','زبان‌شناسی روسی','ادبیات روسیه','فرهنگ روسیه','ترجمه روسی','نشریه علمی زبان روسی','دوفصلنامه مطالعات زبان روسی'];
  const en = ['Russian Language Studies','Russian language','Russian language education','Russian language articles','Russian linguistics','Russian literature','Russian culture','Russian translation','academic journal Russian language','Russian language research','Russian as a foreign language'];
  const ru = ['исследования по русскому языку','русский язык','обучение русскому языку','статьи о русском языке','русская лингвистика','русская литература','русская культура','перевод с русского языка','научный журнал русского языка','исследования русского языка','русский язык как иностранный'];
  const base=l.key==='fa'?fa:l.key==='ru'?ru:en;
  if(/article|articles|issue|issues/.test(f)) return [...base,...(l.key==='fa'?['مقاله پژوهشی','مقالات علمی','شماره نخست نشریه']:l.key==='ru'?['научные статьи','исследовательские статьи','выпуск журнала']:['research articles','scholarly articles','journal issue'])].join(', ');
  if(/editorial|author|authors|review|ethics|policy|guideline|about|contact|submit|copyright|privacy|verification|metrics/.test(f))
    return [...base,...(l.key==='fa'?['نشریه دانشگاهی','پژوهش‌های علمی','داوری علمی']:l.key==='ru'?['академический журнал','научные исследования','рецензирование статей']:['academic journal','scholarly research','peer review'])].join(', ');
  return base.join(', ');
}
function setKeywords(html,file,l){
  return setMeta(html,'keywords',pageKeywords(file,l));
}
function setPageDescription(html,file,l){
  const re=/<meta\\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i;
  if(re.test(html)) return html;
  const d=l.key==='fa'?'دوفصلنامه مطالعات زبان روسی؛ مقالات علمی و پژوهش‌های تخصصی در زبان روسی، آموزش زبان، زبان‌شناسی، ادبیات، فرهنگ و ترجمه.':l.key==='ru'?'Научный журнал «Исследования по русскому языку»: статьи и исследования по русскому языку, обучению, лингвистике, литературе, культуре и переводу.':'Russian Language Studies: scholarly articles and research on the Russian language, language education, linguistics, literature, culture and translation.';
  return setMeta(html,'description',d);
}

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())out.push(...walk(p));
    else if(ent.isFile()&&ent.name.toLowerCase().endsWith('.html'))out.push(p);
  }
  return out;
}
const entries=[];
for(const file of walk('.')){
  let h=fs.readFileSync(file,'utf8');
  const rel=file.replaceAll('\\\\','/');
  const l=rel.startsWith('en/')?langs[1]:rel.startsWith('ru/')?langs[2]:langs[0];
  h=setKeywords(h,rel,l);
  h=setPageDescription(h,rel,l);
  if(h!==fs.readFileSync(file,'utf8')) fs.writeFileSync(file,h);
  const robots=h.match(/<meta\s+name=["']robots["'][^>]*>/i)?.[0]||'';
  if(/noindex/i.test(robots))continue;
  const c=h.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if(!c||!c.startsWith(BASE))continue;
  if(c.includes('article-sample.html'))continue;
  const article=published.find(a=>langs.some(l=>urlFor(a,l)===c));
  entries.push({url:c,lastmod:article?.online ? isoDate(article.online) : undefined,priority:article?(c===urlFor(article,langs[0])?'1.0':'0.8'):'0.6'});
}
const unique=[...new Map(entries.map(x=>[x.url,x])).values()].sort((a,b)=>a.url.localeCompare(b.url));
let sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for(const e of unique){
  sitemap+='  <url>\n    <loc>'+e.url+'</loc>\n';
  if(e.lastmod)sitemap+='    <lastmod>'+e.lastmod+'</lastmod>\n';
  sitemap+='    <changefreq>'+(e.lastmod?'monthly':'weekly')+'</changefreq>\n    <priority>'+e.priority+'</priority>\n  </url>\n';
}
fs.writeFileSync('sitemap.xml',sitemap+'</urlset>\n');

const feed=published.slice().sort((a,b)=>String(b.online).localeCompare(String(a.online))).map(a=>{
  const u=urlFor(a,langs[0]);
  return '  <entry>\n    <title>'+esc(a.title.en)+'</title>\n    <id>'+u+'</id>\n    <link href="'+u+'"/>\n    <updated>'+a.online+'T00:00:00Z</updated>\n    <summary>'+esc(a.abstract?.en||'')+'</summary>\n    <author><name>'+esc(a.author)+'</name></author>\n  </entry>';
}).join('\n');
fs.writeFileSync('feed.xml','<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>Russian Language Studies</title>\n  <id>'+BASE+'</id>\n  <link href="'+BASE+'feed.xml" rel="self"/>\n  <link href="'+BASE+'"/>\n  <updated>'+(published[0]?.online||new Date().toISOString().slice(0,10))+'T00:00:00Z</updated>\n'+feed+'\n</feed>\n');
console.log('Synchronized '+published.length+' published articles and '+unique.length+' canonical HTML URLs.');