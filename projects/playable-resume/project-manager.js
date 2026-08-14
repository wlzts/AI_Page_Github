(function(){
'use strict';
const API_URL_KEY='cao-jixian-resume-admin-api';
const SESSION_KEY='cao-jixian-resume-admin-session';
const AI_STORAGE_KEY='cao-jixian-ai-page-v8-projects';
const MAX_FILE_BYTES=2_200_000;
const MAX_FILES=200;
const MAX_TOTAL=30_000_000;
const IGNORE_SEGMENTS=new Set(['.git','node_modules','.idea','.vscode']);
const IGNORE_NAMES=new Set(['.DS_Store','Thumbs.db']);
const $=(id)=>document.getElementById(id);
let apiBase=normalizeApi(localStorage.getItem(API_URL_KEY)||'');
let token=sessionStorage.getItem(SESSION_KEY)||'';
let projects=JSON.parse(JSON.stringify(window.AIProjects||[])).map(stripLegacyLayout);
let selected=[];
let rootFolder='';
let busy=false;

function stripLegacyLayout(p={}){
  const copy={...p};
  delete copy.featured;
  delete copy.pinned;
  delete copy.pinOrder;
  return copy;
}
function normalizeApi(v){return String(v||'').trim().replace(/\/+$/,'')}
function status(id,msg,type=''){const el=$(id);if(!el)return;el.textContent=msg;el.className=`status${type?' '+type:''}`}
function formatBytes(n){if(n<1000)return`${n} B`;if(n<1e6)return`${(n/1000).toFixed(1)} KB`;return`${(n/1e6).toFixed(2)} MB`}
function slugify(v){let s=String(v||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^[-._]+|[-._]+$/g,'');return s||`project-${Date.now()}`}
function currentDate(){const d=new Date();return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`}
function safePath(path){const p=String(path||'').replace(/\\/g,'/').split('/').filter(Boolean);if(!p.length)return'';return p.join('/')}
function isIgnored(path){const seg=safePath(path).split('/');return seg.some(s=>IGNORE_SEGMENTS.has(s))||IGNORE_NAMES.has(seg[seg.length-1])}
function commonRoot(files){const first=files[0]?.webkitRelativePath?.split('/')[0]||'';if(!first)return'';return files.every(f=>f.webkitRelativePath?.split('/')[0]===first)?first:''}
function relPath(file,root){let p=file.webkitRelativePath||file.name;p=p.replace(/\\/g,'/');if(root&&p.startsWith(root+'/'))p=p.slice(root.length+1);return safePath(p)}
function authHeaders(){return{'Content-Type':'application/json','Authorization':`Bearer ${token}`}}
async function api(path,options={}){const res=await fetch(`${apiBase}${path}`,options);const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok){const e=new Error(data.error||`请求失败（HTTP ${res.status}）`);e.status=res.status;e.hint=data.hint;throw e}return data}

function setAppVisible(logged){$('loginCard').hidden=logged;$('manager').hidden=!logged;if(logged){$('repoBadge').textContent='ONLINE';renderProjects()}}
async function login(){const apiUrl=normalizeApi($('apiUrl').value);const password=$('password').value;if(!apiUrl||!password){status('loginStatus','请填写 API 地址和管理员密码。','error');return}const btn=$('loginBtn');btn.disabled=true;btn.textContent='验证中…';try{const res=await fetch(`${apiUrl}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok||!data.token)throw new Error(data.error||`登录失败（HTTP ${res.status}）`);apiBase=apiUrl;token=data.token;localStorage.setItem(API_URL_KEY,apiBase);sessionStorage.setItem(SESSION_KEY,token);status('loginStatus','登录成功。','ok');$('repoBadge').textContent=data.repository?.repo||'ONLINE';setAppVisible(true)}catch(e){status('loginStatus',e.message,'error')}finally{btn.disabled=false;btn.textContent='登录项目发布器'}}
function logout(){token='';sessionStorage.removeItem(SESSION_KEY);setAppVisible(false);$('apiUrl').value=apiBase;status('loginStatus','已退出管理员会话。')}

