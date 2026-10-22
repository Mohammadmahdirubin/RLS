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
function setProperty(html,property,value) {
  const re = new RegExp('<meta\\s+property="' + property + '"[^>]*>','i');
  const t = '<meta property="' + property + '" content="' + esc(value) + '">';
  return re.test(html) ? html.replace(re,t) : insertHead(html,t);
}
function shortText(value,max=170) {
  const s=String(value||'').replace(/\s+/g,' ').trim();
  if(s.length<=max)return s;
  let out=s.slice(0,max-1),i=out.lastIndexOf(' ');
  if(i>max*0.6)out=out.slice(0,i);
  return out.replace(/[,:;—-]+$/,'').trim()+'…';
}
function setAlternates(html,a) {
  const links=langs.map(l=>'<link rel="alternate" hreflang="'+l.key+'" href="'+urlFor(a,l)+'">');
  links.push('<link rel="alternate" hreflang="x-default" href="'+urlFor(a,langs[0])+'">');
  html=html.replace(/<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>\s*/gi,'');
  return insertHead(html,links.join('\n'));
}
function setJsonLd(html,obj) {
  const re=/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i;
  const t='<script type="application/ld+json">\n'+JSON.stringify(obj,null,2)+'\n</script>';
  return re.test(html) ? html.replace(re,t) : insertHead(html,t);
}
function urlFor(a,l){return BASE+l.prefix+a.href.replace(/^\//,'');}
function authors(a,l){
  if(Array.isArray(a.authors)&&a.authors.length){
    return a.authors.map(x=>({
      name: typeof x.name === 'object' ? (x.name?.[l.key]||x.name?.en||x.name?.fa||x.name?.ru||'') : String(x.name||''),
      orcid: x.orcid || '',
      affiliation: x.affiliation || ''
    })).filter(x=>x.name.trim());
  }
  const names=String(a.author||'').split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
  const orcids=String(a.orcid||'').split(/\s*;\s*/).map(x=>x.trim());
  return names.map((name,i)=>({name,orcid:names.length===1?(orcids[0]||''):(orcids[i]||''),affiliation:a.affiliation||''}));
}

function sync(html,a,l){
  const url=urlFor(a,l), as=authors(a,l);
  const sourceLanguage=a.language||a.sourceLanguage||'en';
  // Keep the Scholar PDF in the same directory as each language's abstract page.
  const citationPdfUrl = abs(a.pdf);
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
  const localAbstract=a.abstract?.[l.key]||a.abstract?.[sourceLanguage]||a.abstract?.en||'';
  const description=shortText(localAbstract,170);
  const localTitle=a.title?.[l.key]||a.title?.en||a.id;
  html=setMeta(html,'description',description);
  html=setMeta(html,'twitter:card','summary');
  html=setMeta(html,'twitter:title',localTitle);
  html=setMeta(html,'twitter:description',description);
  html=setProperty(html,'og:title',localTitle);
  html=setProperty(html,'og:description',description);
  html=setProperty(html,'og:url',url);
  html=setProperty(html,'og:type','article');
  html=setProperty(html,'og:site_name',l.journal);
  html=setMeta(html,'robots','index,follow');
  if(a.issn) html=setMeta(html,'citation_issn',a.issn);
  const ld={
    '@context':'https://schema.org','@type':'ScholarlyArticle','@id':url+'#article',
    headline:a.title?.[l.key]||a.title?.en,description:a.abstract?.[l.key]||a.abstract?.en||'',
    datePublished:isoDate(a.online),dateModified:isoDate(a.online),
    author:as.map(x=>{
      const p={'@type':'Person',name:x.name};
      if(x.orcid&&!String(x.orcid).includes(';'))p.sameAs='https://orcid.org/'+x.orcid;
      const aff=typeof x.affiliation==='object'?(x.affiliation?.[l.key]||x.affiliation?.en||x.affiliation?.fa||x.affiliation?.ru||''):String(x.affiliation||'');
      if(aff.trim())p.affiliation={'@type':'Organization',name:aff};
      return p;
    }),
    keywords:a.keywords?.[sourceLanguage]||a.keywords?.en||'',
    isAccessibleForFree:true,
    publisher:{'@type':'Organization',name:'Russian Language Studies'},
    inLanguage:sourceLanguage,isPartOf:{'@type':'Periodical',name:l.journal,url:BASE+l.prefix},
    pagination:String(a.firstPage)+'-'+String(a.lastPage),url:url,
    mainEntityOfPage:{'@type':'WebPage','@id':url},
    encoding:{'@type':'MediaObject',contentUrl:citationPdfUrl,encodingFormat:'application/pdf'}
  };
  if(a.doi) ld.identifier='https://doi.org/'+a.doi.replace(/^https?:\/\/doi\.org\//,'');
  return setAlternates(setCanonical(setJsonLd(html,ld),url),a);
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
  const re=/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i;
  if(re.test(html)) return html;
  const d=l.key==='fa'?'دوفصلنامه مطالعات زبان روسی؛ مقالات علمی و پژوهش‌های تخصصی در زبان روسی، آموزش زبان، زبان‌شناسی، ادبیات، فرهنگ و ترجمه.':l.key==='ru'?'Научный журнал «Исследования по русскому языку»: статьи и исследования по русскому языку, обучению, лингвистике, литературе, культуре и переводу.':'Russian Language Studies: scholarly articles and research on the Russian language, language education, linguistics, literature, culture and translation.';
  return setMeta(html,'description',d);
}
function legacyArticleDescription(html,l){
  const head=html.match(/<head[\s\S]*?<\/head>/i)?.[0]||'';
  const og=head.match(/<meta\s+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]||'';
  const generic=/article record|abstract and metadata|research article by|научная статья\s+[А-ЯЁа-яё]+\s+о|карточка статьи|научный журнал.*статьи и исследования|scholarly articles and research|مقاله پژوهشی\s+.{1,50}\s+درباره|مقالات علمی و پژوهش‌های تخصصی/i;
  const langMatch=l.key==='fa'?/[\u0600-\u06FF]/.test(og):l.key==='ru'?/[А-Яа-яЁё]/.test(og):/[A-Za-z]/.test(og);
  if(og&&!generic.test(og)&&langMatch)return shortText(og,170);
  const body=html.slice(html.search(/<\/head>/i)+7);
  const re=l.key==='fa'?/<h[23][^>]*>[^<]*(?:چکیده|چکیده فارسی)[^<]*<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/i:l.key==='ru'?/<h[23][^>]*>\s*(?:Аннотация|Резюме)[^<]*<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/i:/<h[23][^>]*>\s*Abstract(?:\s*\(English\))?\s*<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/i;
  const m=body.match(re);
  if(m&&m[1])return shortText(m[1].replace(/<[^>]*>/g,' '),170);
  const title=head.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]||body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
  return shortText(title+(l.key==='fa'?'؛ مقاله منتشرشده در دوفصلنامه مطالعات زبان روسی.':l.key==='ru'?' — научная статья журнала «Исследования по русскому языку».':' — research article in Russian Language Studies.'),170);
}

function walk(dir){
  const out=[];
  const normalizedDir=dir.replace(/\\/g,"/");
  if(/(^|\/)(en\/en|ru\/ru)(\/|$)/.test(normalizedDir))return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())out.push(...walk(p));
    else if(ent.isFile()&&ent.name.toLowerCase().endsWith('.html'))out.push(p);
  }
  return out;
}

