const ALLOWED_ORIGINS = new Set(["https://rlsj.ir","https://www.rlsj.ir"]);
const ALLOWED_ARTICLES = new Set([
  "ai-supported-multimodal-russian-language-learning",
  "role-of-context-russian-verbal-aspect",
  "challenges-russian-technical-military-terminology",
  "fate-family-human-values-don-stories"
]);
function cors(origin) {
  const safe = ALLOWED_ORIGINS.has(origin) ? origin : "https://rlsj.ir";
  return {
    "Access-Control-Allow-Origin": safe,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data,status=200,origin="") {
  return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url), origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
    if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
    try {
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
      if(url.pathname==="/api/count"&&request.method==="GET") {
        if(!env.RLS_COUNTER_DB)return json({error:"RLS_COUNTER_DB_binding_missing"},500,origin);
        const slug=url.searchParams.get("article");
        if(!ALLOWED_ARTICLES.has(slug))return json({error:"invalid_article"},400,origin);
        const row=await env.RLS_COUNTER_DB.prepare("SELECT views FROM article_views WHERE slug=?1").bind(slug).first();
        return json({article:slug,views:Number(row?.views||0)},200,origin);
      }
      if(url.pathname==="/api/view"&&request.method==="POST") {
        if(!env.RLS_COUNTER_DB)return json({error:"RLS_COUNTER_DB_binding_missing"},500,origin);
        let body;try{body=await request.json();}catch{return json({error:"invalid_json"},400,origin);}
        const slug=body?.article;
        if(!ALLOWED_ARTICLES.has(slug))return json({error:"invalid_article"},400,origin);
        await env.RLS_COUNTER_DB.prepare("INSERT INTO article_views (slug,views) VALUES (?1,1) ON CONFLICT(slug) DO UPDATE SET views=views+1").bind(slug).run();
        const row=await env.RLS_COUNTER_DB.prepare("SELECT views FROM article_views WHERE slug=?1").bind(slug).first();
        return json({article:slug,views:Number(row?.views||0)},200,origin);
      }
      return new Response("RLSJ counters service is running.",{status:200,headers:{...cors(origin),"Content-Type":"text/plain; charset=utf-8"}});
    }catch(error){
      return json({error:"counter_service_error",detail:String(error?.message||error)},502,origin);
    }
  }
};
