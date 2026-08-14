(function () {
  'use strict';

  const SESSION_KEY = 'cao-jixian-resume-admin-session';
  const MANAGER_URL = 'project-manager.html';

  function hasSession() {
    try {
      return Boolean(sessionStorage.getItem(SESSION_KEY));
    } catch (_) {
      return false;
    }
  }

  function createHeaderEntry() {
    if (document.getElementById('projectManagerBtn')) return;
    const actions = document.querySelector('.header-actions');
    if (!actions) return;

    const link = document.createElement('a');
    link.id = 'projectManagerBtn';
    link.className = 'pixel-button small ghost';
    link.href = MANAGER_URL;
    link.textContent = '📦 项目发布器';
    link.title = '创建、上传、替换和删除 AI 网页项目';
    link.hidden = true;

    const questButton = document.getElementById('questNav');
    if (questButton) actions.insertBefore(link, questButton);
    else actions.appendChild(link);
  }

  function createEditorEntry() {
    if (document.getElementById('editorProjectManagerBtn')) return;
    const tools = document.querySelector('.editor-tools');
    if (!tools) return;

    const button = document.createElement('button');
    button.id = 'editorProjectManagerBtn';
    button.type = 'button';
    button.textContent = '📦 打开项目发布器';
    button.hidden = true;
    button.addEventListener('click', function () {
      location.href = MANAGER_URL;
    });

    tools.insertBefore(button, tools.firstChild);
  }

  function syncVisibility() {
    const loggedIn = hasSession();
    const header = document.getElementById('projectManagerBtn');
    const editor = document.getElementById('editorProjectManagerBtn');
    if (header) header.hidden = !loggedIn;
    if (editor) editor.hidden = !loggedIn;
  }

  function init() {
    createHeaderEntry();
    createEditorEntry();
    syncVisibility();

    // 登录/退出发生在当前页面的 sessionStorage 中；轮询能保证无需刷新立即更新入口。
    setInterval(syncVisibility, 400);

    // 页面重新获得焦点时再同步一次（例如从发布器返回）。
    window.addEventListener('focus', syncVisibility);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) syncVisibility();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
