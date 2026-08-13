(function(){
  const D=window.ResumeData;
  const AI=(window.AIProjects||[]).filter(p=>p&&p.visible!==false&&p.id!=='playable-resume');
  const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
  const LOGICAL_W=960,LOGICAL_H=540;
  function setupHiDPI(){const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));canvas.width=Math.round(LOGICAL_W*dpr);canvas.height=Math.round(LOGICAL_H*dpr);canvas.style.aspectRatio='16 / 9';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;canvas.dataset.dpr=String(dpr);}
  setupHiDPI(); canvas.tabIndex=0;
  const el={start:document.getElementById('startScreen'),game:document.getElementById('gameScreen'),area:document.getElementById('areaName'),prompt:document.getElementById('interactionPrompt'),promptLabel:document.getElementById('interactionLabel'),dialog:document.getElementById('dialogBox'),dialogName:document.getElementById('dialogName'),dialogText:document.getElementById('dialogText'),modal:document.getElementById('infoModal'),modalContent:document.getElementById('modalContent'),modalKicker:document.getElementById('modalKicker'),map:document.getElementById('mapModal'),how:document.getElementById('howModal'),progress:document.getElementById('progressText'),dialogPortrait:document.getElementById('dialogPortrait')};
  const imgs={}; let loaded=0; const sources={town:'assets/images/town-base-v5.png',above:'assets/images/town-above.png',hero:'assets/images/hero-hd.png',npcs:'assets/images/npcs-hd.png',about:'assets/images/interior-about-v5.png',career:'assets/images/interior-career-v5.png',education:'assets/images/interior-education-v5.png',projects:'assets/images/interior-projects-v5.png',skills:'assets/images/interior-skills-v5.png',awards:'assets/images/interior-awards-v5.png',contact:'assets/images/interior-contact-v5.png'};
  Object.keys(sources).forEach(k=>{const i=new Image();i.onload=()=>loaded++;i.src=sources[k];imgs[k]=i});
  const keys={}; let running=false,last=0; let currentScene='town'; let nearest=null; let sceneLock=0;
  const player={x:1050,y:620,dir:'down',moving:false,running:false,frame:0,animT:0,idleT:0}; const cam={x:480,y:550};
  let particles=[]; for(let i=0;i<70;i++)particles.push({x:Math.random()*1920,y:Math.random()*1152,vx:-10+Math.random()*20,vy:10+Math.random()*18,t:Math.random()*10,layer:Math.random()>.55?1:0,kind:Math.floor(Math.random()*3)});
  let footsteps=[]; let worldClock=.43,clockLabelTick=0; const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visited=new Set(loadJSON('cq-visited',[]));
  const audio=new Audio('assets/audio/town-theme.wav'); audio.loop=true;audio.volume=.13; let audioOn=false;
  const dirRow={down:0,left:1,right:2,up:3};
  const npcs=[
    {name:'米拉',role:'小镇向导',portrait:'assets/images/portrait-mira.png',variant:0,x:705,y:625,dir:'down',frame:0,animT:0,speed:36,path:[[705,625],[835,625],[835,700],[705,700]],pi:0,lines:[`欢迎来到 ${D.profile.name} 的履历小镇。`,`“${D.profile.motto}”——这是这段职业旅程的核心信条。`,`想了解后端研发经历去「职业高塔」，想看实战项目就去「项目实验室」。`]},
    {name:'艾莉丝',role:'博物馆馆长',portrait:'assets/images/portrait-iris.png',variant:1,x:845,y:510,dir:'left',frame:0,animT:0,speed:30,path:[[845,510],[690,510],[690,565],[845,565]],pi:0,lines:['这里收藏证书和已经完成的项目里程碑。','真正重要的不是展柜数量，而是持续把技术做深、把事情落地。']},
    {name:'西奥',role:'学院学生',portrait:'assets/images/portrait-theo.png',variant:2,x:1390,y:545,dir:'right',frame:0,animT:0,speed:34,path:[[1390,545],[1510,545],[1510,620],[1390,620]],pi:0,lines:[`学院记录的是 ${D.profile.name} 的计算机基础与学习路径。`,`从 Java、数据库到计算机网络，重点一直是把理论变成可运行的工程实践。`]},
    {name:'诺瓦',role:'实验室工程师',portrait:'assets/images/portrait-nova.png',variant:4,x:1510,y:670,dir:'left',frame:0,animT:0,speed:38,path:[[1510,670],[1370,670],[1370,710],[1510,710]],pi:0,lines:[`项目实验室目前收录 ${D.projects.length} 个核心工程项目，以及 ${AI.length} 个 AI 创意实验。`,'左侧记录企业工程能力，AI 创意终端则展示持续学习、快速验证与交互开发实践。']},
    {name:'凯',role:'技能教练',portrait:'assets/images/portrait-kai.png',variant:3,x:1260,y:650,dir:'down',frame:0,animT:0,speed:32,path:[[1260,650],[1160,650],[1160,705],[1260,705]],pi:0,lines:['技能馆采用 1—5 级能力表达，不使用“95% 熟练度”这种虚假百分比。','当前主线是 Java 后端、数据库与缓存、工程化、系统性能和计算机基础。']},
    {name:'朱诺',role:'车站站长',portrait:'assets/images/portrait-juno.png',variant:5,x:830,y:690,dir:'right',frame:0,animT:0,speed:30,path:[[830,690],[930,690],[930,720],[830,720]],pi:0,lines:[`联系车站是这段探索的最后一站。`,`如果你正在寻找一名重视落地与稳定性的后端研发工程师，可以通过 ${D.profile.email} 联系。`]}
  ];  const lampPoints=[[664,496],[1092,496],[664,680],[1092,680],[1220,540],[1406,540],[1570,540],[1750,540],[500,642],[700,810],[1162,810],[1380,850]];
  const glowWindows=[[480,395],[650,395],[1215,410],[1460,405],[1680,405],[550,850],[1260,860],[1460,830],[1660,830],[820,850],[980,850]];
  const scenes={
    town:{name:'履历小镇',w:1920,h:1152,spawn:[1050,620],image:'town',collisions:[
      [148,70,392,406],        // Career Tower
      [690,78,230,366],        // Achievement Museum
      [1300,132,460,336],      // Academy
      [230,730,200,350],       // About House
      [690,675,450,395],       // Contact Station
      [1170,730,205,350],      // Skill Gym
      [1390,630,430,420],      // Project Lab
      [1235,330,490,150],      // Pond
      [850,540,130,130]        // Fountain
    ]},
    about:{name:'关于我的小屋',w:960,h:576,spawn:[480,520],image:'about',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[60,200,140,230],[760,200,140,230],[420,190,115,100],[310,350,150,95]]},
    career:{name:'职业高塔',w:960,h:576,spawn:[480,520],image:'career',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[76,208,164,154],[290,208,164,154],[504,208,164,154],[718,208,164,154],[310,410,140,90],[510,410,140,90]]},
    education:{name:'大学与学院',w:960,h:576,spawn:[480,520],image:'education',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[52,200,145,265],[764,200,145,265],[250,245,150,90],[470,245,150,90],[680,245,150,90],[300,380,150,95],[510,380,150,95]]},
    projects:{name:'项目实验室',w:960,h:576,spawn:[480,520],image:'projects',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[76,210,245,150],[340,190,160,140],[515,190,160,140],[700,210,185,150],[250,390,190,105],[560,390,190,105],[405,235,150,155]]},
    skills:{name:'技能训练馆',w:960,h:576,spawn:[480,520],image:'skills',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[70,210,135,160],[245,210,135,160],[420,210,135,160],[590,210,135,160],[765,210,135,160],[310,395,140,100],[510,395,140,100]]},
    awards:{name:'成就博物馆',w:960,h:576,spawn:[480,520],image:'awards',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[35,230,110,165],[215,230,110,165],[395,230,110,165],[575,230,110,165],[755,230,110,165],[340,430,110,70],[510,430,110,70]]},
    contact:{name:'联系车站',w:960,h:576,spawn:[480,520],image:'contact',collisions:[[0,0,960,170],[0,0,32,576],[928,0,32,576],[280,45,400,105],[90,230,150,160],[750,230,150,160],[300,420,150,70],[520,420,150,70]]}
  };
  const townInteractions=[
    {x:344,y:458,r:78,label:'进入职业高塔',action:()=>enter('career')},
    {x:804,y:440,r:78,label:'进入成就博物馆',action:()=>enter('awards')},
    {x:1530,y:456,r:82,label:'进入大学与学院',action:()=>enter('education')},
    {x:1602,y:1040,r:84,label:'进入项目实验室',action:()=>enter('projects')},
    {x:330,y:1070,r:82,label:'进入关于我的小屋',action:()=>enter('about')},
    {x:916,y:1052,r:84,label:'进入联系车站',action:()=>enter('contact')},
    {x:1278,y:1070,r:82,label:'进入技能训练馆',action:()=>enter('skills')},
    {x:625,y:730,r:62,label:'摸摸小猫',action:()=>showDialog('小镇猫咪',['喵。谢谢你逛到这里。','成就解锁：你找到了小镇最重要的居民。'])},
    {x:735,y:645,r:68,label:'阅读广场铭牌',action:()=>showDialog('广场铭牌',[`「履历小镇」只有一个设计原则：让职业故事变成可以探索、可以记住的地方。`])}
  ];
  function interiorInteractions(scene){
    const exit={x:480,y:548,r:65,label:'返回履历小镇',action:()=>enter('town',({about:[330,1100],career:[344,500],education:[1530,500],projects:[1602,1090],skills:[1278,1100],awards:[804,480],contact:[916,1090]})[scene])};
    if(scene==='about')return [
      exit,
      {x:480,y:190,r:80,label:'打开个人电脑',action:()=>showProfile()},
      {x:120,y:300,r:90,label:'浏览书架',action:()=>showDialog('书架',[`兴趣：${D.profile.interests.join(' · ')}`,`价值观：${D.profile.values.join(' · ')}`,`职业方向：${D.profile.careerDirection}`])},
      {x:830,y:300,r:90,label:'查看成长墙',action:()=>showDialog('成长墙',D.profile.recruiterHighlights.map((x,i)=>`${i+1}. ${x}`))}
    ];
    if(scene==='career')return [exit,...[0,1,2,3].map((n)=>({x:160+n*214,y:380,r:92,label:n<D.experience.length?`查看经历：${D.experience[n].company}`:`查看第 ${n+1} 层`,action:()=>showExperience(n)}))];
    if(scene==='education')return [
      exit,
      {x:480,y:140,r:90,label:'查看学业档案',action:showEducation},
      {x:120,y:340,r:90,label:'浏览课程书架',action:()=>showDialog('课程书架',[`核心课程：${D.education[0].courses.join(' · ')}`,`实训：${D.education[0].trainingProjects.join(' · ')}`])}
    ];
    if(scene==='projects')return [exit,...D.projects.slice(0,6).map((p,n)=>{const pts=[[175,285],[410,245],[635,245],[845,285],[365,455],[665,455]];return{x:pts[n][0],y:pts[n][1],r:80,label:`查看工程项目：${p.title}`,action:()=>showProject(n)}}),{x:480,y:455,r:78,label:`打开 AI 创意实验室 · ${AI.length} 个作品`,action:()=>showAiLab()}];
    if(scene==='skills')return [exit,...D.skills.slice(0,5).map((g,n)=>({x:160+n*160,y:330,r:80,label:`训练：${g.group}`,action:()=>showSkill(n)}))];
    if(scene==='awards')return [exit,...D.achievements.slice(0,4).map((a,n)=>({x:110+n*200,y:350,r:85,label:`查看：${a.title}`,action:()=>showAward(n)})),{x:890,y:350,r:70,label:'查看未来展柜',action:()=>showDialog('未来展柜',['这里留给下一张证书、下一次技术突破，或者下一段值得记录的职业里程碑。'])}];
    if(scene==='contact')return [
      exit,
      {x:480,y:150,r:100,label:'查看出发信息板',action:()=>showContact()},
      {x:160,y:360,r:90,label:'打开通讯终端',action:()=>showContact()},
      {x:800,y:360,r:90,label:D.profile.resume?'下载简历 PDF':'查看简历说明',action:()=>D.profile.resume?window.open(D.profile.resume,'_blank'):showDialog('简历说明',['当前尚未放入真实简历 PDF。','以后只需把 PDF 放到项目根目录，并在 resume-data.js 中填写 profile.resume 即可自动显示下载入口。'])}
    ];
    return [exit];
  }
  let interactions=townInteractions;
  function storageSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function loadJSON(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
  function findSafePosition(desiredX,desiredY){
    if(!collide(desiredX,desiredY))return [desiredX,desiredY];
    const step=16,maxRadius=160;
    for(let radius=step;radius<=maxRadius;radius+=step){
      const candidates=[];
      for(let dx=-radius;dx<=radius;dx+=step){candidates.push([desiredX+dx,desiredY-radius],[desiredX+dx,desiredY+radius]);}
      for(let dy=-radius+step;dy<=radius-step;dy+=step){candidates.push([desiredX-radius,desiredY+dy],[desiredX+radius,desiredY+dy]);}
      candidates.sort((a,b)=>Math.hypot(a[0]-desiredX,a[1]-desiredY)-Math.hypot(b[0]-desiredX,b[1]-desiredY));
      for(const p of candidates)if(!collide(p[0],p[1]))return p;
    }
    return [Math.max(40,Math.min(scenes[currentScene].w-40,desiredX)),Math.max(180,Math.min(scenes[currentScene].h-40,desiredY))];
  }
  function setScene(scene,spawn){clearKeys();currentScene=scene;const s=scenes[scene];el.area.textContent=s.name;const wanted=spawn||s.spawn;const safe=findSafePosition(wanted[0],wanted[1]);player.x=safe[0];player.y=safe[1];player.dir='up';cam.x=Math.max(0,Math.min(s.w-960,player.x-480));cam.y=Math.max(0,Math.min(s.h-540,player.y-270));interactions=scene==='town'?townInteractions:interiorInteractions(scene);nearest=null;el.prompt.hidden=true;sceneLock=350;storageSet('cq-lastScene',scene); if(scene!=='town')markVisited(scene); updateMapMarker();}
  function enter(scene,spawn){if(sceneLock>0)return;sceneLock=500;fade(1,()=>{setScene(scene,spawn);fade(0)});}
  let fadeAlpha=0,fadeTarget=0,fadeCb=null;function fade(target,cb){fadeTarget=target;fadeCb=cb||null}
  function markVisited(scene){if(['about','career','education','projects','skills','awards','contact'].includes(scene)&&!visited.has(scene)){visited.add(scene);storageSet('cq-visited',[...visited]);updateProgress();toast('发现新区域',scenes[scene].name);}}
  function updateProgress(){el.progress.textContent=`${visited.size} / 7`;if(visited.size===7&&!loadJSON('cq-complete',false)){storageSet('cq-complete',true);setTimeout(()=>toast('成就解锁','履历探索者'),500)}}
  function toast(kicker,title){const t=document.createElement('div');t.className='achievement-toast';t.innerHTML=`${kicker}<b>${title}</b>`;document.getElementById('gameScreen').appendChild(t);setTimeout(()=>t.remove(),3200)}
  function collide(x,y){const s=scenes[currentScene];const box={x:x-13,y:y-14,w:26,h:15};if(x<24||x>s.w-24||y<40||y>s.h-15)return true;return s.collisions.some(r=>box.x<r[0]+r[2]&&box.x+box.w>r[0]&&box.y<r[1]+r[3]&&box.y+box.h>r[1])}
  function move(dt){if((dialog.active&&!dialog.walkDismiss)||!el.modal.hidden||!el.map.hidden||!el.how.hidden)return;if(collide(player.x,player.y)){const safe=findSafePosition(player.x,player.y);player.x=safe[0];player.y=safe[1];}let dx=0,dy=0;if(keys.ArrowLeft||keys.KeyA)dx--;if(keys.ArrowRight||keys.KeyD)dx++;if(keys.ArrowUp||keys.KeyW)dy--;if(keys.ArrowDown||keys.KeyS)dy++;player.moving=!!(dx||dy);player.running=!!(keys.ShiftLeft||keys.ShiftRight)&&player.moving;player.idleT+=dt;if(!player.moving){player.frame=0;return}if(dialog.active&&dialog.walkDismiss)closeDialog();if(dx&&dy){dx*=.707;dy*=.707}const speed=(player.running?285:175)*dt;if(Math.abs(dx)>Math.abs(dy))player.dir=dx<0?'left':'right';else if(dy)player.dir=dy<0?'up':'down';let nx=player.x+dx*speed,ny=player.y;if(!collide(nx,ny))player.x=nx;ny=player.y+dy*speed;if(!collide(player.x,ny))player.y=ny;player.animT+=dt;const cadence=player.running?.075:.11;if(player.animT>cadence){player.frame=(player.frame+1)%6;player.animT=0}}
  function updateNPCs(dt){if(currentScene!=='town'||reducedMotion)return;for(const n of npcs){const target=n.path[n.pi],dx=target[0]-n.x,dy=target[1]-n.y,dist=Math.hypot(dx,dy);if(dist<4){n.pi=(n.pi+1)%n.path.length;continue}const step=Math.min(dist,n.speed*dt);const ux=dx/dist,uy=dy/dist;n.x+=ux*step;n.y+=uy*step;if(Math.abs(dx)>Math.abs(dy))n.dir=dx<0?'left':'right';else n.dir=dy<0?'up':'down';n.animT+=dt;if(n.animT>.13){n.frame=(n.frame+1)%6;n.animT=0}}}
  function updateNearest(){nearest=null;let best=9999;for(const it of interactions){const d=Math.hypot(player.x-it.x,player.y-it.y);if(d<it.r&&d<best){best=d;nearest=it}}if(currentScene==='town'){for(const n of npcs){const d=Math.hypot(player.x-n.x,player.y-n.y);if(d<58&&d<best){best=d;nearest={label:`与 ${n.name} 对话`,action:()=>showDialog(`${n.name} · ${n.role}`,n.lines,n.portrait)}}}}if(nearest){el.prompt.hidden=false;el.promptLabel.textContent=nearest.label}else el.prompt.hidden=true}
  function interact(){if(!el.modal.hidden){return}if(!el.map.hidden){el.map.hidden=true;return}if(!el.how.hidden){el.how.hidden=true;return}if(dialog.active){advanceDialog();return}if(nearest)nearest.action()}
  const dialog={active:false,pages:[],page:0,len:0,lastType:0,full:false,walkDismiss:false};
  function showDialog(name,pages,portrait,options={}){dialog.active=true;dialog.pages=pages;dialog.page=0;dialog.len=0;dialog.full=false;dialog.lastType=0;dialog.walkDismiss=!!options.walkDismiss;el.dialogName.textContent=name;el.dialogText.textContent='';if(el.dialogPortrait)el.dialogPortrait.src=portrait||'assets/images/avatar.png';el.dialog.hidden=false;el.prompt.hidden=true}
  function closeDialog(){dialog.active=false;dialog.walkDismiss=false;el.dialog.hidden=true;}
  function advanceDialog(){if(!dialog.active)return;const text=dialog.pages[dialog.page];if(dialog.len<text.length){dialog.len=text.length;dialog.full=true;el.dialogText.textContent=text;return}dialog.page++;if(dialog.page>=dialog.pages.length){closeDialog();return}dialog.len=0;dialog.full=false;el.dialogText.textContent=''}
  el.dialog.addEventListener('click',advanceDialog);
  function typeDialog(now){if(!dialog.active)return;const text=dialog.pages[dialog.page];if(dialog.len<text.length&&now-dialog.lastType>22){dialog.len++;dialog.lastType=now;el.dialogText.textContent=text.slice(0,dialog.len)}}
  function showModal(kicker,html){el.modalKicker.textContent=kicker;el.modalContent.innerHTML=`<div class="modal-body">${html}</div>`;el.modal.hidden=false;el.prompt.hidden=true}
  function list(items){return `<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`}
  function chips(items){return `<div class="chips">${items.map(x=>`<span class="chip">${x}</span>`).join('')}</div>`}
  function optionalLink(label,url,primary=false){if(!url)return '';return `<a class="pixel-button${primary?' primary':''}" target="_blank" rel="noreferrer" href="${url}">${label} ↗</a>`}
  function showProfile(){
    const links=[optionalLink('GitHub',D.profile.github),optionalLink('LinkedIn',D.profile.linkedin),optionalLink('个人网站',D.profile.website)].join('');
    showModal('关于我',`<h2>${D.profile.name}</h2><div class="meta">${D.profile.roleDetail||D.profile.role} · ${D.profile.location}</div><p>${D.profile.about.replace(/\n/g,'<br>')}</p><h3>职业方向</h3><p>${D.profile.careerDirection}</p><h3>价值观</h3>${list(D.profile.values)}<h3>希望你记住</h3>${list(D.profile.recruiterHighlights)}${links?`<div class="modal-actions">${links}</div>`:''}`)
  }
  function showExperience(i){
    const e=D.experience[i];
    if(!e)return showDialog('职业高塔',[`第 ${i+1} 层暂时留给未来的新篇章。`]);
    showModal('职业高塔',`<h2>${e.company}</h2><div class="meta">${e.role} · ${e.period} · ${e.location}</div><p>${e.description}</p><h3>核心职责</h3>${list(e.responsibilities)}<h3>重点工作</h3>${list(e.achievements)}<h3>技术栈</h3>${chips(e.technologies)}<h3>工具</h3>${chips(e.tools||[])}<div class="takeaway"><b>核心能力：</b>${e.recruiterTakeaway||''}</div>`)
  }
  function showEducation(){
    const e=D.education[0];
    showModal('学院档案',`<h2>${e.school}</h2><div class="meta">${e.degree} · ${e.major} · ${e.period}</div><p>${e.highlight}</p><h3>核心课程</h3>${list(e.courses)}<h3>实训项目</h3>${list(e.trainingProjects||[])}<h3>证书</h3>${list((e.certificates&&e.certificates.length)?e.certificates:['暂无'])}<div class="takeaway"><b>教育经历重点：</b>${e.recruiterTakeaway||''}</div>`)
  }
  function showProject(i){
    const p=D.projects[i];if(!p)return;
    const links=[optionalLink('查看项目',p.demoUrl,true),optionalLink('GitHub',p.githubUrl),optionalLink('案例分析',p.caseStudyUrl)].join('');
    showModal('项目实验室',`<h2>${p.title}</h2><div class="meta">${p.type} · ${p.role} · ${p.period}</div><h3>项目背景</h3><p>${p.background}</p><h3>我的职责</h3>${list(p.responsibilities)}<h3>核心功能</h3>${list(p.features||[])}<h3>技术难点</h3>${list(p.challenges||[])}<h3>解决方案</h3>${list(p.solutions||[])}<h3>项目成果</h3>${list(p.results)}<h3>技术栈</h3>${chips(p.technologies)}<div class="takeaway"><b>能力体现：</b>${p.recruiterTakeaway||''}</div>${links?`<div class="modal-actions">${links}</div>`:''}`)
  }
  function escHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function aiHref(p){return p.externalUrl||`../${String(p.path||'').replace(/^\/+|\/+$/g,'')}/`}
  function showAiLab(){
    const cards=AI.map(p=>`<a class="ai-modal-card" target="_blank" rel="noreferrer" href="${escHtml(aiHref(p))}"><small>${escHtml(p.category||'AI 实验')} · ${escHtml(p.date||'')}</small><h4>${escHtml(p.title||'未命名实验')}</h4><p>${escHtml(p.description||'')}</p><b>进入实验 ↗</b></a>`).join('');
    showModal('AI 创意实验室',`<h2>好像有用网页实验室</h2><div class="meta">${AI.length} 个可直接体验的独立网页实验</div><p>这里记录工作之外持续完成的 AI 工具、小游戏与交互实验，用来验证想法、训练前端表达与保持技术好奇心。</p><div class="ai-modal-grid">${cards||'<p>作品库暂未填写。</p>'}</div><div class="modal-actions"><a class="pixel-button" href="../../" target="_blank">打开完整实验室 ↗</a></div>`)
  }
  function showSkill(i){
    const g=D.skills[i];
    showModal('技能训练',`<h2>${g.group}</h2><p>${g.description||'技能使用 1—5 级表达实际熟练度，不使用虚构百分比。'}</p>${g.items.map(s=>`<div class="skill-row"><b>${s.name}</b><span class="stars">${'★'.repeat(s.level)}${'☆'.repeat(5-s.level)}</span></div>`).join('')}`)
  }
  function showAward(i){
    const a=D.achievements[i];if(!a)return;
    showModal('成就博物馆',`<h2>${a.title}</h2><div class="meta">${a.type||'成就'} · ${a.year} · ${a.issuer}</div><p>${a.description}</p>`)
  }
  function showContact(){
    const buttons=[D.profile.email?`<a class="pixel-button primary" href="mailto:${D.profile.email}">发送邮件</a>`:'',optionalLink('LinkedIn',D.profile.linkedin),optionalLink('GitHub',D.profile.github),optionalLink('个人网站',D.profile.website),D.profile.resume?optionalLink('下载简历 PDF',D.profile.resume):''].join('');
    showModal('联系车站',`<h2>开启下一段旅程</h2><p>如果你正在寻找一名重视落地、稳定性与持续成长的后端研发工程师，欢迎联系 ${D.profile.name}。</p><h3>邮箱</h3><p>${D.profile.email}</p><h3>职业方向</h3><p>${D.profile.careerDirection}</p>${buttons?`<div class="modal-actions">${buttons}</div>`:''}${!D.profile.resume?'<p class="meta">真实简历 PDF 暂未提供；补充后下载入口会自动出现。</p>':''}`)
  }
  function worldToScreen(x,y){return [Math.round(x-cam.x),Math.round(y-cam.y)]}
  function drawWater(now){if(currentScene!=='town')return;const rx=1235-cam.x,ry=330-cam.y,rw=490,rh=150;ctx.save();ctx.beginPath();ctx.rect(rx,ry,rw,rh);ctx.clip();const t=now*.001;for(let i=0;i<12;i++){const yy=ry+18+(i*17+(Math.sin(t*1.4+i)*6))%rh;const xx=rx+16+((i*71+t*24)%Math.max(40,rw-80));const len=24+(i%4)*12;ctx.fillStyle=i%3===0?'rgba(204,239,219,.30)':'rgba(115,198,184,.22)';ctx.fillRect(Math.round(xx),Math.round(yy),len,2);if(i%2===0)ctx.fillRect(Math.round(xx+8),Math.round(yy+4),Math.max(7,len-18),1)}ctx.restore();
    // Fountain animated sparkle
    const [fx,fy]=worldToScreen(914,604);ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(235,249,218,.74)';for(let i=0;i<7;i++){const a=t*1.8+i*.9,px=fx+Math.cos(a)*20,py=fy+Math.sin(a)*8;ctx.fillRect(Math.round(px),Math.round(py),2,2)}ctx.strokeStyle='rgba(177,235,217,.42)';ctx.lineWidth=2;for(let i=0;i<3;i++){const phase=t*2+i*2.1;ctx.beginPath();ctx.moveTo(fx,fy-8);ctx.quadraticCurveTo(fx-18+i*18,fy-30-Math.sin(phase)*4,fx-28+i*28,fy+4);ctx.stroke()}ctx.restore()}
  function drawBuildingIdentity(now){if(currentScene!=='town')return;const t=now*.001;ctx.save();ctx.globalAlpha=.9;
    // Career Tower: animated gold signal bars / clock pulse
    let p=worldToScreen(344,130);ctx.fillStyle='#e6c35c';for(let i=0;i<3;i++){const h=5+i*3+Math.round((Math.sin(t*3+i)+1)*2);ctx.fillRect(p[0]+i*6,p[1]-h,4,h)}
    // Museum: star glint
    p=worldToScreen(810,183);ctx.fillStyle='rgba(255,232,141,'+(.5+.4*Math.sin(t*4))+')';ctx.fillRect(p[0]-1,p[1]-6,3,13);ctx.fillRect(p[0]-6,p[1]-1,13,3);
    // Academy: fluttering twin flags
    for(const [x,y,flip] of [[1358,171,0],[1660,171,1]]){p=worldToScreen(x,y);ctx.fillStyle='#315f66';ctx.fillRect(p[0],p[1],2,26);ctx.fillStyle='#e4c55e';const wave=Math.round(Math.sin(t*5+(flip?2:0))*2);ctx.fillRect(p[0]+2,p[1]+3,14+wave,5);ctx.fillStyle='#8e4239';ctx.fillRect(p[0]+2,p[1]+8,10-wave,4)}
    // About House: chimney smoke
    p=worldToScreen(362,748);for(let i=0;i<4;i++){const yy=p[1]-i*12-((t*10)%12),xx=p[0]+Math.sin(t+i)*5;ctx.fillStyle=`rgba(225,220,190,${.24-i*.04})`;ctx.fillRect(Math.round(xx),Math.round(yy),5+i,4+i)}
    // Contact station: departure lights
    p=worldToScreen(914,690);for(let i=0;i<5;i++){ctx.fillStyle=((Math.floor(t*2)+i)%5===0)?'#f0d56b':'#6da99a';ctx.fillRect(p[0]-24+i*12,p[1],6,3)}
    // Skill gym: bouncing pennants
    p=worldToScreen(1273,768);for(let i=0;i<3;i++){ctx.fillStyle=i%2?'#d96d4e':'#e7c55f';const oy=Math.round(Math.sin(t*4+i)*2);ctx.fillRect(p[0]-14+i*12,p[1]+oy,8,5);ctx.fillRect(p[0]-10+i*12,p[1]+5+oy,2,2)}
    // Project lab: electric cyan trace
    p=worldToScreen(1575,768);ctx.strokeStyle='rgba(103,222,217,'+(.55+.35*Math.sin(t*6))+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0]-35,p[1]);ctx.lineTo(p[0]-20,p[1]-8);ctx.lineTo(p[0]-6,p[1]+4);ctx.lineTo(p[0]+9,p[1]-6);ctx.lineTo(p[0]+25,p[1]);ctx.stroke();ctx.restore()}
  function drawActorShadow(x,y,scale=1){const sx=Math.round(x-cam.x),sy=Math.round(y-cam.y+3);ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#16251f';ctx.beginPath();ctx.ellipse(sx,sy,10*scale,3.5*scale,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawNPC(n){drawActorShadow(n.x,n.y,.9);const row=dirRow[n.dir],sx=n.frame*32,sy=(n.variant*4+row)*48;const dx=Math.round(n.x-cam.x-16),dy=Math.round(n.y-cam.y-44);ctx.drawImage(imgs.npcs,sx,sy,32,48,dx,dy,32,48)}
  function drawHero(){drawActorShadow(player.x,player.y,1);const row=dirRow[player.dir],frame=player.moving?player.frame:0;const sx=frame*32,sy=row*48;const idleBob=!player.moving&&!reducedMotion?Math.round(Math.sin(player.idleT*2.2)*1):0;const dx=Math.round(player.x-cam.x-16),dy=Math.round(player.y-cam.y-44+idleBob);ctx.drawImage(imgs.hero,sx,sy,32,48,dx,dy,32,48);if(player.moving&&!reducedMotion&&Math.random()<.08)footsteps.push({x:player.x+(Math.random()-.5)*10,y:player.y+3,t:.45,vx:(Math.random()-.5)*6,vy:-5-Math.random()*4})}
  function drawCharacters(){if(currentScene!=='town'){drawHero();return}const actors=npcs.map(n=>({y:n.y,draw:()=>drawNPC(n)}));actors.push({y:player.y,draw:drawHero});actors.sort((a,b)=>a.y-b.y);for(const a of actors)a.draw()}
  function drawFootsteps(dt){for(let i=footsteps.length-1;i>=0;i--){const p=footsteps[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t<=0){footsteps.splice(i,1);continue}const x=p.x-cam.x,y=p.y-cam.y;ctx.save();ctx.globalAlpha=Math.min(.35,p.t);ctx.fillStyle=currentScene==='town'?'#d5c487':'#b7aa89';ctx.fillRect(Math.round(x),Math.round(y),3,2);ctx.restore()}}
  function drawAmbient(dt,now,foreground=false){for(const p of particles){if(p.layer!==(foreground?1:0))continue;const gust=Math.sin(p.t*.7+now*.00025)*8;p.x+=(p.vx+gust)*dt;p.y+=p.vy*dt;p.t+=dt;if(p.y>1165){p.y=-10;p.x=Math.random()*1920}if(p.x<0)p.x=1920;if(p.x>1920)p.x=0;const x=p.x-cam.x,y=p.y-cam.y;if(x>-16&&x<976&&y>-16&&y<556){const bob=Math.sin(p.t*3.3)*3,rot=Math.sin(p.t*4.2)*.8,sz=foreground?4:3;ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));ctx.rotate(rot);ctx.globalAlpha=foreground?.78:.52;ctx.fillStyle=p.kind===0?'#e8bd4f':p.kind===1?'#c96648':'#82a950';ctx.beginPath();ctx.moveTo(0,-sz);ctx.lineTo(sz,0);ctx.lineTo(0,sz-1);ctx.lineTo(-sz+1,0);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,238,164,.35)';ctx.fillRect(0,-1,1,2);ctx.restore()}}}
  function lightGlow(x,y,r,alpha,color){const [sx,sy]=worldToScreen(x,y);if(sx<-r||sx>960+r||sy<-r||sy>540+r)return;const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,color.replace('ALPHA',alpha));g.addColorStop(.45,color.replace('ALPHA',(alpha*.42).toFixed(3)));g.addColorStop(1,color.replace('ALPHA','0'));ctx.fillStyle=g;ctx.fillRect(sx-r,sy-r,r*2,r*2)}
  function getDayState(){const t=((worldClock%1)+1)%1;const sun=Math.max(0,Math.sin((t-.25)*Math.PI*2));const night=1-sun;const dusk=Math.max(0,1-Math.min(Math.abs(t-.25),Math.abs(t-.75))*12);let name='白天';if(t<.22||t>.82)name='夜晚';else if(t<.31)name='黎明';else if(t>.68)name='黄昏';else name='白天';return{t,sun,night,dusk,name}}
  function drawDayNight(dt,now){if(!reducedMotion)worldClock=(worldClock+dt/220)%1;const st=getDayState();if(currentScene!=='town'){if(now-clockLabelTick>400){clockLabelTick=now;const hours=Math.floor(st.t*24),mins=Math.floor((st.t*24-hours)*60);const ph=document.getElementById('dayPhase');if(ph)ph.textContent=`${st.name} · ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;}return;}const nightAlpha=Math.max(0,(st.night-.20)*.55);if(st.dusk>.05){ctx.fillStyle=`rgba(197,92,65,${st.dusk*.12})`;ctx.fillRect(0,0,960,540)}if(nightAlpha>.01){ctx.fillStyle=`rgba(10,23,46,${nightAlpha})`;ctx.fillRect(0,0,960,540);ctx.save();ctx.globalCompositeOperation='lighter';const lampA=Math.min(.55,nightAlpha*1.15);for(const l of lampPoints)lightGlow(l[0],l[1],82,lampA,'rgba(255,205,106,ALPHA)');for(const w of glowWindows)lightGlow(w[0],w[1],44,lampA*.45,'rgba(255,184,84,ALPHA)');if(nightAlpha>.2){for(let i=0;i<18;i++){const x=((i*137+now*.01)%1920)-cam.x,y=((i*79+Math.sin(now*.001+i)*25)%1152)-cam.y;if(x>0&&x<960&&y>0&&y<540){ctx.fillStyle=`rgba(218,239,139,${.18+.22*Math.sin(now*.004+i)**2})`;ctx.fillRect(Math.round(x),Math.round(y),2,2)}}}ctx.restore()}if(now-clockLabelTick>400){clockLabelTick=now;const hours=Math.floor(st.t*24),mins=Math.floor((st.t*24-hours)*60);const ph=document.getElementById('dayPhase');if(ph)ph.textContent=`${st.name} · ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`}}

  function drawAtmosphere(now){if(currentScene!=='town'||reducedMotion)return;const t=now*.000025;ctx.save();ctx.globalAlpha=.045;ctx.fillStyle='#17372d';for(let i=0;i<4;i++){const x=((i*370+t*900)%1350)-180,y=90+i*105;ctx.beginPath();ctx.ellipse(x,y,180,44,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+120,y+28,130,32,0,0,Math.PI*2);ctx.fill()}ctx.restore();const st=getDayState();if(st.sun>.55){ctx.save();ctx.globalCompositeOperation='screen';const a=(st.sun-.55)*.07;for(let i=0;i<3;i++){const x=80+i*330+Math.sin(now*.0002+i)*70;const g=ctx.createLinearGradient(x,0,x+170,540);g.addColorStop(0,`rgba(255,243,180,${a})`);g.addColorStop(1,'rgba(255,243,180,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+80,0);ctx.lineTo(x+260,540);ctx.lineTo(x+90,540);ctx.closePath();ctx.fill()}ctx.restore()}}
  function draw(now,dt){ctx.clearRect(0,0,960,540);const s=scenes[currentScene];const targetX=Math.max(0,Math.min(s.w-960,player.x-480)),targetY=Math.max(0,Math.min(s.h-540,player.y-285));cam.x+=(targetX-cam.x)*Math.min(1,dt*5.5);cam.y+=(targetY-cam.y)*Math.min(1,dt*5.5);ctx.drawImage(imgs[s.image],-Math.round(cam.x),-Math.round(cam.y));drawAtmosphere(now);if(currentScene==='town'){drawWater(now);drawBuildingIdentity(now);drawAmbient(dt,now,false)}drawFootsteps(dt);drawCharacters();if(currentScene==='town'){const sway=reducedMotion?0:Math.round(Math.sin(now*.0015)*2);ctx.drawImage(imgs.above,-Math.round(cam.x)+sway,-Math.round(cam.y));drawAmbient(dt,now,true);if(nearest&&!dialog.active&&el.modal.hidden&&el.map.hidden){const sx=Math.round(player.x-cam.x),sy=Math.round(player.y-cam.y-45);ctx.save();ctx.globalAlpha=.86+.12*Math.sin(now*.006);ctx.fillStyle='#f1d36f';ctx.strokeStyle='#1b2a24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+8,sy+8);ctx.lineTo(sx,sy+16);ctx.lineTo(sx-8,sy+8);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#1e3029';ctx.fillRect(sx-1,sy+4,2,6);ctx.fillRect(sx-1,sy+11,2,2);ctx.restore()}}drawDayNight(dt,now);
    const g=ctx.createRadialGradient(480,255,110,480,270,630);g.addColorStop(0,'rgba(255,247,208,0.035)');g.addColorStop(.62,'rgba(24,40,31,0.01)');g.addColorStop(1,'rgba(5,12,9,0.20)');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#f8e8aa';for(let y=0;y<540;y+=4)ctx.fillRect(0,y,960,1);ctx.restore();
    if(fadeAlpha!==fadeTarget){const dir=fadeTarget>fadeAlpha?1:-1;fadeAlpha=Math.max(0,Math.min(1,fadeAlpha+dir*dt*3));if(Math.abs(fadeAlpha-fadeTarget)<.03){fadeAlpha=fadeTarget;if(fadeTarget===1&&fadeCb){const cb=fadeCb;fadeCb=null;cb()}}}if(fadeAlpha>0){ctx.fillStyle=`rgba(7,14,11,${fadeAlpha})`;ctx.fillRect(0,0,960,540)}}
  function loop(now){if(!running)return;const dt=Math.min(.034,(now-last)/1000||0);last=now;if(sceneLock>0)sceneLock-=dt*1000;move(dt);updateNPCs(dt);updateNearest();typeDialog(now);draw(now,dt);requestAnimationFrame(loop)}
  function start(scene){el.start.hidden=true;el.game.hidden=false;running=true;last=performance.now();setScene(scene||'town');updateProgress();requestAnimationFrame(()=>canvas.focus({preventScroll:true}));if(!audioOn){audio.play().then(()=>{audioOn=true}).catch(()=>{})}if(scene==='town'||!scene)showDialog('米拉 · 小镇向导',[`欢迎来到 ${D.profile.name} 的履历小镇。`,`职业定位：${D.profile.roleDetail||D.profile.role}。`,`这里把工作经历、后端项目、技术能力、教育与成长里程碑做成了可以探索的世界。`,`按 W/A/S/D 或方向键移动；靠近目标后按空格或 Enter 互动。`],'assets/images/portrait-mira.png',{walkDismiss:true});requestAnimationFrame(loop)}
  function showStart(){running=false;el.game.hidden=true;el.start.hidden=false;el.dialog.hidden=true;el.modal.hidden=true;el.map.hidden=true;el.how.hidden=true}
  function continueGame(){const s=loadJSON('cq-lastScene','town');start(scenes[s]?s:'town')}
  function stopAudio(){audio.pause();audioOn=false;running=false}
  function toggleMusic(){if(audio.paused){audio.play().then(()=>{audioOn=true;document.getElementById('muteBtn').classList.remove('is-muted')}).catch(()=>{})}else{audio.pause();audioOn=false;document.getElementById('muteBtn').classList.add('is-muted')}}
  function updateMapMarker(){const pos={town:[50,54],career:[14,36],awards:[42,29],education:[75,36],projects:[79,82],about:[17,84],contact:[43,84],skills:[66,84]}[currentScene]||[48,50];const m=document.getElementById('youAreHere');m.style.left=pos[0]+'%';m.style.top=pos[1]+'%'}
  document.getElementById('beginQuest').addEventListener('click',()=>start('town'));document.getElementById('continueQuest').addEventListener('click',continueGame);document.getElementById('howToPlay').addEventListener('click',()=>el.how.hidden=false);document.getElementById('closeHow').addEventListener('click',()=>el.how.hidden=true);document.getElementById('closeModal').addEventListener('click',()=>el.modal.hidden=true);document.getElementById('mapBtn').addEventListener('click',()=>{el.map.hidden=!el.map.hidden;updateMapMarker()});document.getElementById('closeMap').addEventListener('click',()=>el.map.hidden=true);document.getElementById('muteBtn').addEventListener('click',toggleMusic);document.getElementById('fullscreenBtn').addEventListener('click',()=>{const q=document.getElementById('questMode');if(!document.fullscreenElement&&q.requestFullscreen)q.requestFullscreen();else if(document.exitFullscreen)document.exitFullscreen()});document.getElementById('dayCycleBtn')?.addEventListener('click',()=>{worldClock=(worldClock+.22)%1;toast('世界光照','时间已切换');});
  function clearKeys(){for(const k of Object.keys(keys))delete keys[k];player.moving=false;player.running=false;}
  const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
  function resetToSafePosition(){const s=scenes[currentScene];const safe=findSafePosition(s.spawn[0],s.spawn[1]);player.x=safe[0];player.y=safe[1];player.dir='up';clearKeys();toast('位置已重置',`已回到${s.name}的安全区域`);canvas.focus({preventScroll:true});}
  function updateControlStatus(code){const node=document.getElementById('keyboardStatus');if(!node)return;const labels={KeyW:'W ↑',KeyA:'A ←',KeyS:'S ↓',KeyD:'D →',ArrowUp:'↑',ArrowLeft:'←',ArrowDown:'↓',ArrowRight:'→'};node.textContent=`⌨ 已识别 ${labels[code]||code} · 键盘控制正常`;clearTimeout(updateControlStatus.t);updateControlStatus.t=setTimeout(()=>node.textContent='⌨ 键盘控制已启用',1100);}
  window.addEventListener('keydown',e=>{const code=e.code||e.key;if(movementCodes.has(code)||code==='Space'||code==='Enter'||code==='ShiftLeft'||code==='ShiftRight'||code==='KeyM'||code==='KeyR')e.preventDefault();keys[code]=true;if(movementCodes.has(code))updateControlStatus(code);if(movementCodes.has(code)&&dialog.active&&dialog.walkDismiss)closeDialog();if((code==='Space'||code==='Enter')&&!e.repeat)interact();if(code==='KeyM'&&!e.repeat&&!dialog.active){el.map.hidden=!el.map.hidden;updateMapMarker()}if(code==='KeyR'&&!e.repeat&&!dialog.active&&el.modal.hidden&&el.map.hidden&&el.how.hidden)resetToSafePosition();if(code==='Escape'){if(!el.modal.hidden)el.modal.hidden=true;else if(!el.map.hidden)el.map.hidden=true;else if(!el.how.hidden)el.how.hidden=true;else if(dialog.active)closeDialog()}},{capture:true});
  window.addEventListener('keyup',e=>{const code=e.code||e.key;keys[code]=false},{capture:true});
  window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});
  canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
  document.querySelectorAll('[data-key]').forEach(b=>{const code=b.dataset.key;const on=e=>{e.preventDefault();keys[code]=true;canvas.focus({preventScroll:true})},off=e=>{e.preventDefault();keys[code]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
  document.querySelector('[data-action="interact"]').addEventListener('pointerdown',e=>{e.preventDefault();interact();canvas.focus({preventScroll:true})});
  window.CareerQuest={showStart,stopAudio,getState:()=>({x:player.x,y:player.y,scene:currentScene,dialog:dialog.active,keys:{...keys}}),focus:()=>canvas.focus({preventScroll:true}),debugScene:(scene)=>{if(scenes[scene])setScene(scene)},debugCollision:(x,y)=>collide(x,y)}; updateProgress();
})();
