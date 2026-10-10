import fs from 'fs';
import vm from 'vm';
import { execFileSync } from 'child_process';

const BASE='https://rlsj.ir/';
const langs=[['fa',''],['en','en/'],['ru','ru/']];
const errors=[];
const ctx={window:{},document:{addEventListener(){}}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/articles-data.js','utf8'),ctx);
const articles=ctx.window.RLS_ARTICLES||[];
function read(p){return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null}
function meta(h,n){return h.match(new RegExp('<meta\\s+name=["\']'+n+'["\'][^>]*content=["\']([^"\']*)["\']','i'))?.[1]||null}
function canon(h){return h.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]||null}
function ld(h){const m=h.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);try{return m?JSON.parse(m[1]):null}catch{return null}}
for(const a of articles.filter(x=>x?.status==='published')){
  for(const [k,prefix] of langs){
    const p=prefix+a.href,h=read(p),u=BASE+p;
    if(!h){errors.push('Missing page '+p);continue}
    for(const n of ['citation_title','citation_author','citation_publication_date','citation_firstpage','citation_lastpage','citation_journal_title','citation_volume','citation_issue','citation_fulltext_world_readable','citation_pdf_url','robots'])if(!meta(h,n))errors.push(p+': missing '+n);
    if(meta(h,'robots')!=='index,follow')errors.push(p+': robots must be index,follow');
    if(canon(h)!==u)errors.push(p+': canonical mismatch');
    const expectedPdf=BASE+(a.pdf.startsWith('/')?a.pdf.slice(1):a.pdf);
    if(meta(h,'citation_pdf_url')!==expectedPdf)errors.push(p+': citation_pdf_url mismatch; expected '+expectedPdf);
    const j=ld(h);if(!j||j['@type']!=='ScholarlyArticle')errors.push(p+': missing ScholarlyArticle JSON-LD');
    if(j?.url!==u)errors.push(p+': JSON-LD URL mismatch');
  }
  const pdf=a.pdf.replace(/^https?:\/\/[^/]+\//,'').replace(/^\//,'');
  if(!fs.existsSync(pdf))errors.push('Missing PDF '+pdf);
  else{const b=fs.readFileSync(pdf),r=b.toString('latin1');if(b.length>5*1024*1024)errors.push(pdf+': over 5MB');if(r.slice(0,5)!=='%PDF-')errors.push(pdf+': invalid PDF');let searchable=false;try{searchable=!!execFileSync('pdftotext',[pdf,'-'],{encoding:'utf8',maxBuffer:20*1024*1024}).trim()}catch{}if(!searchable)searchable=r.includes('/ToUnicode')||r.includes('/Type/Page')||r.includes('/Type /Page');if(!searchable)errors.push(pdf+': searchable text missing')}
}
const robots=read('robots.txt')||'';if(!robots.includes('Allow: /'))errors.push('robots.txt does not allow /');if(!robots.includes('Sitemap: https://rlsj.ir/sitemap.xml'))errors.push('robots.txt missing sitemap');
const sm=read('sitemap.xml')||'';for(const a of articles.filter(x=>x?.status==='published'))for(const [k,prefix] of langs){const u=BASE+prefix+a.href;if(!sm.includes('<loc>'+u+'</loc>'))errors.push('sitemap missing '+u)}
if(!fs.existsSync('feed.xml'))errors.push('feed.xml missing');
if(errors.length){console.error('SEO AUDIT FAILED');errors.forEach(x=>console.error('ERROR: '+x));process.exit(1)}
console.log('SEO AUDIT PASSED: '+articles.filter(x=>x?.status==='published').length+' published articles validated.');