const entries=[];const entries=[];
for(const file of walk('.')){
  let h=fs.readFileSync(file,'utf8');
  const rel=file.replaceAll('\\\\','/');
  // Exclude accidental duplicate redirect paths (en/en and ru/ru) from the sitemap.
  if (/^(?:en\/en|ru\/ru)\//i.test(rel)) continue;
  const l=rel.startsWith('en/')?langs[1]:rel.startsWith('ru/')?langs[2]:langs[0];
  h=setKeywords(h,rel,l);
  h=setPageDescription(h,rel,l);
  const basename=path.basename(rel);
  if(/^article-.*\.html$/i.test(basename)){
    const canonicalUrl=BASE+rel;
    const localTitle=h.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]||h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||basename;
    const description=legacyArticleDescription(h,l);
    h=setMeta(h,'description',description);
    h=setMeta(h,'twitter:card','summary');
    h=setMeta(h,'twitter:title',localTitle);
    h=setMeta(h,'twitter:description',description);
    h=setProperty(h,'og:title',localTitle);
    h=setProperty(h,'og:description',description);
    h=setProperty(h,'og:url',canonicalUrl);
    h=setProperty(h,'og:type','article');
    h=setProperty(h,'og:site_name',l.journal);
    h=setProperty(h,'og:locale',l.key==='fa'?'fa_IR':l.key==='ru'?'ru_RU':'en_US');
    h=setCanonical(h,canonicalUrl);
    if(langs.every(x=>fs.existsSync(path.join(x.prefix,basename))))h=setAlternates(h,{href:basename});
  }
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
let sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
for(const e of unique){
  sitemap+='  <url>\n    <loc>'+e.url+'</loc>\n';
  let articleName='';
  try{articleName=path.basename(new URL(e.url).pathname)}catch{}
  const hasAllLanguages=/^article-.*\.html$/i.test(articleName)&&langs.every(l=>fs.existsSync(path.join(l.prefix,articleName)));
  if(hasAllLanguages){
    for(const alt of langs)sitemap+='    <xhtml:link rel="alternate" hreflang="'+alt.key+'" href="'+BASE+alt.prefix+articleName+'" />\n';
    sitemap+='    <xhtml:link rel="alternate" hreflang="x-default" href="'+BASE+articleName+'" />\n';
  }
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