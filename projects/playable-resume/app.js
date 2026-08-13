(function(){
  'use strict';
  const D=window.ResumeData;
  if(!D){console.error('未找到 resume-data.js 中的 ResumeData');return;}
  const AI=(window.AIProjects||[]).filter(p=>p&&p.visible!==false&&p.id!=='playable-resume');

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[m]));
  const text=(selector,value)=>document.querySelectorAll(selector).forEach(el=>el.textContent=value||'');
  const list=items=>`<ul>${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const chips=items=>`<div class="chips">${(items||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`;
  const paragraphs=value=>esc(value||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  const isUrl=v=>/^https?:\/\//i.test(v||'');

  const aiHref=p=>p.externalUrl||`../${String(p.path||'').replace(/^\/+|\/+$/g,'')}/`;

  document.title=D.site?.title||`${D.profile.name}的履历冒险`;
  const meta=$('metaDescription'); if(meta&&D.site?.description)meta.setAttribute('content',D.site.description);
  text('[data-name]',D.profile.name);
  text('[data-role]',D.profile.role);
  text('[data-role-detail]',D.profile.roleDetail||D.profile.role);
  text('[data-motto]',D.profile.motto);
  text('[data-short-bio]',D.profile.shortBio);
  text('[data-location]',D.profile.location);

  $('aboutCopy').innerHTML=paragraphs(D.profile.about);
  $('careerDirection').textContent=D.profile.careerDirection||'';
  $('values').innerHTML=(D.profile.values||[]).map((v,i)=>`<div class="value-card"><small>价值 0${i+1}</small><div>${esc(v)}</div></div>`).join('');
  $('interests').innerHTML=(D.profile.interests||[]).map(v=>`<span class="chip">${esc(v)}</span>`).join('');

  $('experienceList').innerHTML=(D.experience||[]).map(e=>`<article class="exp-card">
    <div class="exp-meta"><b>${esc(e.company)}</b><span>${esc(e.period||'时间暂未填写')}</span><span>${esc(e.location||'')}</span><span>${esc(e.industry||'')}</span></div>
    <div class="exp-body"><h3>${esc(e.role)}</h3><p>${esc(e.description)}</p><h4>核心工作与成果</h4>${list(e.achievements)}${chips(e.technologies)}<div class="takeaway"><b>招聘者可以从这里看到：</b>${esc(e.recruiterTakeaway||'')}</div></div>
  </article>`).join('') || '<p>工作经历暂未填写。</p>';

  $('educationList').innerHTML=(D.education||[]).map(e=>`<article class="education-card">
    <div class="education-head"><div><small>学历档案</small><h3>${esc(e.school)}</h3><p>${esc(e.degree)} · ${esc(e.major)}</p></div><div class="edu-meta">${esc(e.period||'时间暂未填写')}<br>${esc(e.location||'')}</div></div>
    <div class="education-grid"><div><h4>核心课程</h4>${list(e.courses)}<h4>实训项目</h4>${list(e.trainingProjects)}</div><div><h4>证书</h4>${list(e.certificates?.length?e.certificates:['暂无'])}<h4>在校成长</h4><p>${esc(e.highlight)}</p></div></div>
    <div class="takeaway"><b>教育经历重点：</b>${esc(e.recruiterTakeaway||'')}</div>
  </article>`).join('') || '<p>教育经历暂未填写。</p>';

  $('projectList').innerHTML=(D.projects||[]).map((p,i)=>`<article class="project-card">
    <small>核心项目 0${i+1} · ${esc(p.type||'项目实践')}</small><h3>${esc(p.title)}</h3><div class="project-meta">${esc(p.role)} · ${esc(p.period||'')}</div>
    <p>${esc(p.description||p.background)}</p><h4>项目成果</h4>${list(p.results)}${chips(p.technologies)}<div class="project-takeaway">${esc(p.recruiterTakeaway||'')}</div>
  </article>`).join('') || '<p>项目经历暂未填写。</p>';

  const aiList=$('aiProjectList');
  if(aiList){
    aiList.innerHTML=AI.map((p,i)=>`<a class="ai-project-card" href="${esc(aiHref(p))}" target="_blank" rel="noreferrer" style="--ai-accent:${esc(p.accent||'#2f6b53')}"><div class="ai-project-top"><span>${esc(p.category||'AI 实验')}</span><small>${esc(p.date||'')}</small></div><h3>${esc(p.title||`AI 实验 ${i+1}`)}</h3><p>${esc(p.description||'')}</p><div class="ai-project-open">进入实验 <b>↗</b></div></a>`).join('') || '<p>AI 作品库暂未填写。</p>';
  }

  $('skillList').innerHTML=(D.skills||[]).map(g=>`<article class="skill-group"><h3>${esc(g.group)}</h3><p class="skill-desc">${esc(g.description||'')}</p>${(g.items||[]).map(s=>`<div class="skill-row"><span>${esc(s.name)}</span><span class="stars" aria-label="${s.level}级">${'★'.repeat(Math.max(0,Math.min(5,s.level||0)))}${'☆'.repeat(5-Math.max(0,Math.min(5,s.level||0)))}</span></div>`).join('')}</article>`).join('');

  $('achievementList').innerHTML=(D.achievements||[]).map(a=>`<article class="achievement-card"><small>${esc(a.type||'成就')}</small><h3>${esc(a.title)}</h3><div class="achievement-meta">${esc(a.year||'')} · ${esc(a.issuer||'')}</div><p>${esc(a.description||'')}</p></article>`).join('') || '<p>证书与成就暂未填写。</p>';

  const contacts=[];
  if(D.profile.email)contacts.push(['发送邮件',`mailto:${D.profile.email}`,false]);
  if(D.profile.linkedin)contacts.push(['LinkedIn',D.profile.linkedin,true]);
  if(D.profile.github)contacts.push(['GitHub',D.profile.github,true]);
  if(D.profile.twitter)contacts.push(['Twitter / X',D.profile.twitter,true]);
  if(D.profile.website)contacts.push(['个人网站',D.profile.website,true]);
  if(D.profile.resume)contacts.push(['下载简历 PDF',D.profile.resume,true]);
  $('contactLinks').innerHTML=contacts.map(([label,url,newTab])=>`<a class="pixel-button${label==='发送邮件'?' primary':''}" href="${esc(url)}" ${newTab?'target="_blank" rel="noreferrer"':''}>${esc(label)} ↗</a>`).join('');

  const resumeLink=$('headerResumeLink');
  if(resumeLink){
    if(D.profile.resume){resumeLink.href=D.profile.resume;resumeLink.hidden=false;}else resumeLink.hidden=true;
  }

  function openQuest(){
    $('resumeMode').hidden=true;$('siteHeader').hidden=true;$('questMode').hidden=false;document.body.style.overflow='hidden';
    if(window.CareerQuest)window.CareerQuest.showStart();
  }
  function closeQuest(){
    $('questMode').hidden=true;$('resumeMode').hidden=false;$('siteHeader').hidden=false;document.body.style.overflow='';
    if(window.CareerQuest)window.CareerQuest.stopAudio();
  }
  ['startQuestHome','questNav'].forEach(id=>$(id)?.addEventListener('click',openQuest));
  $('backToResume')?.addEventListener('click',closeQuest);
  $('exitQuest')?.addEventListener('click',closeQuest);
  window.closeQuestMode=closeQuest;
})();
