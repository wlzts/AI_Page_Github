(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (!params.has('layout') && !params.has('design')) return;

  const grid = document.getElementById('projectGrid');
  const runtime = window.AIPageLayoutRuntime;
  if (!grid || !runtime) return;

  const API_URL_KEY = 'cao-jixian-resume-admin-api';
  const SESSION_KEY = 'cao-jixian-resume-admin-session';
  const DRAFT_KEY = 'cao-jixian-ai-page-v10-layout-draft';

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const projects = Array.isArray(window.AIProjects) ? window.AIProjects : [];
  const baseLayout = clone(window.AIPageLayout || { version: 10, order: [], settings: {}, style: {}, cards: {} });

  let draft = loadDraft() || baseLayout;
  let apiBase = normalizeApi(localStorage.getItem(API_URL_KEY) || '');
  let token = sessionStorage.getItem(SESSION_KEY) || '';
  let device = 'desktop';
  let selectedId = '';
  let dragging = null;
  let resizing = null;
  let dirty = false;

  ensureShape();
  window.AIPageLayout = draft;

  function normalizeApi(v) {
    return String(v || '').trim().replace(/\/+$/, '');
  }
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }
  function ensureShape() {
    draft.version = 10;
    draft.order = Array.isArray(draft.order) ? draft.order : [];
    draft.settings = draft.settings || {};
    draft.style = draft.style || {};
    draft.cards = draft.cards || {};
    const defaults = {
      desktop: { columns: 12, gap: 14, rowHeight: 120 },
      tablet: { columns: 6, gap: 12, rowHeight: 115 },
      mobile: { columns: 1, gap: 12, rowHeight: 110 }
    };
    for (const d of ['desktop', 'tablet', 'mobile']) {
      draft.settings[d] = { ...defaults[d], ...(draft.settings[d] || {}), columns: defaults[d].columns };
    }
    if (!Number.isFinite(Number(draft.style.cardRadius))) draft.style.cardRadius = 24;
    if (!Number.isFinite(Number(draft.style.cardPadding))) draft.style.cardPadding = 22;
  }
  function projectById(id) {
    return projects.find((p) => String(p.id) === String(id));
  }
  function idForCard(card) {
    return runtime.identifyCard(card);
  }
  function ensureCardSpec(id, d = device) {
    draft.cards[id] ||= {};
    if (!draft.cards[id][d]) {
      draft.cards[id][d] = { ...runtime.specFor(id, d) };
    }
    return draft.cards[id][d];
  }
  function setDirty(value = true) {
    dirty = value;
    if (value) saveDraft();
    updateStatus(value ? '有未发布的布局修改' : '布局已同步');
  }
  function updateStatus(text, type = '') {
    const el = document.getElementById('v10Status');
    if (!el) return;
    el.textContent = text;
    el.className = `v10-status${type ? ` ${type}` : ''}`;
  }

  function injectLogin() {
    if (token) return enter();
    const wrap = document.createElement('div');
    wrap.className = 'v10-login';
    wrap.id = 'v10Login';
    wrap.innerHTML = `
      <div class="v10-login-card">
        <h2>V10 布局设计器</h2>
        <p>登录后直接在真实网页上拖动项目卡片，并调整卡片大小。GitHub Token 仍只存在服务端。</p>
        <label>后台 API 地址<input id="v10Api" type="url" placeholder="https://cjx-page.vercel.app"></label>
        <label>管理员密码<input id="v10Password" type="password" autocomplete="current-password"></label>
        <div id="v10LoginStatus" style="min-height:22px;color:#ffcf88;font-size:11px"></div>
        <div class="v10-login-actions">
          <button id="v10Cancel">返回普通网页</button>
          <button class="primary" id="v10LoginBtn">登录并开始设计</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    document.getElementById('v10Api').value = apiBase || (location.hostname.endsWith('vercel.app') ? location.origin : '');
    document.getElementById('v10Cancel').onclick = exitDesigner;
    document.getElementById('v10LoginBtn').onclick = login;
  }

  async function login() {
    const api = normalizeApi(document.getElementById('v10Api').value);
    const password = document.getElementById('v10Password').value;
    const status = document.getElementById('v10LoginStatus');
    if (!api || !password) { status.textContent = '请填写 API 地址和管理员密码。'; return; }
    const btn = document.getElementById('v10LoginBtn');
    btn.disabled = true;
    btn.textContent = '验证中…';
    try {
      const res = await fetch(`${api}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.token) throw new Error(data.error || `登录失败（HTTP ${res.status}）`);
      apiBase = api;
      token = data.token;
      localStorage.setItem(API_URL_KEY, apiBase);
      sessionStorage.setItem(SESSION_KEY, token);
      document.getElementById('v10Login')?.remove();
      enter();
    } catch (e) {
      status.textContent = e.message || '登录失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '登录并开始设计';
    }
  }

  function enter() {
    document.body.classList.add('v10-design-mode');
    buildToolbar();
    buildPanel();
    decorateCards();
    setDevice('desktop');
    grid.addEventListener('click', interceptClicks, true);
    grid.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('v10:layout-applied', decorateCards);
    updateStatus(dirty ? '已载入本地布局草稿' : '拖动卡片开始设计');
  }

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.className = 'v10-toolbar';
    bar.id = 'v10Toolbar';
    bar.innerHTML = `
      <strong>V10 页面设计</strong>
      <button data-device="desktop" class="active">桌面</button>
      <button data-device="tablet">平板</button>
      <button data-device="mobile">手机</button>
      <span class="v10-status" id="v10Status">准备就绪</span>
      <span class="v10-spacer"></span>
      <button id="v10Reset">恢复默认</button>
      <button id="v10Exit">退出设计</button>
      <button class="primary" id="v10Publish">发布布局</button>`;
    document.body.appendChild(bar);
    bar.querySelectorAll('[data-device]').forEach((b) => b.addEventListener('click', () => setDevice(b.dataset.device)));
    document.getElementById('v10Exit').onclick = exitDesigner;
    document.getElementById('v10Reset').onclick = resetLayout;
    document.getElementById('v10Publish').onclick = publishLayout;
  }

  function buildPanel() {
    const panel = document.createElement('aside');
    panel.className = 'v10-panel';
    panel.id = 'v10Panel';
    panel.innerHTML = `
      <h3 id="v10PanelTitle">选择一张卡片</h3>
      <p id="v10PanelSub">点击卡片后可精确调整尺寸。</p>
      <div id="v10CardControls" hidden>
        <div class="v10-field">
          <div class="v10-field-row"><label>卡片宽度</label><span class="v10-value" id="v10WidthValue"></span></div>
          <input id="v10Width" type="range" min="1" step="1">
        </div>
        <div class="v10-field">
          <div class="v10-field-row"><label>卡片高度</label><span class="v10-value" id="v10HeightValue"></span></div>
          <input id="v10Height" type="range" min="1" max="6" step="1">
        </div>
        <div class="v10-presets">
          <button data-preset="small">小卡</button>
          <button data-preset="standard">标准</button>
          <button data-preset="wide">横向大卡</button>
          <button data-preset="large">大卡</button>
          <button data-preset="hero">Hero + 置顶</button>
        </div>
      </div>
      <div class="v10-divider"></div>
      <div class="v10-field">
        <div class="v10-field-row"><label>卡片间距</label><span class="v10-value" id="v10GapValue"></span></div>
        <input id="v10Gap" type="range" min="0" max="40" step="1">
      </div>
      <div class="v10-field">
        <div class="v10-field-row"><label>网格行高</label><span class="v10-value" id="v10RowValue"></span></div>
        <input id="v10Row" type="range" min="80" max="180" step="5">
      </div>
      <div class="v10-field">
        <div class="v10-field-row"><label>卡片圆角</label><span class="v10-value" id="v10RadiusValue"></span></div>
        <input id="v10Radius" type="range" min="0" max="40" step="1">
      </div>
      <div class="v10-field">
        <div class="v10-field-row"><label>卡片内边距</label><span class="v10-value" id="v10PaddingValue"></span></div>
        <input id="v10Padding" type="range" min="10" max="36" step="1">
      </div>
      <div class="v10-hint">拖动卡片右上角的「拖动」按钮改变顺序；拖右下角的 ↘ 可以直接改变宽高。桌面 / 平板 / 手机会分别保存自己的卡片尺寸。</div>`;
    document.body.appendChild(panel);

    document.getElementById('v10Width').addEventListener('input', (e) => setSelectedSize(Number(e.target.value), null));
    document.getElementById('v10Height').addEventListener('input', (e) => setSelectedSize(null, Number(e.target.value)));
    panel.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => applyPreset(b.dataset.preset)));

    bindGlobalRange('v10Gap', 'gap', 'v10GapValue', 'px');
    bindGlobalRange('v10Row', 'rowHeight', 'v10RowValue', 'px');
    bindStyleRange('v10Radius', 'cardRadius', 'v10RadiusValue', 'px');
    bindStyleRange('v10Padding', 'cardPadding', 'v10PaddingValue', 'px');
    syncPanel();
  }

  function bindGlobalRange(id, prop, valueId, suffix) {
    document.getElementById(id).addEventListener('input', (e) => {
      draft.settings[device][prop] = Number(e.target.value);
      document.getElementById(valueId).textContent = `${e.target.value}${suffix}`;
      window.AIPageLayout = draft;
      runtime.apply();
      setDirty();
    });
  }
  function bindStyleRange(id, prop, valueId, suffix) {
    document.getElementById(id).addEventListener('input', (e) => {
      draft.style[prop] = Number(e.target.value);
      document.getElementById(valueId).textContent = `${e.target.value}${suffix}`;
      window.AIPageLayout = draft;
      runtime.apply();
      setDirty();
    });
  }

  function setDevice(next) {
    device = next;
    document.body.classList.toggle('v10-preview-tablet', device === 'tablet');
    document.body.classList.toggle('v10-preview-mobile', device === 'mobile');
    document.querySelectorAll('#v10Toolbar [data-device]').forEach((b) => b.classList.toggle('active', b.dataset.device === device));
    runtime.setDevice(device);
    syncPanel();
  }

  function decorateCards() {
    if (!document.body.classList.contains('v10-design-mode')) return;
    const cards = Array.from(grid.querySelectorAll(':scope > .card'));
    cards.forEach((card) => {
      const id = idForCard(card);
      if (!id) return;
      if (!card.querySelector('.v10-card-tools')) {
        const tools = document.createElement('div');
        tools.className = 'v10-card-tools';
        tools.innerHTML = `<button type="button" class="v10-drag-handle" title="拖动排序">拖动</button>`;
        card.appendChild(tools);
        const resize = document.createElement('div');
        resize.className = 'v10-resize-handle';
        resize.title = '拖动改变卡片大小';
        resize.textContent = '↘';
        card.appendChild(resize);
        const badge = document.createElement('div');
        badge.className = 'v10-size-badge';
        card.appendChild(badge);
      }
      const spec = ensureCardSpec(id, device);
      const badge = card.querySelector('.v10-size-badge');
      if (badge) badge.textContent = `${spec.colSpan}×${spec.rowSpan}`;
      card.classList.toggle('v10-selected', id === selectedId);
    });
  }

  function selectCard(card) {
    selectedId = idForCard(card);
    decorateCards();
    syncPanel();
  }

  function syncPanel() {
    const s = draft.settings[device];
    document.getElementById('v10Gap').value = s.gap;
    document.getElementById('v10GapValue').textContent = `${s.gap}px`;
    document.getElementById('v10Row').value = s.rowHeight;
    document.getElementById('v10RowValue').textContent = `${s.rowHeight}px`;
    document.getElementById('v10Radius').value = draft.style.cardRadius;
    document.getElementById('v10RadiusValue').textContent = `${draft.style.cardRadius}px`;
    document.getElementById('v10Padding').value = draft.style.cardPadding;
    document.getElementById('v10PaddingValue').textContent = `${draft.style.cardPadding}px`;

    const controls = document.getElementById('v10CardControls');
    if (!selectedId) {
      controls.hidden = true;
      document.getElementById('v10PanelTitle').textContent = '选择一张卡片';
      document.getElementById('v10PanelSub').textContent = `${device === 'desktop' ? '桌面' : device === 'tablet' ? '平板' : '手机'}布局`;
      return;
    }
    const p = projectById(selectedId);
    const spec = ensureCardSpec(selectedId, device);
    controls.hidden = false;
    document.getElementById('v10PanelTitle').textContent = p?.title || selectedId;
    document.getElementById('v10PanelSub').textContent = `当前编辑：${device === 'desktop' ? '桌面' : device === 'tablet' ? '平板' : '手机'}尺寸`;
    const width = document.getElementById('v10Width');
    width.max = s.columns;
    width.value = spec.colSpan;
    document.getElementById('v10WidthValue').textContent = `${spec.colSpan} / ${s.columns} 列`;
    document.getElementById('v10Height').value = spec.rowSpan;
    document.getElementById('v10HeightValue').textContent = `${spec.rowSpan} 行`;
  }

  function setSelectedSize(col, row) {
    if (!selectedId) return;
    const spec = ensureCardSpec(selectedId, device);
    const cols = draft.settings[device].columns;
    if (col != null) spec.colSpan = clamp(Math.round(col), 1, cols);
    if (row != null) spec.rowSpan = clamp(Math.round(row), 1, 6);
    window.AIPageLayout = draft;
    runtime.apply();
    setDirty();
    syncPanel();
  }

  function syncDraftOrderFromGrid() {
    const ids = Array.from(grid.querySelectorAll(':scope > .card'))
      .map(idForCard)
      .filter(Boolean);
    const unseen = projects
      .map((p) => String(p.id))
      .filter((id) => !ids.includes(id));
    draft.order = [...ids, ...unseen];
    window.AIPageLayout = draft;
  }

  function moveSelectedToFront() {
    if (!selectedId) return;
    const card = Array.from(grid.querySelectorAll(':scope > .card'))
      .find((item) => idForCard(item) === selectedId);
    if (!card) return;

    runtime.pause();
    if (grid.firstElementChild !== card) {
      grid.insertBefore(card, grid.firstElementChild);
    }
    syncDraftOrderFromGrid();
    runtime.resume();

    setDirty();
    decorateCards();
    syncPanel();
  }

  function applyPreset(name) {
    if (!selectedId) return;
    const cols = draft.settings[device].columns;
    const presets = device === 'desktop'
      ? { small:[3,2], standard:[6,2], wide:[12,2], large:[6,3], hero:[12,3] }
      : device === 'tablet'
      ? { small:[2,2], standard:[3,2], wide:[6,2], large:[3,3], hero:[6,3] }
      : { small:[1,1], standard:[1,2], wide:[1,2], large:[1,3], hero:[1,4] };
    const [c, r] = presets[name] || [cols, 2];

    // 尺寸只影响当前设备；Hero 额外修改全局项目顺序，把当前卡片移到第一位。
    setSelectedSize(c, r);

    if (name === 'hero') {
      moveSelectedToFront();
      updateStatus('Hero 已放大并置顶（尚未发布）');
    }
  }

  function interceptClicks(e) {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.closest('.v10-drag-handle,.v10-resize-handle')) selectCard(card);
  }

  function onPointerDown(e) {
    const dragHandle = e.target.closest('.v10-drag-handle');
    const resizeHandle = e.target.closest('.v10-resize-handle');
    const card = e.target.closest('.card');
    if (!card) return;

    if (dragHandle) {
      e.preventDefault();
      selectCard(card);
      runtime.pause();
      dragging = { card, pointerId: e.pointerId };
      card.classList.add('v10-dragging');
      dragHandle.setPointerCapture?.(e.pointerId);
      return;
    }

    if (resizeHandle) {
      e.preventDefault();
      selectCard(card);
      runtime.pause();
      const id = idForCard(card);
      const spec = ensureCardSpec(id, device);
      resizing = {
        card, id, pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        startCol: spec.colSpan, startRow: spec.rowSpan
      };
      resizeHandle.setPointerCapture?.(e.pointerId);
    }
  }

  function onPointerMove(e) {
    if (dragging) {
      e.preventDefault();
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card');
      if (target && target.parentElement === grid && target !== dragging.card) {
        const r = target.getBoundingClientRect();
        const before = e.clientY < r.top + r.height / 2 ||
          (Math.abs(e.clientY - (r.top + r.height / 2)) < r.height * .25 && e.clientX < r.left + r.width / 2);
        grid.insertBefore(dragging.card, before ? target : target.nextSibling);
      }
      return;
    }

    if (resizing) {
      e.preventDefault();
      const s = draft.settings[device];
      const rect = grid.getBoundingClientRect();
      const unitX = (rect.width - (s.columns - 1) * s.gap) / s.columns + s.gap;
      const unitY = s.rowHeight + s.gap;
      const dc = Math.round((e.clientX - resizing.startX) / Math.max(1, unitX));
      const dr = Math.round((e.clientY - resizing.startY) / Math.max(1, unitY));
      const spec = ensureCardSpec(resizing.id, device);
      spec.colSpan = clamp(resizing.startCol + dc, 1, s.columns);
      spec.rowSpan = clamp(resizing.startRow + dr, 1, 6);
      resizing.card.style.gridColumn = `span ${spec.colSpan}`;
      resizing.card.style.gridRow = `span ${spec.rowSpan}`;
      const badge = resizing.card.querySelector('.v10-size-badge');
      if (badge) badge.textContent = `${spec.colSpan}×${spec.rowSpan}`;
      syncPanel();
    }
  }

  function onPointerUp() {
    if (dragging) {
      dragging.card.classList.remove('v10-dragging');
      syncDraftOrderFromGrid();
      dragging = null;
      runtime.resume();
      setDirty();
      decorateCards();
    }
    if (resizing) {
      resizing = null;
      window.AIPageLayout = draft;
      runtime.resume();
      setDirty();
      decorateCards();
      syncPanel();
    }
  }

  function resetLayout() {
    if (!confirm('恢复为 V10 默认布局？此操作只修改当前草稿，点击“发布布局”后才会写入 GitHub。')) return;
    const order = projects.map((p) => String(p.id));
    draft = {
      version: 10,
      order,
      settings: {
        desktop: { columns: 12, gap: 14, rowHeight: 120 },
        tablet: { columns: 6, gap: 12, rowHeight: 115 },
        mobile: { columns: 1, gap: 12, rowHeight: 110 }
      },
      style: { cardRadius: 24, cardPadding: 22 },
      cards: {}
    };
    window.AIPageLayout = draft;
    selectedId = '';
    runtime.apply();
    setDirty();
    syncPanel();
  }

  async function publishLayout() {
    if (!apiBase || !token) {
      updateStatus('管理员会话不存在，请重新登录', 'error');
      return;
    }
    const btn = document.getElementById('v10Publish');
    btn.disabled = true;
    btn.textContent = '发布中…';
    updateStatus('正在提交 layout-data.js…');
    try {
      const res = await fetch(`${apiBase}/api/layout-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          layout: draft,
          message: '更新 V10 可视化页面布局'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `发布失败（HTTP ${res.status}）`);
      localStorage.removeItem(DRAFT_KEY);
      dirty = false;
      updateStatus(`✓ 已发布 · ${String(data.commit?.sha || '').slice(0, 7)}`, 'ok');
    } catch (e) {
      if (e.message?.includes('登录已过期')) sessionStorage.removeItem(SESSION_KEY);
      updateStatus(e.message || '发布失败', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '发布布局';
    }
  }

  function exitDesigner() {
    const url = new URL(location.href);
    url.searchParams.delete('layout');
    url.searchParams.delete('design');
    location.href = url.toString();
  }

  injectLogin();
})();
