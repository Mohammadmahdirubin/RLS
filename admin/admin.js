const OWNER="Mohammadmahdirubin";
const REPO="RLS";
const API="https://api.github.com";
let token="";

async function github(path,options){
  const opts=options||{};
  opts.headers=Object.assign({
    "Accept":"application/vnd.github+json",
    "Authorization":"Bearer "+token,
    "X-GitHub-Api-Version":"2022-11-28"
  },opts.headers||{});
  const response=await fetch(API+path,opts);
  let data={};
  try{data=await response.json();}catch(e){}
  if(!response.ok) throw new Error(data.message||("GitHub HTTP "+response.status));
  return data;
}

function utf8Base64(text){
  const bytes=new TextEncoder().encode(text);
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  }
  return btoa(binary);
}

function base64Utf8(value){
  const binary=atob(value.replace(/\n/g,""));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function pathUrl(path){
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getFile(path){
  const data=await github("/repos/"+OWNER+"/"+REPO+"/contents/"+pathUrl(path));
  if(Array.isArray(data)) throw new Error("مسیر فایل نیست: "+path);
  return {text:base64Utf8(data.content||""),sha:data.sha};
}

async function putText(path,content,message,sha){
  const body={message:message,content:utf8Base64(content)};
  if(sha) body.sha=sha;
  return github("/repos/"+OWNER+"/"+REPO+"/contents/"+pathUrl(path),{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
}

async function putBinary(path,file,message,sha){
  const buffer=await file.arrayBuffer();
  const bytes=new Uint8Array(buffer);
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  }
  const body={message:message,content:btoa(binary)};
  if(sha) body.sha=sha;
  return github("/repos/"+OWNER+"/"+REPO+"/contents/"+pathUrl(path),{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
}

function esc(value){
  return String(value==null?"":value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function attr(value){return esc(value);}

function slugify(value){
  return String(value||"").toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,90);
}

function isoDate(value){
  return value?value.replace(/-/g,"/"):"";
}

function isoDateDash(value){
  return value?value.replace(/\//g,"-"):"";
}

function splitList(value){
  return String(value||"").split(/[;،,\n]+/).map(function(x){return x.trim();}).filter(Boolean);
}

function parseAuthors(value){
  return String(value||"").split(/\n+/).map(function(line){
    const p=line.split("|").map(function(x){return x.trim();});
    if(!p[0]||!p[1]) return null;
    if(p.length>=7){
      return {fa:p[0],en:p[1],ru:p[2]||p[1],affFa:p[3]||"",affEn:p[4]||p[3]||"",affRu:p[5]||p[3]||"",orcid:p[6]||""};
    }
    return {fa:p[0],en:p[1],ru:p[2]||p[1],affFa:p[3]||"",affEn:p[3]||"",affRu:p[3]||"",orcid:p[4]||""};
  }).filter(Boolean);
}

function parseRegistry(text){
  const start=text.indexOf("[");
  const end=text.lastIndexOf("]");
  if(start<0||end<0) throw new Error("ساختار assets/articles-data.js قابل خواندن نیست.");
  return JSON.parse(text.slice(start,end+1));
}

function registryText(items){
  return "window.RLS_ARTICLES = "+JSON.stringify(items,null,2)+";\n";
}

function nextNumber(items){
  let n=0;
  items.forEach(function(a){n=Math.max(n,Number(a.number)||0);});
  return n+1;
}

function authorNames(items,key){
  return items.map(function(a){return a[key];}).filter(Boolean).join(" · ");
}

function orcidUrl(orcid){
  return /^\\d{4}-\\d{4}-\\d{4}-\\d{3}[0-9X]$/i.test(orcid)?"https://orcid.org/"+orcid:"";
}

function buildArticlePage(a,lang){
  const titleFa=a.title.fa, titleEn=a.title.en, titleRu=a.title.ru;
  const title=lang==="fa"?titleEn:(lang==="en"?titleEn:titleRu);
  const sub=lang==="fa"?titleFa:(lang==="en"?titleFa:titleEn);
  const siteName=lang==="fa"?"دوفصلنامه مطالعات زبان روسی":(lang==="en"?"Russian Language Studies":"Исследования по русскому языку");
  const dir=lang==="fa"?"rtl":"ltr";
  const langName=lang==="fa"?"فارسی":(lang==="en"?"English":"Русский");
  const articleType=a.type[lang]||a.type.en;
  const canonical="https://rlsj.ir/"+(lang==="fa"?"":lang+"/")+a.slug+".html";
  const faAuthors=a.authors.map(function(x){return "<p><b>"+esc(x.fa)+"</b></p><p dir=\"ltr\"><b>"+esc(x.en)+"</b></p>"+(x.affFa?"<p>"+esc(x.affFa)+"</p>":"")+(x.orcid&&orcidUrl(x.orcid)?"<p><b>ORCID iD:</b> <a dir=\"ltr\" href=\""+attr(orcidUrl(x.orcid))+"\" target=\"_blank\" rel=\"noopener\">"+esc(x.orcid)+"</a></p>":"");}).join("");
  const enAuthors=a.authors.map(function(x){return "<p><b>"+esc(x.en)+"</b></p>"+(x.affEn?"<p>"+esc(x.affEn)+"</p>":"")+(x.orcid&&orcidUrl(x.orcid)?"<p><b>ORCID iD:</b> <a dir=\"ltr\" href=\""+attr(orcidUrl(x.orcid))+"\" target=\"_blank\" rel=\"noopener\">"+esc(x.orcid)+"</a></p>":"");}).join("");
  const ruAuthors=a.authors.map(function(x){return "<p><b>"+esc(x.ru)+"</b></p>"+(x.affRu?"<p>"+esc(x.affRu)+"</p>":"")+(x.orcid&&orcidUrl(x.orcid)?"<p><b>ORCID iD:</b> <a dir=\"ltr\" href=\""+attr(orcidUrl(x.orcid))+"\" target=\"_blank\" rel=\"noopener\">"+esc(x.orcid)+"</a></p>":"");}).join("");
  const authorMeta=a.authors.map(function(x){return x.en;}).filter(Boolean).join("; ");
  const pdfHref=(lang==="fa"?"": "../")+"../"+a.pdf;
  const pdfRelative=lang==="fa"?a.pdf:"../"+a.pdf;
  const absLabel=lang==="fa"?"چکیده":(lang==="en"?"Abstract":"Аннотация");
  const keyLabel=lang==="fa"?"کلیدواژه‌ها":(lang==="en"?"Keywords":"Ключевые слова");
  const dateLabel=lang==="fa"?["دریافت","پذیرش","انتشار آنلاین"]:lang==="en"?["Received","Accepted","Online publication"]:["Поступление","Принятие","Онлайн-публикация"];
  const pagesLabel=lang==="fa"?"صفحات":lang==="en"?"Pages":"Страницы";
  const typeLabel=lang==="fa"?"نوع مقاله":lang==="en"?"Article type":"Тип статьи";
  const issueLabel=lang==="fa"?"دوره / شماره":lang==="en"?"Volume / Issue":"Том / выпуск";
  const languageLabel=lang==="fa"?"زبان":lang==="en"?"Language":"Язык";
  const doiLabel=lang==="fa"?"در انتظار اختصاص":lang==="en"?"Pending":"Не присвоен";
  const pdfView=lang==="fa"?"مشاهده PDF":lang==="en"?"View PDF":"Просмотреть PDF";
  const pdfDownload=lang==="fa"?"دانلود PDF":lang==="en"?"Download PDF":"Скачать PDF";
  const received=isoDate(a.received), accepted=isoDate(a.accepted), online=isoDate(a.online);
  const articleNo=String(a.number);
  const first=a.authors[0]||{en:""};
  const citationAuthors=a.authors.map(function(x){return x.en;}).join(", ");
  const citation=citationAuthors+" ("+(a.online||"").slice(0,4)+"). “"+titleEn+".” <em>Russian Language Studies</em>, "+a.volume+"("+a.issueNumber+"), "+esc(a.firstPage)+"–"+esc(a.lastPage)+". Available at: <a href=\""+canonical+"\">"+canonical+"</a>. PDF: <a href=\"https://rlsj.ir/"+a.pdf+"\">https://rlsj.ir/"+a.pdf+"</a>. DOI: Pending.";
  const headDescription=esc((a.abstract&&a.abstract[lang])||a.abstract.en||a.title[lang]);
  const altFa="https://rlsj.ir/"+a.slug+".html";
  const altEn="https://rlsj.ir/en/"+a.slug+".html";
  const altRu="https://rlsj.ir/ru/"+a.slug+".html";
  const authorMetaTags=a.authors.map(function(x){return '<meta name="citation_author" content="'+attr(x.en)+'">';}).join("\n");
  const schemaAuthors=a.authors.map(function(x){return '{"@type":"Person","name":"'+esc(x.en).replace(/&quot;/g,'\\\"')+'"}';}).join(",");
  const pageBody=lang==="fa"?
    '<h2>'+absLabel+'</h2><p>'+esc(a.abstract.fa)+'</p><p class="stat-note"><strong>'+keyLabel+':</strong> '+esc(a.keywords.fa)+'</p><h2 dir="ltr">Article Title (English)</h2><p dir="ltr">'+esc(titleEn)+'</p><h2 dir="ltr">English Abstract</h2><p dir="ltr">'+esc(a.abstract.en)+'</p><h2 dir="ltr">Keywords</h2><p dir="ltr">'+esc(a.keywords.en)+'</p>':
    lang==="en"?
    '<h2>Abstract</h2><p>'+esc(a.abstract.en)+'</p><p class="stat-note"><strong>Keywords:</strong> '+esc(a.keywords.en)+'</p><h2>عنوان فارسی</h2><p dir="rtl">'+esc(titleFa)+'</p><h2 dir="rtl">چکیده فارسی</h2><p dir="rtl">'+esc(a.abstract.fa)+'</p><h2 dir="rtl">کلیدواژه‌ها</h2><p dir="rtl">'+esc(a.keywords.fa)+'</p>':
    '<h2>Аннотация</h2><p>'+esc(a.abstract.ru)+'</p><p class="stat-note"><strong>Ключевые слова:</strong> '+esc(a.keywords.ru)+'</p><h2 dir="ltr">English Title</h2><p dir="ltr">'+esc(titleEn)+'</p><h2 dir="ltr">English Abstract</h2><p dir="ltr">'+esc(a.abstract.en)+'</p><h2 dir="ltr">Keywords</h2><p dir="ltr">'+esc(a.keywords.en)+'</p>';
  const authorsBlock=lang==="fa"?faAuthors:(lang==="en"?enAuthors:ruAuthors);
  const journalBar=lang==="fa"?"دوفصلنامه مطالعات زبان روسی":(lang==="en"?"Russian Language Studies":"Исследования по русскому языку");
  const viewPath=lang==="fa"?a.pdf:"../"+a.pdf;
  const home=lang==="fa"?"index.html":"index.html";
  return '<!doctype html><html lang="'+lang+'" dir="'+dir+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' | '+esc(siteName)+'</title><meta name="description" content="'+headDescription+'"><meta name="author" content="'+attr(authorMeta)+'"><meta name="keywords" content="'+attr(a.keywords[lang]||"")+'"><meta name="robots" content="index,follow"><meta name="citation_title" content="'+attr(title)+'"><meta name="citation_publication_date" content="'+attr(isoDateDash(a.online))+'"><meta name="citation_firstpage" content="'+attr(a.firstPage)+'"><meta name="citation_lastpage" content="'+attr(a.lastPage)+'"><meta name="citation_journal_title" content="Russian Language Studies"><meta name="citation_volume" content="'+attr(a.volume)+'"><meta name="citation_issue" content="'+attr(a.issueNumber)+'"><meta name="citation_language" content="'+lang+'"><meta name="citation_fulltext_world_readable" content="true"><meta name="citation_pdf_url" content="https://rlsj.ir/'+a.pdf+'"><link rel="canonical" href="'+canonical+'"><link rel="alternate" hreflang="fa" href="'+altFa+'"><link rel="alternate" hreflang="en" href="'+altEn+'"><link rel="alternate" hreflang="ru" href="'+altRu+'"><link rel="alternate" hreflang="x-default" href="'+altFa+'"><meta property="og:type" content="article"><meta property="og:site_name" content="'+esc(siteName)+'"><meta property="og:title" content="'+esc(title)+' | '+esc(siteName)+'"><meta property="og:description" content="'+headDescription+'"><meta property="og:url" content="'+canonical+'"><meta property="og:locale" content="'+(lang==="fa"?"fa_IR":lang==="en"?"en_US":"ru_RU")+'"><meta property="article:published_time" content="'+attr(isoDateDash(a.online))+'"><link rel="stylesheet" href="'+(lang==="fa"?"":"../")+'assets/style.css?v=20261002admin"><link rel="stylesheet" href="'+(lang==="fa"?"":"../")+'assets/article-header-footer.css?v=20261002admin"><script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"ScholarlyArticle","@id":canonical+"#article","headline":title,"description":a.abstract[lang]||a.abstract.en,"datePublished":isoDateDash(a.online),"dateModified":isoDateDash(a.online),"author":a.authors.map(function(x){const o={"@type":"Person","name":x.en};if(orcidUrl(x.orcid))o.sameAs=orcidUrl(x.orcid);return o;}),"inLanguage":lang,"isPartOf":{"@type":"Periodical","name":"Russian Language Studies","url":"https://rlsj.ir/"},"pagination":a.firstPage+"-"+a.lastPage,"url":canonical,"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"encoding":{"@type":"MediaObject","contentUrl":"https://rlsj.ir/"+a.pdf,"encodingFormat":"application/pdf"}})+'</script>'+authorMetaTags+'</head><body><div class="rls-article-journal-bar" role="banner"><div class="container"><div class="rls-jbar-right"><strong>'+esc(journalBar)+'</strong><span class="rls-jbar-sep">|</span><span dir="ltr">Russian Language Studies (RLS)</span></div><div class="rls-jbar-left"><span>Vol. '+esc(a.volume)+' · Issue '+esc(a.issueNumber)+' · Article '+articleNo+' · '+esc(a.year||"")+'</span><span class="rls-jbar-sep">·</span><span>'+esc(a.firstPage)+"–"+esc(a.lastPage)+'</span><span class="rls-jbar-sep">·</span><span>'+esc(articleType)+'</span></div></div></div><header class="site-header"><div class="container header-inner"><a class="brand" href="'+home+'"><span class="brand-mark">RLS</span><span><strong dir="ltr">Russian Language Studies</strong><small>'+esc(siteName)+'</small></span></a><button class="menu-btn" aria-label="Menu">☰</button><nav class="main-nav"></nav></div></header><main><section class="page-hero"><div class="container"><div class="eyebrow">Volume '+esc(a.volume)+' · Issue '+esc(a.issueNumber)+' · Article '+articleNo+' · '+esc(a.firstPage)+"–"+esc(a.lastPage)+'</div><h1 dir="'+(lang==="fa"?"ltr":"ltr")+'">'+esc(title)+'</h1><p dir="'+(lang==="fa"?"rtl":"ltr")+'">'+esc(sub)+'</p></div></section><section class="section"><div class="container"><div class="article-layout"><article class="content"><div class="article-byline">'+authorsBlock+'</div><div class="notice" style="margin:18px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;"><strong>'+esc(lang==="fa"?"دانلود / مشاهده متن کامل":lang==="en"?"Full text":"Полный текст")+':</strong> <a class="button primary" dir="ltr" href="'+viewPath+'" download target="_blank" rel="noopener">'+pdfDownload+'</a> <a class="button secondary" dir="ltr" href="'+viewPath+'" target="_blank" rel="noopener">'+pdfView+'</a></div>'+pageBody+'<h2>'+esc(lang==="fa"?"اطلاعات انتشار":lang==="en"?"Publication information":"Сведения о публикации")+'</h2><div class="table-wrap"><table class="academic-table"><tr><th>'+esc(lang==="fa"?"مشخصات":lang==="en"?"Item":"Показатель")+'</th><th>'+esc(lang==="fa"?"اطلاعات":lang==="en"?"Information":"Информация")+'</th></tr><tr><td>'+dateLabel[0]+'</td><td>'+esc(received)+'</td></tr><tr><td>'+dateLabel[1]+'</td><td>'+esc(accepted)+'</td></tr><tr><td>'+dateLabel[2]+'</td><td>'+esc(online)+'</td></tr><tr><td>'+pagesLabel+'</td><td>'+esc(a.firstPage)+"–"+esc(a.lastPage)+'</td></tr></table></div><div class="citation-box" dir="ltr">'+citation+'</div></article><aside class="article-sidebar"><div class="side-card"><strong>'+esc(lang==="fa"?"اطلاعات مقاله":lang==="en"?"Article information":"Информация о статье")+'</strong><p>'+typeLabel+'<br><b>'+esc(articleType)+'</b></p><p>'+languageLabel+'<br><b>'+esc(langName)+'</b></p><p>'+issueLabel+'<br><b>'+esc(a.volume)+" / "+esc(a.issueNumber)+'</b></p><p>'+pagesLabel+'<br><b>'+esc(a.firstPage)+"–"+esc(a.lastPage)+'</b></p><p>'+dateLabel[0]+'<br><b>'+esc(received)+'</b></p><p>'+dateLabel[1]+'<br><b>'+esc(accepted)+'</b></p><p>'+dateLabel[2]+'<br><b>'+esc(online)+'</b></p><p>DOI<br><b>'+doiLabel+'</b></p><p><a class="button primary" dir="ltr" href="'+viewPath+'" target="_blank" rel="noopener">'+pdfView+'</a></p><p><a class="button secondary" dir="ltr" href="'+viewPath+'" download>'+pdfDownload+'</a></p></div><div class="side-card"><strong>'+esc(lang==="fa"?"نویسندگان":lang==="en"?"Authors":"Авторы")+'</strong>'+authorsBlock+'</div></aside></div></div></section></main><footer></footer><script src="'+(lang==="fa"?"":"../")+'assets/script.js?v=20261002admin"></script></body></html>';
}

function listRecord(a,lang){
  const title=a.title[lang]||a.title.en;
  const translation=lang==="fa"?a.title.en:(lang==="en"?a.title.fa:a.title.fa);
  const names=a.authors.map(function(x){return x.en;}).join(" · ");
  const aff=a.authors.map(function(x){return x["aff"+(lang==="fa"?"Fa":lang==="en"?"En":"Ru")];}).filter(Boolean).join(" · ");
  const type=a.type[lang]||a.type.en;
  const href=lang==="fa"?a.href:lang+"/"+a.href;
  const pdf=(lang==="fa"?a.pdf:"../"+a.pdf);
  const received=isoDate(a.received), online=isoDate(a.online);
  const intro=a.abstract[lang]||a.abstract.en;
  return '<article class="article-record"><div class="article-number"><strong>'+esc(lang==="fa"?"مقاله":lang==="en"?"Article":"Статья")+' '+esc(a.number)+'</strong></div><div class="article-type">'+esc(type)+'</div><h2>'+esc(title)+'</h2><p class="article-title-translation" style="font-size:.9em;line-height:1.8;margin:.25rem 0 1rem;color:var(--muted,#666);" dir="'+(lang==="en"?"rtl":"ltr")+'">'+esc(translation)+'</p><p class="authors"><strong>'+esc(names)+'</strong>'+ (aff?" · "+esc(aff):"")+'</p><div class="meta-grid"><div><span>'+esc(lang==="fa"?"دریافت":lang==="en"?"Received":"Поступление")+'</span><strong>'+esc(received)+'</strong></div><div><span>'+esc(lang==="fa"?"انتشار آنلاین":lang==="en"?"Online publication":"Онлайн-публикация")+'</span><strong>'+esc(online)+'</strong></div><div><span>'+esc(lang==="fa"?"دوره / شماره":lang==="en"?"Issue":"Выпуск")+'</span><strong>'+esc(a.volume)+(lang==="fa"?"، شماره ":" / ")+esc(a.issueNumber)+'</strong></div><div><span>'+esc(lang==="fa"?"صفحات":lang==="en"?"Pages":"Страницы")+'</span><strong>'+esc(a.firstPage)+"–"+esc(a.lastPage)+'</strong></div></div><p>'+esc(intro)+'</p><div class="article-actions"><span class="status">'+esc(lang==="fa"?"DOI: در انتظار اختصاص":lang==="en"?"DOI: Pending":"DOI: Не присвоен")+'</span> <a class="button secondary" href="'+href+'">'+esc(lang==="fa"?"باز کردن مقاله":lang==="en"?"View article":"Открыть статью")+'</a> <a class="button primary" href="'+pdf+'" target="_blank" rel="noopener">'+esc(lang==="fa"?"دانلود PDF":lang==="en"?"Download PDF":"Скачать PDF")+'</a></div></article>';
}

async function appendToArticleList(path,sha,content,a,lang){
  const marker='<div id="rls-article-list">';
  const start=content.indexOf(marker);
  if(start<0) throw new Error("فهرست مقالات در "+path+" پیدا نشد.");
  if(content.indexOf("href=\""+(lang==="fa"?a.href:lang+"/"+a.href)+"\"",start)>=0) return {content:content,sha:sha,changed:false};
  const close="</div></div></section></main>";
  const pos=content.indexOf(close,start);
  if(pos<0) throw new Error("محل درج مقاله در "+path+" پیدا نشد.");
  const next=content.slice(0,pos)+listRecord(a,lang)+content.slice(pos);
  const fixed=next.replace(/<span data-rls-article-count>[^<]*<\\/g>/g,'<span data-rls-article-count>'+String(a.number)+'</span>');
  await putText(path,fixed,"Add article "+a.number+" to "+lang+" article index",sha);
  return {changed:true};
}

window.rlsConnect=async function(){
  const input=document.getElementById("token"),status=document.getElementById("status"),form=document.getElementById("form");
  token=input&&input.value?input.value.trim():"";
  if(!token){status.textContent="ابتدا GitHub Token را وارد کنید.";status.className="err";return;}
  status.textContent="در حال بررسی اتصال...";status.className="";
  try{
    const user=await github("/user");
    const repo=await github("/repos/"+OWNER+"/"+REPO);
    if(repo.permissions&&repo.permissions.push!==true) throw new Error("این حساب دسترسی نوشتن به RLS ندارد.");
    if(form) form.classList.remove("off");
    status.textContent="متصل شد: "+user.login;status.className="ok";
    const registry=await getFile("assets/articles-data.js");
    const items=parseRegistry(registry.text);
    const no=document.getElementById("no");
    if(no) no.value=nextNumber(items);
  }catch(error){status.textContent="خطا: "+error.message;status.className="err";}
};

function collectArticle(){
  const pdf=document.getElementById("pdf").files[0];
  const authors=parseAuthors(document.getElementById("authors").value);
  const required=["titleFa","titleEn","titleRu","absFa","absEn","absRu","received","accepted","published"];
  required.forEach(function(id){if(!document.getElementById(id).value.trim()) throw new Error("فیلد الزامی تکمیل نشده: "+id);});
  if(!authors.length) throw new Error("حداقل یک نویسنده وارد کنید.");
  if(!pdf) throw new Error("فایل PDF را انتخاب کنید.");
  if(pdf.type&&pdf.type!=="application/pdf") throw new Error("فایل انتخاب‌شده PDF نیست.");
  const published=document.getElementById("published").value;
  const volume=document.getElementById("volume").value.trim();
  const issue=document.getElementById("issue").value.trim();
  const year=document.getElementById("year").value.trim();
  const no=Number(document.getElementById("no").value);
  if(!no||no<1) throw new Error("شماره مقاله معتبر نیست.");
  const slugBase=slugify(document.getElementById("titleEn").value)||("article-"+no);
  const slug=slugBase+"-rls-"+volume+"-"+issue;
  const first=authors[0];
  const adYear=(published||"").slice(0,4)||String(new Date().getFullYear());
  const fileBase=slugify(first.en||first.fa||"article")||("article-"+no);
  const pdfPath="articles/"+volume+"/"+fileBase+"_RLS_Vol"+volume+"_Issue"+issue+"_"+adYear+".pdf";
  return {
    id:slug,slug:slug,href:slug+".html",number:no,status:"published",
    issue:volume+"/"+issue,year:year,volume:volume,issueNumber:issue,
    type:{fa:document.getElementById("typeFa").value.trim(),en:document.getElementById("typeEn").value.trim(),ru:document.getElementById("typeRu").value.trim()},
    title:{fa:document.getElementById("titleFa").value.trim(),en:document.getElementById("titleEn").value.trim(),ru:document.getElementById("titleRu").value.trim()},
    sourceLanguage:document.getElementById("language").value,language:document.getElementById("language").value,
    author:first.en,authorGiven:first.en.split(/\\s+/)[0]||first.en,authorFamily:first.en.split(/\\s+/).slice(1).join(" ")||first.en,orcid:first.orcid||"",
    affiliation:{fa:first.affFa,en:first.affEn,ru:first.affRu},
    authors:authors,received:isoDate(document.getElementById("received").value),accepted:isoDate(document.getElementById("accepted").value),online:isoDate(published),
    firstPage:(document.getElementById("pages").value.split(/[-–—]/)[0]||"").trim(),lastPage:(document.getElementById("pages").value.split(/[-–—]/)[1]||"").trim(),
    pdf:pdfPath,keywords:{fa:document.getElementById("keyFa").value.trim(),en:document.getElementById("keyEn").value.trim(),ru:document.getElementById("keyRu").value.trim()},
    doi:"",license:"CC BY 4.0",abstract:{fa:document.getElementById("absFa").value.trim(),en:document.getElementById("absEn").value.trim(),ru:document.getElementById("absRu").value.trim()}
  ,_pdf:pdf};
}

function showPreview(){
  const box=document.getElementById("previewBox");
  try{
    const a=collectArticle();
    box.hidden=false;
    box.innerHTML="<h2>پیش‌نمایش</h2><div class=\"preview\"><strong>مقاله "+esc(a.number)+"</strong><p>"+esc(a.title.fa)+"</p><p dir=\"ltr\"><b>"+esc(a.title.en)+"</b></p><p>"+esc(a.title.ru)+"</p><p>نویسندگان: "+esc(a.authors.map(function(x){return x.fa;}).join(" · "))+"</p><p>مسیر PDF: <code>"+esc(a.pdf)+"</code></p><p>سه صفحه مقاله در مسیرهای فارسی، انگلیسی و روسی ساخته خواهد شد.</p></div>";
  }catch(e){document.getElementById("log").textContent="خطا: "+e.message;}
}

async function publishArticle(){
  const log=document.getElementById("log");
  const submit=document.querySelector("#form button.publish");
  try{
    const a=collectArticle();
    submit.disabled=true;log.textContent="مرحله ۱ از ۵: خواندن فهرست مقالات...\n";
    const registry=await getFile("assets/articles-data.js");
    const items=parseRegistry(registry.text);
    if(items.some(function(x){return x.id===a.id||Number(x.number)===a.number;})) throw new Error("شماره مقاله یا شناسه این مقاله قبلاً ثبت شده است.");
    log.textContent+="مرحله ۲ از ۵: بارگذاری PDF...\n";
    let pdfSha=null;
    try{const existing=await getFile(a.pdf);pdfSha=existing.sha;}catch(e){pdfSha=null;}
    await putBinary(a.pdf,a._pdf,"Publish article PDF "+a.number,pdfSha);
    delete a._pdf;
    log.textContent+="مرحله ۳ از ۵: ساخت صفحات سه‌زبانه...\n";
    for(const lang of ["fa","en","ru"]){
      const path=(lang==="fa"?"":lang+"/")+a.href;
      let old=null;
      try{old=await getFile(path);}catch(e){old=null;}
      await putText(path,buildArticlePage(a,lang),"Publish article "+a.number+" "+lang,old?old.sha:null);
    }
    log.textContent+="مرحله ۴ از ۵: به‌روزرسانی فهرست مرکزی...\n";
    items.push(a);
    await putText("assets/articles-data.js",registryText(items),"Register article "+a.number,registry.sha);
    log.textContent+="مرحله ۵ از ۵: به‌روزرسانی فهرست سه‌زبانه...\n";
    for(const lang of ["fa","en","ru"]){
      const path=lang==="fa"?"articles.html":lang+"/articles.html";
      const old=await getFile(path);
      await appendToArticleList(path,old.sha,old.text,a,lang);
    }
    log.textContent+="\nانتشار با موفقیت انجام شد.\nمقاله: "+a.number+"\nصفحه فارسی: https://rlsj.ir/"+a.href+"\nصفحه انگلیسی: https://rlsj.ir/en/"+a.href+"\nصفحه روسی: https://rlsj.ir/ru/"+a.href;
    alert("مقاله با موفقیت در GitHub ثبت شد.");
  }catch(e){
    log.textContent+="\nخطا: "+(e&&e.message?e.message:e);
    alert("انتشار انجام نشد: "+(e&&e.message?e.message:e));
  }finally{submit.disabled=false;}
}

document.addEventListener("DOMContentLoaded",function(){
  const button=document.getElementById("connect");
  if(button){button.type="button";button.onclick=window.rlsConnect;}
  const preview=document.getElementById("preview");
  if(preview) preview.onclick=showPreview;
  const form=document.getElementById("form");
  if(form) form.addEventListener("submit",function(e){e.preventDefault();publishArticle();});
});