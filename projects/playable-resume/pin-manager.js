(function(){
'use strict';
const API_URL_KEY='cao-jixian-resume-admin-api';
const SESSION_KEY='cao-jixian-resume-admin-session';
let busy=false;

function apiBase(){return String(localStorage.getItem(API_URL_KEY)||'').trim().replace(/\/+$/,'')}
function token(){return sessionStorage.getItem(SESSION_KEY)||''}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function projectByCard(card){
  const meta=card.querySelector('.project-meta')?.textContent||'';
  const m=meta.match(/projects\/([^/\s]+)\//);
  const path=m?.[1]||'';
  const title=card.querySelector('h3')?.textContent?.replace(/^📌\s*/,'').trim()||'';
  return (window.AIProjects||[]).find(p=>String(p.path)===path) || (window.AIProjects||[]).find(p=>String(p.title)===title);
}
function paintCard(card,p){
  if(!p)return;
  card.dataset.pinEnhanced='1';
  card.classList.toggle('is-pinned',Boolean(p.pinned));
  const h=card.querySelector('h3');
  if(h){const raw=h.textContent.replace(/^📌\s*/,'');h.textContent=(p.pinned?'📌 ':'')+raw}
  const actions=card.querySelector('.project-actions');
  if(!actions)return;
  let btn=actions.querySelector('[data-pin-btn]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='button ghost mini';
    btn.dataset.pinBtn='1';
    actions.prepend(btn);
  }
  btn.textContent=p.pinned?'取消置顶':'📌 置顶';
  btn.title=p.pinned?'取消首页置顶':'将该项目置顶到所有作品最前面';
  btn.onclick=()=>togglePin(p,card,btn);
}
function enhance(){
  document.querySelectorAll('#projectList .project-card').forEach(card=>paintCard(card,projectByCard(card)));
}
function reorderCards(){
  const list=document.getElementById('projectList');
  if(!list)return;
  const cards=[...list.querySelectorAll('.project-card')];
  const byPath=new Map(cards.map(card=>{
    const p=projectByCard(card);return[p?.path,card];
  }));
  (window.AIProjects||[]).forEach(p=>{const card=byPath.get(p.path);if(card)list.appendChild(card)});
}
async function togglePin(p,card,btn){
  if(busy)return;
  const base=apiBase(),t=token();
  if(!base||!t){alert('管理员会话不存在或已过期，请先重新登录项目发布器。');return}
  const next=!Boolean(p.pinned);
  busy=true;btn.disabled=true;btn.textContent=next?'置顶中…':'取消中…';
  try{
    const res=await fetch(`${base}/api/project-pin`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},
      body:JSON.stringify({id:p.id,path:p.path,pinned:next})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw new Error(data.error||`操作失败（HTTP ${res.status}）`);
    window.AIProjects=Array.isArray(data.projects)?data.projects:window.AIProjects;
    const updated=(window.AIProjects||[]).find(x=>String(x.id)===String(p.id)||String(x.path)===String(p.path))||{...p,pinned:next};
    paintCard(card,updated);
    reorderCards();
    const status=document.getElementById('publishStatus');
    if(status){status.textContent=`✓ ${data.message} · Commit ${String(data.commit?.sha||'').slice(0,7)}；站点重新部署后，首页和 RPG 将同步新顺序。`;status.className='status ok'}
  }catch(e){
    alert(e.message||'置顶操作失败');
    paintCard(card,p);
  }finally{busy=false;btn.disabled=false}
}

const style=document.createElement('style');
style.textContent=`
#projectList .project-card.is-pinned{border-color:#d7a72f;box-shadow:0 0 0 1px rgba(215,167,47,.3),0 14px 28px rgba(0,0,0,.12)}
#projectList .project-card.is-pinned h3{color:#ffe39a}
`;
document.head.appendChild(style);

const observer=new MutationObserver(enhance);
const start=()=>{const list=document.getElementById('projectList');if(list){observer.observe(list,{childList:true,subtree:true});enhance()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
