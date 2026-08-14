(function(){
  'use strict';
  const grid=document.getElementById('aiProjectList');
  if(!grid)return;
  const layout=window.AIPageLayout||{};
  const projects=(window.AIProjects||[]).filter(p=>p&&p.visible!==false&&p.id!=='playable-resume');
  const order=Array.isArray(layout.order)?layout.order:[];
  const cards=[...grid.querySelectorAll(':scope > .ai-project-card')];
  cards.forEach((card,i)=>{const p=projects[i];if(p)card.dataset.projectId=String(p.id)});
  cards.sort((a,b)=>{
    const ai=order.indexOf(a.dataset.projectId),bi=order.indexOf(b.dataset.projectId);
    return(ai<0?99999:ai)-(bi<0?99999:bi)
  }).forEach(card=>grid.appendChild(card));
})();
