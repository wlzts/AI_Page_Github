(function () {
  'use strict';

  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  const projects = Array.isArray(window.AIProjects) ? window.AIProjects : [];
  const layout = window.AIPageLayout || {};
  let paused = false;
  let overrideDevice = '';
  let scheduled = 0;

  const defaults = {
    desktop: { columns: 12, gap: 14, rowHeight: 120 },
    tablet: { columns: 6, gap: 12, rowHeight: 115 },
    mobile: { columns: 1, gap: 12, rowHeight: 110 }
  };

  function deviceForWidth() {
    if (overrideDevice) return overrideDevice;
    if (window.innerWidth <= 620) return 'mobile';
    if (window.innerWidth <= 900) return 'tablet';
    return 'desktop';
  }

  function settingsFor(device) {
    const raw = layout.settings?.[device] || {};
    const base = defaults[device];
    return {
      columns: base.columns,
      gap: Math.max(0, Math.min(48, Number(raw.gap ?? base.gap) || base.gap)),
      rowHeight: Math.max(72, Math.min(220, Number(raw.rowHeight ?? base.rowHeight) || base.rowHeight))
    };
  }

  function hrefOf(p) {
    return p.externalUrl || `./projects/${String(p.path || '').replace(/^\/+|\/+$/g, '')}/`;
  }

  function identifyCard(card) {
    if (card.dataset.projectId) return card.dataset.projectId;
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    const href = card.getAttribute('href') || '';
    const match =
      projects.find((p) => String(p.title || '').trim() === title) ||
      projects.find((p) => href && hrefOf(p) === href) ||
      projects.find((p) => href && String(href).includes(`/projects/${String(p.path || '').replace(/^\/+|\/+$/g, '')}/`));
    const id = match ? String(match.id) : title;
    if (id) card.dataset.projectId = id;
    return id;
  }

  function defaultSpec(id, device) {
    const p = projects.find((item) => String(item.id) === String(id));
    if (device === 'mobile') return { colSpan: 1, rowSpan: p?.featured ? 3 : 2 };
    if (device === 'tablet') return { colSpan: p?.featured ? 6 : 3, rowSpan: p?.featured ? 3 : 2 };
    return { colSpan: p?.featured ? 12 : 6, rowSpan: p?.featured ? 3 : 2 };
  }

  function specFor(id, device) {
    const s = settingsFor(device);
    const raw = layout.cards?.[id]?.[device];
    const base = defaultSpec(id, device);
    return {
      colSpan: Math.max(1, Math.min(s.columns, Math.round(Number(raw?.colSpan ?? base.colSpan) || base.colSpan))),
      rowSpan: Math.max(1, Math.min(6, Math.round(Number(raw?.rowSpan ?? base.rowSpan) || base.rowSpan)))
    };
  }

  function orderIndex(id) {
    const order = Array.isArray(layout.order) ? layout.order : [];
    const i = order.indexOf(id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  }

  function apply() {
    if (paused) return;
    observer.disconnect();

    const device = deviceForWidth();
    const s = settingsFor(device);
    grid.dataset.v10Layout = '1';
    grid.dataset.v10Device = device;
    grid.style.gridTemplateColumns = `repeat(${s.columns}, minmax(0, 1fr))`;
    grid.style.gap = `${s.gap}px`;
    grid.style.gridAutoRows = `${s.rowHeight}px`;

    const cards = Array.from(grid.querySelectorAll(':scope > .card'));
    for (const card of cards) identifyCard(card);

    cards
      .slice()
      .sort((a, b) => orderIndex(a.dataset.projectId) - orderIndex(b.dataset.projectId))
      .forEach((card) => grid.appendChild(card));

    const radius = Math.max(0, Math.min(48, Number(layout.style?.cardRadius ?? 24) || 24));
    const padding = Math.max(8, Math.min(48, Number(layout.style?.cardPadding ?? 22) || 22));

    for (const card of cards) {
      const id = card.dataset.projectId || identifyCard(card);
      const spec = specFor(id, device);
      card.style.gridColumn = `span ${spec.colSpan}`;
      card.style.gridRow = `span ${spec.rowSpan}`;
      card.style.minHeight = '0';
      card.style.borderRadius = `${radius}px`;
      const main = card.querySelector('.card-main');
      if (main) main.style.padding = `${padding}px`;
    }

    observer.observe(grid, { childList: true });
    window.dispatchEvent(new CustomEvent('v10:layout-applied', { detail: { device } }));
  }

  function scheduleApply() {
    if (paused || scheduled) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      apply();
    });
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(grid, { childList: true });

  function pause() {
    paused = true;
    observer.disconnect();
  }

  function resume() {
    paused = false;
    apply();
  }

  function setDevice(device) {
    overrideDevice = ['desktop', 'tablet', 'mobile'].includes(device) ? device : '';
    apply();
  }

  window.AIPageLayoutRuntime = {
    apply,
    pause,
    resume,
    setDevice,
    getDevice: deviceForWidth,
    settingsFor,
    specFor,
    identifyCard
  };

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 120);
  });

  apply();
})();
