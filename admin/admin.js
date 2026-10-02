const OWNER="Mohammadmahdirubin";
const REPO="RLS";
const API="https://api.github.com";
let token="";

async function github(path){
  const response=await fetch(API+path,{
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":"Bearer "+token,
      "X-GitHub-Api-Version":"2022-11-28"
    }
  });
  let data={};
  try{ data=await response.json(); }catch(e){}
  if(!response.ok) throw new Error(data.message || ("GitHub HTTP "+response.status));
  return data;
}

window.rlsConnect=async function(){
  const input=document.getElementById("token");
  const status=document.getElementById("status");
  const form=document.getElementById("form");
  token=(input && input.value ? input.value.trim() : "");

  if(!token){
    status.textContent="ابتدا GitHub Token را وارد کنید.";
    status.className="err";
    return;
  }

  status.textContent="در حال بررسی اتصال...";
  status.className="";

  try{
    const user=await github("/user");
    const repo=await github("/repos/"+OWNER+"/"+REPO);

    if(repo.permissions && repo.permissions.push !== true){
      throw new Error("این حساب دسترسی نوشتن به RLS ندارد.");
    }

    if(form) form.classList.remove("off");
    status.textContent="متصل شد: "+user.login;
    status.className="ok";
  }catch(error){
    status.textContent="خطا: "+error.message;
    status.className="err";
  }
};

document.addEventListener("DOMContentLoaded",function(){
  const button=document.getElementById("connect");
  if(button){
    button.type="button";
    button.onclick=window.rlsConnect;
  }
});
