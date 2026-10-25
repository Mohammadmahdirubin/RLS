export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ["https://rlsj.ir","https://www.rlsj.ir","https://mohammadmahdirubin.github.io"];
  const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Vary":"Origin"};
  const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (!allowed.includes(origin)) return new Response("Forbidden",{status:403});
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (!env.DB || !env.ADMIN_TOKEN) return reply({error:"Admin API is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if (auth !== "Bearer "+env.ADMIN_TOKEN) return reply({error:"Unauthorized"},401);
  const url=new URL(request.url);
  if(url.pathname==="/admin-api/manuscripts" && request.method==="GET"){
   const result=await env.DB.prepare("SELECT id,tracking_code,author,email,title,institution,orcid,abstract,message,main_filename,supplementary_filename,status,received_at,updated_at,editor_note FROM manuscripts ORDER BY received_at DESC LIMIT 500").all();
   return reply({manuscripts:result.results||[]});
  }
  const match=url.pathname.match(/^\/admin-api\/manuscripts\/(\d+)$/);
  if(match && request.method==="PATCH"){
   let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
   const allowedStatuses=["received","in_review","revision_required","accepted","rejected"];
   const id=Number(match[1]),status=String(body.status||""),note=String(body.editor_note||"").slice(0,10000);
   if(!allowedStatuses.includes(status))return reply({error:"Invalid status"},400);
   const existing=await env.DB.prepare("SELECT id FROM manuscripts WHERE id=?").bind(id).first();
   if(!existing)return reply({error:"Manuscript not found"},404);
   await env.DB.prepare("UPDATE manuscripts SET status=?,editor_note=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status,note,id).run();
   await env.DB.prepare("INSERT INTO manuscript_admin_history (manuscript_id,status,editor_note,changed_at) VALUES (?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))").bind(id,status,note).run();
   return reply({success:true});
  }
  return reply({error:"Not found"},404);
 }
};