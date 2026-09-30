import fs from 'fs';
import vm from 'vm';

const langs = [
  { key: 'fa', prefix: '', dir: 'rtl', journal: 'دوفصلنامه مطالعات زبان روسی' },
  { key: 'en', prefix: 'en/', dir: 'ltr', journal: 'Russian Language Studies' },
  { key: 'ru', prefix: 'ru/', dir: 'ltr', journal: 'Исследования по русскому языку' }
];

const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const abs = p => p.startsWith('http') ? p : 'https://rlsj.ir/' + p.replace(/^\//,'');
const tag = (n,v) => '<meta name="' + n + '" content="' + esc(v) + '">';

function setMeta(html, name, value) {
  const re = new RegExp('<meta\\s+name=["\\']' + name + '["\\'][^>]*>', 'i');
  const t = tag(name, value);
  return re.test(html) ? html.replace(re,t) : html.replace(/<\\/head>/i,t+'\\n</head>');
}
function setCanonical(html,url) {
  const t='<link rel="canonical" href="'+url+'">';
  return /<link\\s+rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link\\s+rel=["']canonical["'][^>]*>/i,t)
    : html.replace(/<\\/head>/i,t+'\\n</head>');
}
function setJsonLd(html,obj) {
  const t='<script type="application/ld+json">\\n'+JSON.stringify(obj,null,2)+'\\n</script>';
  return /<script type=["']application\\/ld\\+json["']>[\\s\\S]*?<\\/script>/i.test(html)
    ? html.replace(/<script type=["']application\\/ld\\+json["']>[\\s\\S]*?<\\/script>/i,t)
    : html.replace(/<\\/head>/i,t+'\\n</head>');
}
function urlFor(a,l){return 'https://rlsj.ir/'+l.prefix+a.href.replace(/^\//,'');}
function authors(a){return Array.isArray(a.authors)&&a.authors.length ? a.authors : [{name:a.author,orcid:a.orcid}];}
function sync(html,a,l){
  const url=urlFor(a,l), as=authors(a);
  html=setMeta(html,'citation_title',a.title?.en || a.title?.[l.key] || a.id);
  html=setMeta(html,'citation_publication_date',a.online);
  html=setMeta(html,'citation_firstpage',a.firstPage);
  html=setMeta(html,'citation_lastpage',a.lastPage);
  html=setMeta(html,'citation_journal_title','Russian Language Studies');
  html=setMeta(html,'citation_volume',a.volume || '1');
  html=setMeta(html,'citation_issue',a.issueNumber || '1');
  html=setMeta(html,'citation_fulltext_world_readable','true');
  html=setMeta(html,'citation_pdf_url',abs(a.pdf));
  html=setMeta(html,'citation_online_date',a.online);
  html=setMeta(html,'robots','index,follow');
  if(a.issn) html=setMeta(html,'citation_issn',a.issn);
  as.forEach((x,i)=>{
    if(i===0) html=setMeta(html,'citation_author',x.name);
    else if(!new RegExp('<meta\\s+name=["\\']citation_author["\\']', 'i').test(html.split('</head>')[0].slice(-5000))) {
      html=html.replace(/<\\/head>/i,tag('citation_author',x.name)+'\\n</head>');
    }
  });
  html=setCanonical(html,url);
  const ld={
    '@context':'https://schema.org',
    '@type':'ScholarlyArticle',
    '@id':url+'#article',
    headline:a.title?.[l.key] || a.title?.en,
    datePublished:a.online,
    author:as.map(x=>{const p={'@type':'Person',name:x.name}; if(x.orcid)p.sameAs='https://orcid.org/'+x.orcid; return p;}),
    inLanguage:l.key,
    isPartOf:{'@type':'Periodical',name:l.journal},
    pagination:String(a.firstPage)+'-'+String(a.lastPage),
    url:url,
    mainEntityOfPage:{'@type':'WebPage','@id':url},
    encoding:{'@type':'MediaObject',contentUrl:abs(a.pdf),encodingFormat:'application/pdf'}
  };
  if(a.doi) ld.identifier='https://doi.org/'+a.doi.replace(/^https?:\\/\\/doi.org\\//,'');
  return setJsonLd(html,ld);
}

const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/articles-data.js','utf8'),ctx);
const articles=ctx.window.RLS_ARTICLES || [];
if(!Array.isArray(articles)) throw new Error('RLS_ARTICLES is invalid');

const changed=[];
for(const a of articles.filter(x=>x && x.status==='published')){
  for(const req of ['href','pdf','online','firstPage','lastPage']) if(!a[req]) throw new Error('Missing '+req+' for '+a.id);
  for(const l of langs){
    const path=l.prefix+a.href.replace(/^\//,'');
    if(!fs.existsSync(path)) throw new Error('Missing article page: '+path);
    const old=fs.readFileSync(path,'utf8'), next=sync(old,a,l);
    if(next!==old){fs.writeFileSync(path,next);changed.push(path);}
  }
}

let sitemap=fs.readFileSync('sitemap.xml','utf8');
for(const a of articles.filter(x=>x && x.status==='published')) for(const l of langs){
  const u=urlFor(a,l);
  if(!sitemap.includes('<loc>'+u+'</loc>')){
    sitemap=sitemap.replace('</urlset>','  <url>\\n    <loc>'+u+'</loc>\\n    <changefreq>monthly</changefreq>\\n    <priority>1.0</priority>\\n  </url>\\n</urlset>');
  }
}
if(sitemap!==fs.readFileSync('sitemap.xml','utf8')){fs.writeFileSync('sitemap.xml',sitemap);changed.push('sitemap.xml');}
console.log(changed.length ? 'Changed: '+changed.join(', ') : 'No changes.');
