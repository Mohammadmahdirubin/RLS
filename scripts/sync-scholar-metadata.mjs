import fs from 'fs';
import path from 'path';
import vm from 'vm';

const BASE = 'https://rlsj.ir/';
const langs = [
  { key: 'fa', prefix: '', journal: 'دوفصلنامه مطالعات زبان روسی' },
  { key: 'en', prefix: 'en/', journal: 'Russian Language Studies' },
  { key: 'ru', prefix: 'ru/', journal: 'Исследования по русскому языку' }
];

const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const abs = p => /^https?:\/\//i.test(p) ? p : BASE + String(p).replace(/^\//,'');
const tag = (n,v) => '<meta name="' + n + '" content="' + esc(v) + '">';

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
  html=setMeta(html,'citation_title',a.title?.en||a.title?.[l.key]||a.id);
  html=setAuthors(html,as.map(x=>x.name));
  html=setMeta(html,'citation_publication_date',a.online);
  html=setMeta(html,'citation_firstpage',a.firstPage);
  html=setMeta(html,'citation_lastpage',a.lastPage);
  html=setMeta(html,'citation_journal_title','Russian Language Studies');
  html=setMeta(html,'citation_volume',a.volume);
  html=setMeta(html,'citation_issue',a.issueNumber);
  html=setMeta(html,'citation_fulltext_world_readable','true');
  html=setMeta(html,'citation_pdf_url',abs(a.pdf));
  html=setMeta(html,'robots','index,follow');
  if(a.issn) html=setMeta(html,'citation_issn',a.issn);
  const ld={
    '@context':'https://schema.org','@type':'ScholarlyArticle','@id':url+'#article',
    headline:a.title?.[l.key]||a.title?.en,description:a.abstract?.[l.key]||a.abstract?.en||'',
    datePublished:a.online,dateModified:a.online,
    author:as.map(x=>{const p={'@type':'Person',name:x.name};if(x.orcid)p.sameAs='https://orcid.org/'+x.orcid;return p;}),
    inLanguage:l.key,isPartOf:{'@type':'Periodical',name:l.journal,url:BASE+l.prefix},
    pagination:String(a.firstPage)+'-'+String(a.lastPage),url:url,
    mainEntityOfPage:{'@type':'WebPage','@id':url},
    encoding:{'@type':'MediaObject',contentUrl:abs(a.pdf),encodingFormat:'application/pdf'}
  };
  if(a.doi) ld.identifier='https://doi.org/'+a.doi.replace(/^https?:\/\/doi\.org\//,'');
  return setCanonical(setJsonLd(html,ld),url);
}

const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/articles-data.js','utf8'),ctx);
const articles=ctx.window.RLS_ARTICLES||[];
if(!Array.isArray(articles))throw new Error('RLS_ARTICLES is invalid');
const published=articles.filter(a=>a&&a.status==='published');

for(const a of published){
  for(const req of ['id','href','pdf','online','firstPage','lastPage','volume','issueNumber','title','author'])if(!a[req])throw new Error('Missing '+req+' for '+a.id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(a.online))throw new Error('Invalid online date for '+a.id);
  if(Number(a.lastPage)<Number(a.firstPage))throw new Error('Invalid pagination for '+a.id);
  const pdfPath=a.pdf.replace(/^https?:\/\/[^/]+\//,'').replace(/^\//,'');
  if(!fs.existsSync(pdfPath))throw new Error('Missing PDF: '+pdfPath);
  const bytes=fs.readFileSync(pdfPath),raw=bytes.toString('latin1');
  if(bytes.length>5*1024*1024)throw new Error('PDF exceeds 5MB: '+pdfPath);
  if(raw.slice(0,5)!=='%PDF-')throw new Error('Not a PDF: '+pdfPath);
  if(!raw.includes('/ToUnicode')||!raw.includes('/Type /Page'))throw new Error('PDF lacks searchable-text indicators: '+pdfPath);
  for(const l of langs){
    const page=l.prefix+a.href.replace(/^\//,'');
    if(!fs.existsSync(page))throw new Error('Missing article page: '+page);
    fs.writeFileSync(page,sync(fs.readFileSync(page,'utf8'),a,l));
  }
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
  const h=fs.readFileSync(file,'utf8');
  const robots=h.match(/<meta\s+name=["']robots["'][^>]*>/i)?.[0]||'';
  if(/noindex/i.test(robots))continue;
  const c=h.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if(!c||!c.startsWith(BASE))continue;
  if(c.includes('article-sample.html'))continue;
  const article=published.find(a=>langs.some(l=>urlFor(a,l)===c));
  entries.push({url:c,lastmod:article?.online,priority:article?(c===urlFor(article,langs[0])?'1.0':'0.8'):'0.6'});
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