const ALLOWED_ORIGINS = new Set(["https://rlsj.ir","https://www.rlsj.ir"]);
const FILE_PATH = "data/profile-views.json";
function cors(origin){
  const allowed=ALLOWED_ORIGINS.has(origin)?origin:"https://rlsj.ir";
  return {"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
}
function json(data,status=200,origin=""){
  return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
function validId(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||"");}
async function gh(env,path,init={}){
  return fetch("https://api.github.com/repos/"+env.GH_REPO+"/"+path,{
    ...init,headers:{Authorization:"Bearer "+env.GH_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(init.headers||{})}
  });
}
async function readFile(env){
  const r=await gh(env,"contents/"+FILE_PATH+"?ref="+encodeURIComponent(env.GH_BRANCH||"main"));
  if(r.status===404)return {counts:{},sha:null};
  if(!r.ok)throw new Error("GitHub read failed "+r.status);
  const x=await r.json();
  const raw=atob(x.content.replace(/\n/g,""));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return {counts:JSON.parse(new TextDecoder().decode(bytes)).counts||{},sha:x.sha};
}
async function writeCounts(env,counts,sha){
  const content=btoa(unescape(encodeURIComponent(JSON.stringify({updated_at:new Date().toISOString(),counts},null,2)+"\n")));
  const body={message:"Update public member profile view counts",content,branch:env.GH_BRANCH||"main"};
  if(sha)body.sha=sha;
  return gh(env,"contents/"+FILE_PATH,{method:"PUT",body:JSON.stringify(body)});
}
export default {
  async fetch(request,env){
    const origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors(origin),"Access-Control-Max-Age":"86400"}});
    if(!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed"},403,origin);
    if(!env.GH_TOKEN||!env.GH_REPO)return json({error:"Worker secrets not configured"},500,origin);
    const url=new URL(request.url);
    if(url.pathname!=="/count")return json({error:"Not found"},404,origin);
    const member=url.searchParams.get("member");
    if(!validId(member))return json({error:"Invalid member ID"},400,origin);
    if(request.method!=="GET"&&request.method!=="POST")return json({error:"Method not allowed"},405,origin);
    try{
      if(request.method==="GET"){
        const {counts}=await readFile(env);
        return json({count:Number(counts[member]||0)},200,origin);
      }
      // Optimistic SHA update; retries handle concurrent visitors without lost increments.
      for(let attempt=0;attempt<5;attempt++){
        const {counts,sha}=await readFile(env);
        counts[member]=Math.max(0,Number(counts[member]||0))+1;
        const result=await writeCounts(env,counts,sha);
        if(result.ok){
          return json({count:counts[member]},200,origin);
        }
        if(result.status!==409&&result.status!==422){
          const detail=await result.text();
          throw new Error("GitHub write failed "+result.status+" "+detail.slice(0,250));
        }
      }
      return json({error:"Busy; retry later"},503,origin);
    }catch(e){
      return json({error:"Counter service error",detail:String(e.message||e)},502,origin);
    }
  }
};