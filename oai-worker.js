const SOURCE = "https://rlsj.ir/metadata/articles.json";
const NS = "http://www.openarchives.org/OAI/2.0/";
const DC = "http://www.openarchives.org/OAI/2.0/oai_dc/";
const DCE = "http://purl.org/dc/elements/1.1/";
const esc = v => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const tag = (k,v) => v ? `<dc:${k}>${esc(v)}</dc:${k}>` : "";
const list = (obj,k) => ["fa","en","ru"].map(lang=>obj&&obj[lang]?tag(k,obj[lang]):"").join("");
const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v||"") ? v : "2026-01-01";
function record(a) {
 const identifier="oai:rlsj.ir:"+a.id;
 const fields=list(a.title,"title")+
  ["fa","en","ru"].map(k=>a.authors&&a.authors[k]?tag("creator",a.authors[k]):"").join("")+
  tag("publisher","Russian Language Studies")+tag("date",validDate(a.publicationDate))+
  tag("type","Text")+tag("type","Article")+tag("identifier",a.landingPage)+tag("identifier",a.pdf)+
  tag("identifier",a.doi)+tag("language",a.language)+list(a.keywords,"subject")+list(a.abstract,"description");
 return `<record><header><identifier>${esc(identifier)}</identifier><datestamp>${validDate(a.publicationDate)}</datestamp><setSpec>rls</setSpec></header><metadata><oai_dc:dc xmlns:oai_dc="${DC}" xmlns:dc="${DCE}">${fields}</oai_dc:dc></metadata></record>`;
}
function envelope(verb,body) {
 return `<?xml version="1.0" encoding="UTF-8"?><OAI-PMH xmlns="${NS}"><responseDate>${new Date().toISOString().replace(/\.\d{3}Z$/,"Z")}</responseDate><request verb="${esc(verb)}">https://oai.rlsj.ir/</request>${body}</OAI-PMH>`;
}
export default { async fetch(req) {
 const u=new URL(req.url), verb=u.searchParams.get("verb")||"";
 const headers={"content-type":"application/xml; charset=utf-8","access-control-allow-origin":"*","cache-control":"public, max-age=300"};
 if(req.method==="OPTIONS") return new Response("",{status:204,headers});
 if(req.method!=="GET") return new Response("Method Not Allowed",{status:405});
 if(!["Identify","ListMetadataFormats","ListSets","ListIdentifiers","ListRecords","GetRecord"].includes(verb)) return new Response(envelope(verb,'<error code="badVerb">Unsupported OAI-PMH verb.</error>'),{status:400,headers});
 let data; try { const r=await fetch(SOURCE); if(!r.ok) throw Error(); data=await r.json(); } catch { return new Response(envelope(verb,'<error code="badArgument">Metadata source unavailable.</error>'),{status:502,headers}); }
 let body="";
 if(verb==="Identify") body='<Identify><repositoryName>Russian Language Studies</repositoryName><baseURL>https://oai.rlsj.ir/</baseURL><protocolVersion>2.0</protocolVersion><adminEmail>mm.rubin@ut.ac.ir</adminEmail><earliestDatestamp>2026-01-01</earliestDatestamp><deletedRecord>no</deletedRecord><granularity>YYYY-MM-DD</granularity></Identify>';
 if(verb==="ListMetadataFormats") body='<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>';
 if(verb==="ListSets") body='<ListSets><set><setSpec>rls</setSpec><setName>Russian Language Studies</setName></set></ListSets>';
 if(verb==="ListRecords" || verb==="ListIdentifiers") {
  const records=(data.articles||[]).map(record);
  body=verb==="ListRecords"?'<ListRecords>'+records.join("")+'</ListRecords>':'<ListIdentifiers>'+records.map((_,i)=>{const a=data.articles[i];return '<header><identifier>oai:rlsj.ir:'+esc(a.id)+'</identifier><datestamp>'+validDate(a.publicationDate)+'</datestamp><setSpec>rls</setSpec></header>';}).join("")+'</ListIdentifiers>';
 }
 if(verb==="GetRecord") { const a=(data.articles||[]).find(x=>"oai:rlsj.ir:"+x.id===u.searchParams.get("identifier")); body=a?'<GetRecord>'+record(a)+'</GetRecord>':'<error code="idDoesNotExist">Record not found.</error>'; }
 return new Response(envelope(verb,body),{status:200,headers});
}};
