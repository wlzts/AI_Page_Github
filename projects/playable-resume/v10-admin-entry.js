(function(){
  'use strict';
  const SESSION_KEY='cao-jixian-resume-admin-session';
  function add(){
    const actions=document.querySelector('.header-actions');
    if(!actions||actions.querySelector('[data-v10-layout-entry]'))return;
    const a=document.createElement('a');
    a.className='pixel-button small ghost';
    a.href='../../?layout=1';
    a.textContent='▦ 页面设计';
    a.dataset.v10LayoutEntry='1';
    a.title='拖动 AI 项目卡片并调整大小';
    if(!sessionStorage.getItem(SESSION_KEY))a.hidden=true;
    actions.insertBefore(a,document.getElementById('questNav')||null);
  }
  add();
  window.addEventListener('storage',add);
  setInterval(()=>{
    const a=document.querySelector('[data-v10-layout-entry]');
    if(a)a.hidden=!sessionStorage.getItem(SESSION_KEY);
  },1200);
})();
