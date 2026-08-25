@import "tailwindcss";

:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background: #09090b;
  color: #f4f4f5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
html { background: #09090b; }
body { margin: 0; min-width: 320px; min-height: 100vh; background: #09090b; }
button, input, select { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid rgba(251, 191, 36, 0.75);
  outline-offset: 2px;
}
button:disabled { cursor: not-allowed; opacity: 0.42; }

.app-shell {
  min-height: 100vh;
  background: #09090b;
  padding-bottom: env(safe-area-inset-bottom);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #27272a;
  background: rgba(9, 9, 11, 0.94);
  padding: 10px 16px;
  backdrop-filter: blur(18px);
}

.brand-lockup { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; }
.brand-mark {
  display: grid;
  height: 36px;
  width: 36px;
  place-items: center;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  background: #18181b;
  color: #fbbf24;
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
}
.project-name-wrap {
  display: flex;
  min-width: 150px;
  max-width: 340px;
  flex: 1 1 260px;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 5px 9px;
}
.project-name-wrap:focus-within { border-color: #3f3f46; background: #18181b; }
.project-name-input { min-width: 0; width: 100%; border: 0; background: transparent; color: #e4e4e7; font-size: 13px; font-weight: 600; outline: none !important; }
.toolbar-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.toolbar-actions::-webkit-scrollbar { display: none; }
.toolbar-divider { width: 1px; height: 24px; background: #27272a; margin: 0 2px; }

.icon-button, .toolbar-button, .secondary-button, .primary-button, .export-button, .text-button, .round-control, .play-control, .icon-button-small {
  transition: transform 150ms ease, background 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
}
.icon-button:hover:not(:disabled), .toolbar-button:hover:not(:disabled), .secondary-button:hover:not(:disabled), .round-control:hover:not(:disabled), .icon-button-small:hover:not(:disabled) { transform: translateY(-1px); }
.icon-button { display: grid; height: 34px; width: 34px; place-items: center; border: 1px solid #27272a; border-radius: 10px; background: #18181b; color: #a1a1aa; }
.icon-button:hover:not(:disabled) { border-color: #3f3f46; background: #27272a; color: #fff; }
.icon-button-small { display: grid; height: 26px; width: 26px; place-items: center; border: 0; border-radius: 7px; background: transparent; color: #71717a; }
.icon-button-small:hover:not(:disabled) { background: #27272a; color: #d4d4d8; }
.toolbar-button, .secondary-button, .primary-button, .export-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  padding: 8px 11px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.toolbar-button, .secondary-button { border: 1px solid #27272a; background: #18181b; color: #a1a1aa; }
.toolbar-button:hover:not(:disabled), .secondary-button:hover:not(:disabled) { border-color: #3f3f46; background: #27272a; color: #fff; }
.export-button, .primary-button { border: 1px solid #f59e0b; background: #fbbf24; color: #18181b; box-shadow: 0 6px 24px rgba(245, 158, 11, .12); }
.export-button:hover:not(:disabled), .primary-button:hover:not(:disabled) { background: #fcd34d; transform: translateY(-1px); }
.text-button { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; padding: 5px 7px; color: #71717a; font-size: 11px; font-weight: 700; }
.text-button:hover:not(:disabled) { color: #e4e4e7; }
.danger-text:hover:not(:disabled) { color: #fda4af; }

.workspace-grid { display: grid; grid-template-columns: minmax(0, 1fr) 292px; gap: 14px; max-width: 1500px; margin: 0 auto; padding: 14px 16px; }
.studio-column { min-width: 0; }
.preview-shell { overflow: hidden; border: 1px solid #27272a; border-radius: 16px; background: #111113; box-shadow: 0 20px 50px rgba(0,0,0,.23); }
.preview-topline { display: flex; height: 38px; align-items: center; justify-content: space-between; border-bottom: 1px solid #232326; padding: 0 11px 0 13px; background: #151517; }
.status-dot { height: 7px; width: 7px; border-radius: 999px; box-shadow: 0 0 0 3px rgba(255,255,255,.025); }
.preview-stage { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #000; }
.preview-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; transition: opacity 120ms linear; }
.capture-flash { position: absolute; inset: 0; pointer-events: none; background: white; animation: flash 145ms ease-out forwards; }
@keyframes flash { 0% { opacity: .72; } 100% { opacity: 0; } }

.capture-zone { display: flex; height: 104px; align-items: flex-start; justify-content: center; padding-top: 15px; }
.capture-button { position: relative; display: grid; height: 66px; width: 66px; place-items: center; border: 0; border-radius: 999px; background: transparent; color: white; }
.capture-ring { position: absolute; inset: 0; border-radius: 999px; border: 3px solid #f4f4f5; box-shadow: 0 7px 30px rgba(0,0,0,.34); transition: transform 150ms ease, border-color 150ms ease; }
.capture-core { display: grid; height: 52px; width: 52px; place-items: center; border-radius: 999px; background: #f43f5e; box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); transition: transform 120ms ease, background 120ms ease; }
.capture-button:hover:not(:disabled) .capture-ring { transform: scale(1.06); border-color: #fff; }
.capture-button:hover:not(:disabled) .capture-core { transform: scale(.95); background: #fb7185; }
.capture-button:active:not(:disabled) .capture-core { transform: scale(.88); }

.playback-bar { display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid #27272a; border-radius: 14px; background: #121214; padding: 9px 12px; }
.playback-controls { display: flex; align-items: center; gap: 7px; }
.round-control { display: grid; height: 34px; width: 34px; place-items: center; border: 1px solid #27272a; border-radius: 999px; background: #18181b; color: #a1a1aa; }
.round-control:hover:not(:disabled) { border-color: #3f3f46; color: #fff; }
.play-control { display: grid; height: 42px; width: 42px; place-items: center; border: 1px solid #fafafa; border-radius: 999px; background: #f4f4f5; color: #18181b; }
.play-control:hover:not(:disabled) { transform: scale(1.04); background: #fff; }
.playback-meta { display: flex; align-items: center; gap: 8px; color: #71717a; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
.meta-dot { height: 3px; width: 3px; border-radius: 99px; background: #3f3f46; }

.settings-panel { align-self: start; border: 1px solid #27272a; border-radius: 16px; background: #121214; padding: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.16); }
.settings-title { padding: 2px 1px 11px; color: #f4f4f5; font-size: 13px; font-weight: 800; }
.setting-group { border-top: 1px solid #27272a; padding: 14px 1px; }
.setting-label { display: flex; align-items: center; justify-content: space-between; color: #d4d4d8; font-size: 12px; font-weight: 700; }
.setting-value { border-radius: 7px; background: #27272a; padding: 3px 7px; color: #fbbf24; font-size: 11px; font-variant-numeric: tabular-nums; }
.fps-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin-top: 10px; }
.fps-button { border: 1px solid #27272a; border-radius: 8px; background: #18181b; padding: 6px 0; color: #71717a; font-size: 11px; font-weight: 700; }
.fps-button:hover { border-color: #3f3f46; color: #e4e4e7; }
.fps-active { border-color: rgba(251,191,36,.46); background: rgba(251,191,36,.09); color: #fcd34d; }
.toggle { position: relative; width: 36px; height: 20px; border: 1px solid #3f3f46; border-radius: 999px; background: #27272a; transition: all 150ms ease; }
.toggle span { position: absolute; top: 3px; left: 3px; height: 12px; width: 12px; border-radius: 999px; background: #a1a1aa; transition: transform 150ms ease, background 150ms ease; }
.toggle-on { border-color: rgba(251,191,36,.55); background: rgba(251,191,36,.2); }
.toggle-on span { transform: translateX(16px); background: #fbbf24; }
.range-input { width: 100%; accent-color: #fbbf24; }
.select-input, .text-input { width: 100%; border: 1px solid #3f3f46; border-radius: 10px; background: #18181b; padding: 8px 10px; color: #d4d4d8; font-size: 12px; outline: none; }
.select-input:hover, .text-input:hover { border-color: #52525b; }

.timeline-panel { max-width: 1500px; margin: 0 auto 16px; border: 1px solid #27272a; border-radius: 16px; background: #111113; box-shadow: 0 20px 50px rgba(0,0,0,.18); }
.timeline-header { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #27272a; padding: 10px 13px; }
.timeline-scroller { min-height: 148px; overflow-x: auto; overscroll-behavior-x: contain; padding: 11px 12px 14px; scrollbar-color: #3f3f46 #18181b; }
.timeline-empty { display: flex; min-height: 115px; align-items: center; justify-content: center; gap: 13px; color: #71717a; }
.frame-card { position: relative; width: 146px; flex: 0 0 146px; overflow: hidden; border: 1px solid #27272a; border-radius: 12px; background: #18181b; content-visibility: auto; contain-intrinsic-size: 146px 118px; }
.frame-card:hover { border-color: #3f3f46; }
.frame-selected { border-color: rgba(251,191,36,.58); box-shadow: 0 0 0 1px rgba(251,191,36,.15); }
.frame-active { border-color: #fbbf24; box-shadow: 0 0 0 2px rgba(251,191,36,.17); }
.frame-image-button { position: relative; display: block; width: 100%; aspect-ratio: 16/9; overflow: hidden; border: 0; background: #09090b; padding: 0; }
.frame-number { position: absolute; left: 6px; bottom: 6px; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; background: rgba(9,9,11,.78); padding: 2px 5px; color: #d4d4d8; font-size: 9px; font-weight: 800; font-variant-numeric: tabular-nums; backdrop-filter: blur(8px); }
.frame-actions { display: flex; height: 32px; align-items: center; justify-content: flex-end; gap: 1px; padding: 2px 4px; border-top: 1px solid #27272a; }

.dialog-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(0,0,0,.72); padding: 16px; backdrop-filter: blur(9px); }
.dialog-card { width: min(680px, 100%); overflow: hidden; border: 1px solid #3f3f46; border-radius: 16px; background: #121214; box-shadow: 0 30px 90px rgba(0,0,0,.58); }
.dialog-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 1px solid #27272a; padding: 16px; }
.dialog-body { padding: 16px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #27272a; padding: 12px 16px; }
.field-label { display: block; margin-bottom: 7px; color: #a1a1aa; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.format-card { display: flex; align-items: center; gap: 10px; border: 1px solid #27272a; border-radius: 12px; background: #18181b; padding: 11px; text-align: left; color: #71717a; }
.format-card span { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.format-card strong { color: #d4d4d8; font-size: 12px; }
.format-card small { color: #71717a; font-size: 10px; }
.format-card:hover:not(:disabled) { border-color: #3f3f46; }
.format-active { border-color: rgba(251,191,36,.5); background: rgba(251,191,36,.07); color: #fbbf24; }
.progress-track { height: 7px; overflow: hidden; border-radius: 999px; background: #27272a; }
.progress-bar { height: 100%; border-radius: 999px; background: #fbbf24; transition: width 100ms linear; }
.project-row { display: flex; align-items: center; gap: 10px; border: 1px solid #27272a; border-radius: 12px; background: #18181b; padding: 10px; }
.project-row:hover { border-color: #3f3f46; }
.project-row-current { border-color: rgba(251,191,36,.35); }
.current-badge { border-radius: 999px; background: rgba(251,191,36,.1); padding: 2px 6px; color: #fbbf24; font-size: 9px; font-weight: 800; }
.toast { position: fixed; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); z-index: 100; transform: translateX(-50%); border: 1px solid #3f3f46; border-radius: 999px; background: rgba(24,24,27,.95); padding: 9px 14px; color: #e4e4e7; font-size: 12px; font-weight: 700; box-shadow: 0 15px 50px rgba(0,0,0,.45); backdrop-filter: blur(12px); animation: toast-in 180ms ease-out; }
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

@media (max-width: 900px) {
  .workspace-grid { grid-template-columns: minmax(0,1fr); }
  .settings-panel { order: 2; }
  .timeline-panel { margin-left: 12px; margin-right: 12px; }
}

@media (max-width: 640px) {
  .topbar { min-height: 58px; gap: 8px; padding: 8px 10px; }
  .brand-mark { height: 34px; width: 34px; border-radius: 11px; }
  .project-name-wrap { min-width: 115px; padding: 5px 6px; }
  .project-name-input { font-size: 12px; }
  .toolbar-divider { display: none; }
  .toolbar-button { padding: 8px; }
  .workspace-grid { gap: 10px; padding: 10px; }
  .preview-shell, .settings-panel, .timeline-panel { border-radius: 13px; }
  .preview-topline { height: 36px; }
  .capture-zone { height: 96px; }
  .playback-bar { flex-direction: column; justify-content: center; padding: 10px; }
  .playback-meta { justify-content: center; }
  .timeline-panel { margin-bottom: 10px; }
  .timeline-header { align-items: flex-start; }
  .timeline-header > div:last-child { flex-direction: column; align-items: flex-end; }
  .frame-card { width: 128px; flex-basis: 128px; }
  .dialog-backdrop { align-items: end; padding: 0; }
  .dialog-card { max-height: 92vh; overflow-y: auto; border-radius: 18px 18px 0 0; }
}