function setForm(p={}){$('title').value=p.title||'';$('slug').value=p.path||'';$('projectId').value=p.id||'';$('category').value=p.category||'工具';$('date').value=p.date||currentDate();$('accent').value=/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#2f6b53';$('description').value=p.description||'';$('keywords').value=p.keywords||'';$('visible').checked=p.visible!==false;$('replace').checked=Boolean(p.path);selected=[];rootFolder='';renderFiles();status('publishStatus',p.path?'已载入作品资料。这里只修改内容；布局保持不变。请选择新的项目文件夹后可覆盖发布。':'')}
function projectFromForm(){const title=$('title').value.trim();let slug=$('slug').value.trim();if(!slug){slug=slugify(title||rootFolder);$('slug').value=slug}let id=$('projectId').value.trim();if(!id){id=slugify(slug);$('projectId').value=id}return{id,title,description:$('description').value.trim(),category:$('category').value.trim()||'实验',date:$('date').value.trim()||currentDate(),path:slug,accent:$('accent').value||'#2f6b53',keywords:$('keywords').value.trim(),visible:$('visible').checked}}

function renderProjects(){const list=$('projectList');list.innerHTML='';$('projectCount').textContent=projects.length;projects.forEach((p)=>{const card=document.createElement('article');card.className='project-card';const protectedItem=String(p.path).toLowerCase()==='playable-resume';card.innerHTML=`<h3>${escapeHtml(p.title||p.id)}</h3><div class="project-meta">${escapeHtml(p.category||'实验')} · projects/${escapeHtml(p.path||'')}/ ${p.visible===false?'· 已隐藏':''}</div>`;const actions=document.createElement('div');actions.className='project-actions';const edit=button('载入/替换','button ghost mini',()=>setForm(p));const open=document.createElement('a');open.className='button ghost mini';open.textContent='打开';open.target='_blank';open.rel='noopener';open.href=p.externalUrl||`../${encodeURIComponent(p.path)}/`;actions.append(edit,open);if(!protectedItem)actions.append(button('删除目录','button danger mini',()=>deleteProject(p)));card.append(actions);list.append(card)})}
function button(text,className,fn){const b=document.createElement('button');b.type='button';b.className=className;b.textContent=text;b.addEventListener('click',fn);return b}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function onFolder(files){const arr=[...files];rootFolder=commonRoot(arr);const kept=[];const ignored=[];for(const f of arr){const path=relPath(f,rootFolder);if(!path||isIgnored(path)){ignored.push(path||f.name);continue}kept.push({file:f,path,size:f.size})}selected=kept;if(!$('slug').value.trim()&&rootFolder)$('slug').value=slugify(rootFolder);if(!$('projectId').value.trim())$('projectId').value=slugify($('slug').value);renderFiles(ignored)}
function renderFiles(ignored=[]){const list=$('fileList');list.innerHTML='';const total=selected.reduce((s,x)=>s+x.size,0);const hasIndex=selected.some(x=>x.path.toLowerCase()==='index.html');const tooLarge=selected.filter(x=>x.size>MAX_FILE_BYTES);const errors=[];if(selected.length>MAX_FILES)errors.push(`文件数超过 ${MAX_FILES}`);if(total>MAX_TOTAL)errors.push(`总大小超过 ${formatBytes(MAX_TOTAL)}`);if(selected.length&&!hasIndex)errors.push('根目录缺少 index.html');if(tooLarge.length)errors.push(`${tooLarge.length} 个文件超过单文件 ${formatBytes(MAX_FILE_BYTES)} 限制`);$('fileSummary').innerHTML=selected.length?`已选择 <b>${selected.length}</b> 个文件 · ${formatBytes(total)} ${hasIndex?'· <span style="color:#6ee7a8">✓ index.html</span>':'· <span style="color:#ff7b72">✕ 缺少 index.html</span>'}${ignored.length?` · 已忽略 ${ignored.length} 项`:''}${errors.length?`<br><span style="color:#ff7b72">${errors.join('；')}</span>`:''}`:'尚未选择项目文件夹。';selected.slice(0,120).forEach(x=>{const row=document.createElement('div');row.className='file-row';row.innerHTML=`<span>${escapeHtml(x.path)}</span><span${x.size>MAX_FILE_BYTES?' style="color:#ff7b72"':''}>${formatBytes(x.size)}</span>`;list.append(row)});if(selected.length>120){const row=document.createElement('div');row.className='file-row';row.innerHTML=`<span>… 其余 ${selected.length-120} 个文件</span><span></span>`;list.append(row)}}

function bytesToBase64(buffer){const bytes=new Uint8Array(buffer);const parts=[];const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk){parts.push(String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length))))}return btoa(parts.join(''))}
async function uploadOne(rec){const buf=await rec.file.arrayBuffer();const contentBase64=bytesToBase64(buf);return api('/api/project-blob',{method:'POST',headers:authHeaders(),body:JSON.stringify({relativePath:rec.path,size:rec.size,contentBase64})})}
async function pool(items,limit,worker,onProgress){let next=0,done=0;const results=new Array(items.length);async function run(){while(true){const i=next++;if(i>=items.length)return;results[i]=await worker(items[i],i);done++;onProgress?.(done,items.length,items[i])}}await Promise.all(Array.from({length:Math.min(limit,items.length)},run));return results}

