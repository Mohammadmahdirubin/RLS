const ALLOWED_ORIGINS = new Set(["https://rlsj.ir","https://www.rlsj.ir"]);
const ALLOWED_ARTICLES = new Set([
  "ai-supported-multimodal-russian-language-learning",
  "role-of-context-russian-verbal-aspect",
  "challenges-russian-technical-military-terminology",
  "fate-family-human-values-don-stories"
]);
const PROFILE_FILE = "data/profile-views.json";

function cors(origin) {
  const safe = ALLOWED_ORIGINS.has(origin) ? origin : "https://rlsj.ir";
  return {
    "Access-Control-Allow-Origin": safe,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary: Origin": "Vary"
  };
}
function json(data,status=200,origin="") {
  const h=cors(origin); delete h["Vary: Origin"]; h["Vary"]="Origin";
  return new Response(JSON.stringify(data),{status,headers:{...h,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
function validMember(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||"");}
async function gh(env,path,init={}) {
  return fetch("https://api.github.com/repos/"+env.GH_REPO+"/"+path,{
    ...init,headers:{Authorization:"Bearer "+env.GH_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(init.headers||{})}
  });
}
async function readProfileCounts(env) {
  const r=await gh(env,"contents/"+PROFILE_FILE+"?ref="+encodeURIComponent(env.GH_BRANCH||"main"));
  if(r.status===404)return {counts:{},sha:null};
  if(!r.ok)throw new Error("GitHub read failed "+r.status);
  const x=await r.json(), raw=atob(x.content.replace(/\n/g,""));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return {counts:JSON.parse(new TextDecoder().decode(bytes)).counts||{},sha:x.sha};
}
async function writeProfileCounts(env,counts,sha) {
  const content=btoa(unescape(encodeURIComponent(JSON.stringify({updated_at:new Date().toISOString(),counts},null,2)+"\n")));
  const body={message:"Update public member profile view counts",content,branch:env.GH_BRANCH||"main"};
  if(sha)body.sha=sha;
  return gh(env,"contents/"+PROFILE_FILE,{method:"PUT",body:JSON.stringify(body)});
}
async function profileCounter(request,env,url,origin) {
  if(!env.GH_TOKEN||!env.GH_REPO)return json({error:"GitHub secrets not configured"},500,origin);
  const id=url.searchParams.get("member");
  if(!validMember(id))return json({error:"invalid_member_id"},400,origin);
  if(request.method==="GET"){
    const {counts}=await readProfileCounts(env);
    return json({member:id,count:Number(counts[id]||0)},200,origin);
  }
  if(request.method==="POST"){
    for(let attempt=0;attempt<5;attempt++){
      const {counts,sha}=await readProfileCounts(env);
      counts[id]=Math.max(0,Number(counts[id]||0))+1;
      const result=await writeProfileCounts(env,counts,sha);
      if(result.ok)return json({member:id,count:counts[id]},200,origin);
      if(result.status!==409&&result.status!==422)throw new Error("GitHub write failed "+result.status+" "+(await result.text()).slice(0,250));
    }
    return json({error:"busy_retry"},503,origin);
  }
  return json({error:"method_not_allowed"},405,origin);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url), origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors(origin),"Vary":"Origin"}});
    if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
    try {
      // Site-wide counter (existing functionality)
      if(url.pathname==="/"||url.pathname==="/hit") {
        if(!env.DB)return json({error:"D1_binding_missing"},500,origin);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS visitor_counter (id INTEGER PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0)").run();
        await env.DB.prepare("INSERT OR IGNORE INTO visitor_counter (id,views) VALUES (1,0)").run();
        await env.DB.prepare("UPDATE visitor_counter SET views=views+1 WHERE id=1").run();
        const row=await env.DB.prepare("SELECT views FROM visitor_counter WHERE id=1").first();
        return json({success:true,views:Number(row?.views||0)},200,origin);
      }
      if(url.pathname==="/count") {
        if(!env.DB)return json({error:"D1_binding_missing"},500,origin);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS visitor_counter (id INTEGER PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0)").run();
        await env.DB.prepare("INSERT OR IGNORE INTO visitor_counter (id,views) VALUES (1,0)").run();
        const row=await env.DB.prepare("SELECT views FROM visitor_counter WHERE id=1").first();
        return json({success:true,views:Number(row?.views||0)},200,origin);
      }
      // Article counter (existing article API)
      if(url.pathname==="/api/count"&&request.method==="GET") {
        if(!env.DB)return json({error:"D1_binding_missing"},500,origin);
        const slug=url.searchParams.get("article");
        if(!ALLOWED_ARTICLES.has(slug))return json({error:"invalid_article"},400,origin);
        const row=await env.DB.prepare("SELECT views FROM article_views WHERE slug=?1").bind(slug).first();
        return json({article:slug,views:Number(row?.views||0)},200,origin);
      }
      if(url.pathname==="/api/view"&&request.method==="POST") {
        if(!env.DB)return json({error:"D1_binding_missing"},500,origin);
        let body;try{body=await request.json();}catch{return json({error:"invalid_json"},400,origin);}
        const slug=body?.article;
        if(!ALLOWED_ARTICLES.has(slug))return json({error:"invalid_article"},400,origin);
        await env.DB.prepare("INSERT INTO article_views (slug,views) VALUES (?1,1) ON CONFLICT(slug) DO UPDATE SET views=views+1").bind(slug).run();
        const row=await env.DB.prepare("SELECT views FROM article_views WHERE slug=?1").bind(slug).first();
        return json({article:slug,views:Number(row?.views||0)},200,origin);
      }
      // Member profile counter (GitHub JSON storage)
      if(url.pathname==="/profile/count")return await profileCounter(request,env,url,origin);
      return new Response("RLSJ counters service is running.",{status:200,headers:{...cors(origin),"Content-Type":"text/plain; charset=utf-8"}});
    } catch(error) {
      return json({error:"counter_service_error",detail:String(error?.message||error)},502,origin);
    }
  }
};