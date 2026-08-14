(function () {
  'use strict';

  function script(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function stylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  function addEntry() {
    const nav = document.querySelector('.nav-actions');
    if (!nav || nav.querySelector('[data-v10-entry]')) return;
    const a = document.createElement('a');
    a.className = 'mini-link';
    a.href = './?layout=1';
    a.textContent = '设计布局';
    a.dataset.v10Entry = '1';
    a.title = '直接拖动卡片并修改大小';
    nav.appendChild(a);
  }

  (async () => {
    addEntry();
    stylesheet('./layout-editor.css');
    try { await script('./layout-data.js'); }
    catch (e) {
      console.warn('V10 layout-data.js 未加载，将使用默认布局。', e);
      window.AIPageLayout ||= {
        version: 10, order: [], cards: {},
        settings: {
          desktop:{columns:12,gap:14,rowHeight:120},
          tablet:{columns:6,gap:12,rowHeight:115},
          mobile:{columns:1,gap:12,rowHeight:110}
        },
        style:{cardRadius:24,cardPadding:22}
      };
    }
    await script('./layout-runtime.js');
    await script('./layout-editor.js');
  })().catch((e) => console.error('V10 初始化失败', e));
})();