function upsertProject(p){const clean=projects.map(stripLegacyLayout);const index=clean.findIndex(x=>String(x.id)===String(p.id)||String(x.path)===String(p.path));if(index>=0)clean[index]={...clean[index],...stripLegacyLayout(p)};else clean.push(stripLegacyLayout(p));return clean}

async function publish(){if(busy)return;const p=projectFromForm();if(!p.title||!p.path||!p.id){status('publishStatus','作品名称、项目 ID 和目录名不能为空。','error');return}if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p.path)){status('publishStatus','目录名只能使用英文、数字、点、下划线和连字符。','error');return}if(p.path.toLowerCase()==='playable-resume'){status('publishStatus','playable-resume 是系统保留目录，不能覆盖。','error');return}if(!selected.length){status('publishStatus','请先选择完整项目文件夹。','error');return}const total=selected.reduce((s,x)=>s+x.size,0);if(selected.length>MAX_FILES||total>MAX_TOTAL||selected.some(x=>x.size>MAX_FILE_BYTES)||!selected.some(x=>x.path.toLowerCase()==='index.html')){status('publishStatus','文件检查未通过，请先处理红色提示。','error');return}const exists=projects.some(x=>String(x.path)===p.path);if(exists&&!$('replace').checked){status('publishStatus','同名项目目录已存在，请勾选“覆盖已有同名目录”。','error');return}if(exists&&!confirm(`即将覆盖 projects/${p.path}/。旧目录中未包含在本次上传里的文件会被删除，继续吗？`))return;busy=true;$('publishBtn').disabled=true;$('progressWrap').hidden=false;status('publishStatus','正在将文件创建为 Git Blob，正式站尚未发生变化…');try{const manifests=await pool(selected,3,uploadOne,(done,totalCount,rec)=>{$('progressBar').style.width=`${Math.round(done/totalCount*82)}%`;$('progressText').textContent=`上传文件 ${done}/${totalCount} · ${rec.path}`});$('progressText').textContent='所有文件已暂存，正在创建最终 Git commit…';$('progressBar').style.width='88%';const nextProjects=upsertProject(p);const result=await api('/api/project-publish',{method:'POST',headers:authHeaders(),body:JSON.stringify({project:p,files:manifests.map((m,i)=>({path:selected[i].path,sha:m.sha,size:selected[i].size})),aiProjects:nextProjects,replace:$('replace').checked,message:`${exists?'更新':'发布'} AI 作品：${p.title}`})});projects=nextProjects;localStorage.removeItem(AI_STORAGE_KEY);$('progressBar').style.width='100%';$('progressText').textContent='发布完成。';status('publishStatus',`✓ ${result.message} Commit ${result.commit.sha.slice(0,7)} · 内容已更新；页面布局不会被修改。`,'ok');renderProjects();setTimeout(()=>{$('progressWrap').hidden=true;$('progressBar').style.width='0'},1800)}catch(e){console.error(e);status('publishStatus',`${e.message}${e.hint?' · '+e.hint:''}`,'error');$('progressText').textContent='发布中断；由于尚未创建最终 commit，正式项目不会出现半成品。'}finally{busy=false;$('publishBtn').disabled=false}}

async function deleteProject(p){if(busy)return;if(String(p.path).toLowerCase()==='playable-resume')return;const typed=prompt(`危险操作：将删除 GitHub 中 projects/${p.path}/ 的全部文件，并移除作品库条目。\n请输入目录名 ${p.path} 确认：`);if(typed!==p.path)return;busy=true;try{const next=projects.filter(x=>String(x.id)!==String(p.id)&&String(x.path)!==String(p.path)).map(stripLegacyLayout);status('publishStatus',`正在删除 projects/${p.path}/ …`);const result=await api('/api/project-delete',{method:'POST',headers:authHeaders(),body:JSON.stringify({slug:p.path,aiProjects:next,message:`删除 AI 作品：${p.title}`})});projects=next;localStorage.removeItem(AI_STORAGE_KEY);renderProjects();status('publishStatus',`✓ 已删除 ${result.deletedFiles} 个文件。Commit ${result.commit.sha.slice(0,7)}；布局数据保持独立。`,'ok')}catch(e){status('publishStatus',e.message,'error')}finally{busy=false}}

$('loginBtn').addEventListener('click',login);
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('logoutBtn').addEventListener('click',logout);
$('folderInput').addEventListener('change',e=>onFolder(e.target.files));
$('publishBtn').addEventListener('click',publish);
$('resetBtn').addEventListener('click',()=>setForm({}));
$('title').addEventListener('blur',()=>{if(!$('slug').value.trim())$('slug').value=slugify($('title').value);if(!$('projectId').value.trim())$('projectId').value=slugify($('slug').value)});

$('apiUrl').value=apiBase;
$('date').value=currentDate();
setForm({});
setAppVisible(Boolean(apiBase&&token));
})();
