'use strict';

(() => {
  const DB_NAME = 'stop-motion-studio-db';
  const DB_VERSION = 1;
  const PROJECT_STORE = 'projects';
  const CURRENT_PROJECT_KEY = 'stopMotionStudioCurrentProjectId';
  const HISTORY_LIMIT = 40;
  const CAPTURE_LONG_EDGE = 1280;
  const THUMB_LONG_EDGE = 240;

  const $ = (id) => document.getElementById(id);
  const els = {
    projectName: $('projectName'), saveStatus: $('saveStatus'), newProjectBtn: $('newProjectBtn'), undoBtn: $('undoBtn'), redoBtn: $('redoBtn'), importBtn: $('importBtn'), exportBtn: $('exportBtn'), settingsBtn: $('settingsBtn'),
    frameCount: $('frameCount'), durationLabel: $('durationLabel'), timelineSummary: $('timelineSummary'), modeDot: $('modeDot'), modeLabel: $('modeLabel'), stage: $('stage'), cameraVideo: $('cameraVideo'), onionOverlay: $('onionOverlay'), playbackCanvas: $('playbackCanvas'), cameraEmpty: $('cameraEmpty'), cameraError: $('cameraError'), cameraErrorText: $('cameraErrorText'), shutterFlash: $('shutterFlash'),
    startCameraBtn: $('startCameraBtn'), retryCameraBtn: $('retryCameraBtn'), cameraToggleBtn: $('cameraToggleBtn'), cameraSelect: $('cameraSelect'), switchCameraBtn: $('switchCameraBtn'),
    emptyImportBtn: $('emptyImportBtn'), errorImportBtn: $('errorImportBtn'), fileInput: $('fileInput'),
    onionToggle: $('onionToggle'), onionOpacity: $('onionOpacity'), onionOpacityValue: $('onionOpacityValue'), shutterBtn: $('shutterBtn'),
    firstFrameBtn: $('firstFrameBtn'), prevFrameBtn: $('prevFrameBtn'), playBtn: $('playBtn'), nextFrameBtn: $('nextFrameBtn'), loopToggle: $('loopToggle'), fpsRange: $('fpsRange'), fpsValue: $('fpsValue'),
    timeline: $('timeline'), timelineEmpty: $('timelineEmpty'), selectionTools: $('selectionTools'), duplicateBtn: $('duplicateBtn'), moveLeftBtn: $('moveLeftBtn'), moveRightBtn: $('moveRightBtn'), deleteBtn: $('deleteBtn'),
    modalBackdrop: $('modalBackdrop'), confirmModal: $('confirmModal'), confirmTitle: $('confirmTitle'), confirmText: $('confirmText'), confirmCancelBtn: $('confirmCancelBtn'), confirmOkBtn: $('confirmOkBtn'),
    settingsModal: $('settingsModal'), settingsRatio: $('settingsRatio'), settingsFps: $('settingsFps'), settingsLoop: $('settingsLoop'), settingsCloseBtn: $('settingsCloseBtn'),
    exportModal: $('exportModal'), exportMessage: $('exportMessage'), exportProgress: $('exportProgress'), exportPercent: $('exportPercent'), exportCancelBtn: $('exportCancelBtn'), toastRegion: $('toastRegion')
  };

  const state = {
    db: null,
    persistenceAvailable: true,
    project: null,
    selectedFrameId: null,
    stream: null,
    devices: [],
    facingMode: 'environment',
    playing: false,
    playIndex: 0,
    playTimer: null,
    history: [],
    future: [],
    saveTimer: null,
    objectUrls: new Map(),
    draggingId: null,
    exportCancelled: false,
    exportRecorder: null,
    confirmResolver: null
  };

  function uid(prefix = 'id') {
    if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function ratioValue(ratio = state.project?.aspectRatio || '16:9') {
    const [w, h] = ratio.split(':').map(Number);
    return w / h;
  }

  function fitSize(longEdge, ratio) {
    const r = ratioValue(ratio);
    if (r >= 1) return { width: longEdge, height: Math.round(longEdge / r) };
    return { width: Math.round(longEdge * r), height: longEdge };
  }

  function createProject(name = '我的定格动画') {
    const now = new Date().toISOString();
    return {
      id: uid('project'), name, createdAt: now, updatedAt: now,
      fps: 8, aspectRatio: '16:9', onionSkinOpacity: 40, onionSkinEnabled: false,
      loop: true, frames: []
    };
  }

  function cloneFrame(frame) {
    return { id: frame.id, blob: frame.blob, thumbBlob: frame.thumbBlob, createdAt: frame.createdAt };
  }

  function snapshotFrames() {
    return state.project.frames.map(cloneFrame);
  }

  function pushHistory() {
    state.history.push(snapshotFrames());
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.future = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    els.undoBtn.disabled = state.history.length === 0;
    els.redoBtn.disabled = state.future.length === 0;
  }

  async function undo() {
    if (!state.history.length || state.playing) return;
    state.future.push(snapshotFrames());
    revokeAllFrameUrls();
    state.project.frames = state.history.pop().map(cloneFrame);
    state.selectedFrameId = state.project.frames.at(-1)?.id || null;
    renderTimeline(); updateOnionSkin(); scheduleSave(); updateHistoryButtons();
  }

  async function redo() {
    if (!state.future.length || state.playing) return;
    state.history.push(snapshotFrames());
    revokeAllFrameUrls();
    state.project.frames = state.future.pop().map(cloneFrame);
    state.selectedFrameId = state.project.frames.at(-1)?.id || null;
    renderTimeline(); updateOnionSkin(); scheduleSave(); updateHistoryButtons();
  }

  function toast(message, type = 'info', timeout = 2800) {
    const node = document.createElement('div');
    node.className = `toast ${type === 'error' ? 'error' : ''}`;
    node.textContent = message;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), timeout);
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
  }

  function idbGet(id) {
    return new Promise((resolve, reject) => {
      const req = state.db.transaction(PROJECT_STORE, 'readonly').objectStore(PROJECT_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function idbPut(project) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(PROJECT_STORE, 'readwrite');
      tx.objectStore(PROJECT_STORE).put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  async function initPersistence() {
    try {
      state.db = await openDB();
      const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (currentId) state.project = await idbGet(currentId);
    } catch (err) {
      console.warn('IndexedDB unavailable, using memory-only mode.', err);
      state.persistenceAvailable = false;
      toast('浏览器本地数据库不可用：当前项目只能保留到本次页面关闭。', 'error', 5500);
    }
    if (!state.project) state.project = createProject();
    if (state.persistenceAvailable) {
      localStorage.setItem(CURRENT_PROJECT_KEY, state.project.id);
      await saveNow();
    }
  }

  function scheduleSave() {
    state.project.updatedAt = new Date().toISOString();
    els.saveStatus.textContent = state.persistenceAvailable ? '保存中…' : '仅本次会话';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveNow, 450);
  }

  async function saveNow() {
    if (!state.project || !state.persistenceAvailable || !state.db) return;
    clearTimeout(state.saveTimer);
    try {
      state.project.updatedAt = new Date().toISOString();
      await idbPut(state.project);
      localStorage.setItem(CURRENT_PROJECT_KEY, state.project.id);
      els.saveStatus.textContent = '已保存';
    } catch (err) {
      console.error(err);
      els.saveStatus.textContent = '保存失败';
      toast('自动保存失败，请检查浏览器存储空间。', 'error');
    }
  }

  function getFrameUrl(frame, thumb = true) {
    const key = `${frame.id}:${thumb ? 'thumb' : 'full'}`;
    if (state.objectUrls.has(key)) return state.objectUrls.get(key);
    const blob = thumb && frame.thumbBlob ? frame.thumbBlob : frame.blob;
    const url = URL.createObjectURL(blob);
    state.objectUrls.set(key, url);
    return url;
  }

  function revokeFrameUrls(frameId) {
    for (const [key, url] of state.objectUrls.entries()) {
      if (key.startsWith(`${frameId}:`)) { URL.revokeObjectURL(url); state.objectUrls.delete(key); }
    }
  }

  function revokeAllFrameUrls() {
    for (const url of state.objectUrls.values()) URL.revokeObjectURL(url);
    state.objectUrls.clear();
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateProjectUI() {
    els.projectName.value = state.project.name;
    els.fpsRange.value = state.project.fps;
    els.fpsValue.value = `${state.project.fps} FPS`;
    els.loopToggle.checked = state.project.loop;
    els.onionToggle.checked = !!state.project.onionSkinEnabled;
    els.onionOpacity.value = state.project.onionSkinOpacity;
    els.onionOpacityValue.value = `${state.project.onionSkinOpacity}%`;
    els.onionOverlay.style.opacity = String(state.project.onionSkinOpacity / 100);
    setAspectRatio(state.project.aspectRatio, false);
    syncFpsPreset();
    renderTimeline();
    updateOnionSkin();
  }

  function renderTimeline() {
    const frames = state.project.frames;
    els.frameCount.textContent = `${frames.length} FRAMES`;
    els.timelineSummary.textContent = `${frames.length} 帧 · ${state.project.fps} FPS`;
    els.durationLabel.textContent = formatDuration(frames.length / state.project.fps);
    els.timeline.replaceChildren();

    if (!frames.length) {
      els.timeline.appendChild(els.timelineEmpty);
      els.timelineEmpty.classList.remove('hidden');
    } else {
      frames.forEach((frame, index) => {
        const card = document.createElement('div');
        card.className = 'frame-card';
        card.draggable = true;
        card.dataset.frameId = frame.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `第 ${index + 1} 帧`);
        if (frame.id === state.selectedFrameId) card.classList.add('selected');
        if (state.playing && index === state.playIndex) card.classList.add('playing');

        const img = document.createElement('img');
        img.className = 'frame-thumb'; img.alt = ''; img.draggable = false; img.src = getFrameUrl(frame, true);
        const footer = document.createElement('div'); footer.className = 'frame-footer';
        const num = document.createElement('span'); num.className = 'frame-number'; num.textContent = String(index + 1).padStart(3, '0');
        const grip = document.createElement('span'); grip.className = 'drag-grip'; grip.textContent = '•••'; grip.setAttribute('aria-hidden', 'true');
        footer.append(num, grip); card.append(img, footer);

        card.addEventListener('click', () => selectFrame(frame.id));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFrame(frame.id); } });
        card.addEventListener('dragstart', onDragStart);
        card.addEventListener('dragover', onDragOver);
        card.addEventListener('drop', onDrop);
        card.addEventListener('dragend', onDragEnd);
        els.timeline.appendChild(card);
      });
    }
    els.selectionTools.classList.toggle('hidden', !state.selectedFrameId || !frames.length);
    updateHistoryButtons();
  }

  function selectFrame(id) {
    state.selectedFrameId = id;
    renderTimeline();
    if (!state.playing) previewSelectedFrameBriefly(id);
  }

  async function previewSelectedFrameBriefly(id) {
    const frame = state.project.frames.find(f => f.id === id);
    if (!frame || state.playing) return;
    try {
      await drawBlobToCanvas(frame.blob, els.playbackCanvas, state.project.aspectRatio);
      els.playbackCanvas.style.display = 'block';
      clearTimeout(previewSelectedFrameBriefly.timer);
      previewSelectedFrameBriefly.timer = setTimeout(() => { if (!state.playing) els.playbackCanvas.style.display = 'none'; }, 450);
    } catch {}
  }

  function onDragStart(e) {
    if (state.playing) { e.preventDefault(); return; }
    state.draggingId = e.currentTarget.dataset.frameId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onDrop(e) {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.frameId;
    if (!state.draggingId || targetId === state.draggingId) return;
    pushHistory();
    const from = state.project.frames.findIndex(f => f.id === state.draggingId);
    const to = state.project.frames.findIndex(f => f.id === targetId);
    const [moved] = state.project.frames.splice(from, 1);
    state.project.frames.splice(to, 0, moved);
    renderTimeline(); scheduleSave(); updateOnionSkin();
  }
  function onDragEnd(e) { e.currentTarget.classList.remove('dragging'); state.draggingId = null; }

  async function enumerateCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.devices = devices.filter(d => d.kind === 'videoinput');
      const current = els.cameraSelect.value;
      els.cameraSelect.replaceChildren(new Option('默认摄像头', ''));
      state.devices.forEach((d, i) => els.cameraSelect.appendChild(new Option(d.label || `摄像头 ${i + 1}`, d.deviceId)));
      if (state.devices.some(d => d.deviceId === current)) els.cameraSelect.value = current;
    } catch (err) { console.warn('Camera enumeration failed', err); }
  }

  async function startCamera(deviceId = '') {
    if (!navigator.mediaDevices?.getUserMedia) {
      showCameraError('当前浏览器不支持摄像头 API。你仍然可以导入图片制作动画。'); return;
    }
    stopCamera();
    els.cameraError.classList.add('hidden');
    try {
      const video = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: { ideal: state.facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } };
      state.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      els.cameraVideo.srcObject = state.stream;
      await els.cameraVideo.play();
      els.cameraEmpty.classList.add('hidden');
      els.cameraError.classList.add('hidden');
      els.cameraToggleBtn.textContent = '关闭摄像头';
      await enumerateCameras();
      const activeId = state.stream.getVideoTracks()[0]?.getSettings?.().deviceId;
      if (activeId) els.cameraSelect.value = activeId;
      updateOnionSkin();
    } catch (err) {
      console.error(err);
      let message = '请检查浏览器的摄像头权限，然后重新尝试。';
      if (!window.isSecureContext) message = '摄像头需要 HTTPS 或 localhost。请通过 GitHub Pages 的 HTTPS 地址访问。';
      else if (err?.name === 'NotAllowedError') message = '摄像头权限被拒绝。请在浏览器站点设置中允许摄像头，然后重新尝试。';
      else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') message = '没有检测到可用摄像头。你可以导入本地图片继续制作。';
      else if (err?.name === 'NotReadableError') message = '摄像头可能正被其他应用占用。关闭其他相机应用后再试。';
      showCameraError(message);
    }
  }

  function stopCamera() {
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
    els.cameraVideo.srcObject = null;
    els.cameraToggleBtn.textContent = '摄像头';
  }

  function showCameraError(message) {
    els.cameraEmpty.classList.add('hidden');
    els.cameraErrorText.textContent = message;
    els.cameraError.classList.remove('hidden');
  }

  function sourceCrop(sourceWidth, sourceHeight, targetRatio) {
    const sourceRatio = sourceWidth / sourceHeight;
    let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    if (sourceRatio > targetRatio) { sw = sourceHeight * targetRatio; sx = (sourceWidth - sw) / 2; }
    else { sh = sourceWidth / targetRatio; sy = (sourceHeight - sh) / 2; }
    return { sx, sy, sw, sh };
  }

  function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas encoding failed')), type, quality));
  }

  async function captureFrame() {
    if (state.playing) return;
    if (!state.stream || els.cameraVideo.readyState < 2) { toast('请先启动摄像头。', 'error'); return; }
    const vw = els.cameraVideo.videoWidth, vh = els.cameraVideo.videoHeight;
    if (!vw || !vh) { toast('摄像头画面还没准备好。', 'error'); return; }

    els.shutterBtn.classList.add('capturing');
    els.shutterFlash.classList.remove('active'); void els.shutterFlash.offsetWidth; els.shutterFlash.classList.add('active');
    try {
      const size = fitSize(CAPTURE_LONG_EDGE, state.project.aspectRatio);
      const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext('2d', { alpha: false });
      const crop = sourceCrop(vw, vh, ratioValue());
      ctx.drawImage(els.cameraVideo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      const thumbBlob = await makeThumbnail(canvas);
      pushHistory();
      const frame = { id: uid('frame'), blob, thumbBlob, createdAt: new Date().toISOString() };
      state.project.frames.push(frame); state.selectedFrameId = frame.id;
      renderTimeline(); updateOnionSkin(); scheduleSave();
      requestAnimationFrame(() => scrollFrameIntoView(frame.id));
    } catch (err) {
      console.error(err); toast('拍摄失败，请重试。', 'error');
    } finally {
      setTimeout(() => els.shutterBtn.classList.remove('capturing'), 120);
    }
  }

  async function makeThumbnail(sourceCanvas) {
    const size = fitSize(THUMB_LONG_EDGE, state.project.aspectRatio);
    const c = document.createElement('canvas'); c.width = size.width; c.height = size.height;
    c.getContext('2d', { alpha: false }).drawImage(sourceCanvas, 0, 0, c.width, c.height);
    return canvasToBlob(c, 'image/jpeg', 0.72);
  }

  function updateOnionSkin() {
    const frame = state.project.frames.at(-1);
    if (!frame || !state.project.onionSkinEnabled || !state.stream || state.playing) {
      els.onionOverlay.style.display = 'none'; return;
    }
    els.onionOverlay.src = getFrameUrl(frame, false);
    els.onionOverlay.style.opacity = String(state.project.onionSkinOpacity / 100);
    els.onionOverlay.style.display = 'block';
  }

  async function importFiles(files) {
    const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    pushHistory();
    let imported = 0;
    for (const file of list) {
      try {
        const frame = await imageFileToFrame(file); state.project.frames.push(frame); imported++;
      } catch (err) { console.error('Import failed', file.name, err); toast(`无法导入：${file.name}`, 'error'); }
    }
    if (!imported) { state.history.pop(); updateHistoryButtons(); return; }
    state.selectedFrameId = state.project.frames.at(-1)?.id || null;
    renderTimeline(); updateOnionSkin(); scheduleSave();
    requestAnimationFrame(() => state.selectedFrameId && scrollFrameIntoView(state.selectedFrameId));
    toast(`已导入 ${imported} 张图片。`);
  }

  async function imageFileToFrame(file) {
    const bitmap = await loadBitmap(file);
    const size = fitSize(CAPTURE_LONG_EDGE, state.project.aspectRatio);
    const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#050609'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const crop = sourceCrop(bitmap.width, bitmap.height, ratioValue());
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    const thumbBlob = await makeThumbnail(canvas);
    return { id: uid('frame'), blob, thumbBlob, createdAt: new Date().toISOString() };
  }

  async function loadBitmap(blob) {
    if ('createImageBitmap' in window) return createImageBitmap(blob);
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
      return img;
    } finally { URL.revokeObjectURL(url); }
  }

  async function drawBlobToCanvas(blob, canvas, ratio) {
    const bitmap = await loadBitmap(blob);
    const size = fitSize(CAPTURE_LONG_EDGE, ratio);
    if (canvas.width !== size.width || canvas.height !== size.height) { canvas.width = size.width; canvas.height = size.height; }
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#050609'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const crop = sourceCrop(bitmap.width, bitmap.height, ratioValue(ratio));
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
  }

  function selectedIndex() { return state.project.frames.findIndex(f => f.id === state.selectedFrameId); }

  function duplicateSelected() {
    const index = selectedIndex(); if (index < 0) return;
    pushHistory();
    const source = state.project.frames[index];
    const copy = { id: uid('frame'), blob: source.blob, thumbBlob: source.thumbBlob, createdAt: new Date().toISOString() };
    state.project.frames.splice(index + 1, 0, copy); state.selectedFrameId = copy.id;
    renderTimeline(); updateOnionSkin(); scheduleSave(); requestAnimationFrame(() => scrollFrameIntoView(copy.id));
  }

  async function deleteSelected() {
    const index = selectedIndex(); if (index < 0) return;
    const ok = await confirmDialog('删除这一帧？', `将删除第 ${index + 1} 帧。你可以随后使用“撤销”恢复。`, '删除');
    if (!ok) return;
    pushHistory();
    const [removed] = state.project.frames.splice(index, 1); revokeFrameUrls(removed.id);
    state.selectedFrameId = state.project.frames[Math.min(index, state.project.frames.length - 1)]?.id || null;
    renderTimeline(); updateOnionSkin(); scheduleSave();
  }

  function moveSelected(delta) {
    const index = selectedIndex(), next = index + delta;
    if (index < 0 || next < 0 || next >= state.project.frames.length) return;
    pushHistory();
    const [frame] = state.project.frames.splice(index, 1); state.project.frames.splice(next, 0, frame);
    renderTimeline(); updateOnionSkin(); scheduleSave(); requestAnimationFrame(() => scrollFrameIntoView(frame.id));
  }

  function scrollFrameIntoView(id) {
    els.timeline.querySelector(`[data-frame-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  async function showFrame(index) {
    const frame = state.project.frames[index]; if (!frame) return;
    state.playIndex = index;
    await drawBlobToCanvas(frame.blob, els.playbackCanvas, state.project.aspectRatio);
    els.playbackCanvas.style.display = 'block';
    els.timeline.querySelectorAll('.frame-card').forEach((card, i) => card.classList.toggle('playing', i === index));
    const id = frame.id; requestAnimationFrame(() => scrollFrameIntoView(id));
  }

  async function play() {
    if (!state.project.frames.length) { toast('先拍几帧再播放。'); return; }
    if (state.playing) { stopPlayback(); return; }
    state.playing = true; state.playIndex = 0;
    els.playBtn.textContent = 'Ⅱ'; els.playBtn.setAttribute('aria-label', '暂停'); els.playBtn.title = '暂停';
    els.modeLabel.textContent = '播放模式'; els.modeDot.classList.add('playing'); els.onionOverlay.style.display = 'none';
    await showFrame(0);
    if (state.project.frames.length === 1) return;
    scheduleNextPlaybackFrame();
  }

  function scheduleNextPlaybackFrame() {
    clearTimeout(state.playTimer);
    if (!state.playing || state.project.frames.length <= 1) return;
    state.playTimer = setTimeout(async () => {
      let next = state.playIndex + 1;
      if (next >= state.project.frames.length) {
        if (!state.project.loop) { stopPlayback(); return; }
        next = 0;
      }
      await showFrame(next);
      scheduleNextPlaybackFrame();
    }, 1000 / state.project.fps);
  }

  function stopPlayback() {
    state.playing = false; clearTimeout(state.playTimer); state.playTimer = null;
    els.playBtn.textContent = '▶'; els.playBtn.setAttribute('aria-label', '播放'); els.playBtn.title = '播放';
    els.modeLabel.textContent = '拍摄模式'; els.modeDot.classList.remove('playing'); els.playbackCanvas.style.display = 'none';
    els.timeline.querySelectorAll('.frame-card').forEach(card => card.classList.remove('playing'));
    updateOnionSkin();
  }

  async function stepFrame(delta) {
    if (!state.project.frames.length) { toast('还没有可查看的帧。'); return; }
    if (state.playing) stopPlayback();
    const current = selectedIndex() >= 0 ? selectedIndex() : 0;
    const next = Math.max(0, Math.min(state.project.frames.length - 1, current + delta));
    state.selectedFrameId = state.project.frames[next].id; renderTimeline(); await previewSelectedFrameBriefly(state.selectedFrameId); scrollFrameIntoView(state.selectedFrameId);
  }

  function syncFpsPreset() {
    document.querySelectorAll('[data-fps]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.fps) === state.project.fps));
  }

  function setFps(value) {
    const fps = Math.max(1, Math.min(24, Number(value) || 8)); state.project.fps = fps;
    els.fpsRange.value = fps; els.fpsValue.value = `${fps} FPS`; syncFpsPreset(); renderTimeline();
    if (state.playing) scheduleNextPlaybackFrame(); scheduleSave();
  }

  function setAspectRatio(ratio, save = true) {
    state.project.aspectRatio = ratio;
    els.stage.className = `stage ratio-${ratio.replace(':', '-')}`;
    document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === ratio));
    els.settingsRatio.value = ratio;
    if (save) scheduleSave();
  }

  async function newProject() {
    if (state.project.frames.length) {
      const ok = await confirmDialog('新建项目', '新建项目会结束当前编辑，确认继续吗？当前项目会保存在浏览器中。', '新建');
      if (!ok) return;
    }
    stopPlayback(); revokeAllFrameUrls();
    state.project = createProject(); state.selectedFrameId = null; state.history = []; state.future = [];
    updateProjectUI();
    if (state.persistenceAvailable) { localStorage.setItem(CURRENT_PROJECT_KEY, state.project.id); await saveNow(); }
    toast('已创建新项目。');
  }

  function confirmDialog(title, text, okText = '确认') {
    if (state.confirmResolver) state.confirmResolver(false);
    els.confirmTitle.textContent = title; els.confirmText.textContent = text; els.confirmOkBtn.textContent = okText;
    els.modalBackdrop.classList.remove('hidden'); els.confirmModal.classList.remove('hidden'); els.modalBackdrop.setAttribute('aria-hidden', 'false');
    setTimeout(() => els.confirmCancelBtn.focus(), 0);
    return new Promise(resolve => { state.confirmResolver = resolve; });
  }

  function resolveConfirm(value) {
    if (!state.confirmResolver) return;
    const resolve = state.confirmResolver; state.confirmResolver = null; closeModals(); resolve(value);
  }

  function closeModals() {
    els.modalBackdrop.classList.add('hidden'); els.modalBackdrop.setAttribute('aria-hidden', 'true');
    els.confirmModal.classList.add('hidden'); els.settingsModal.classList.add('hidden'); els.exportModal.classList.add('hidden');
  }

  function openSettings() {
    els.settingsRatio.value = state.project.aspectRatio; els.settingsFps.value = state.project.fps; els.settingsLoop.checked = state.project.loop;
    els.modalBackdrop.classList.remove('hidden'); els.settingsModal.classList.remove('hidden'); els.modalBackdrop.setAttribute('aria-hidden', 'false');
  }

  function chooseRecorderMimeType() {
    if (!window.MediaRecorder) return '';
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return types.find(t => MediaRecorder.isTypeSupported?.(t)) || '';
  }

  async function exportWebM() {
    if (!state.project.frames.length) { toast('先拍摄或导入一些帧再导出。'); return; }
    if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) { toast('当前浏览器不支持 WebM 导出。建议使用桌面版 Chrome、Edge 或 Firefox。', 'error', 5000); return; }
    stopPlayback(); state.exportCancelled = false;
    els.modalBackdrop.classList.remove('hidden'); els.exportModal.classList.remove('hidden'); els.modalBackdrop.setAttribute('aria-hidden', 'false');
    setExportProgress(0, '正在准备画面…');

    const exportCanvas = document.createElement('canvas');
    const size = fitSize(CAPTURE_LONG_EDGE, state.project.aspectRatio); exportCanvas.width = size.width; exportCanvas.height = size.height;
    const stream = exportCanvas.captureStream(state.project.fps);
    const videoTrack = stream.getVideoTracks()[0];
    const mimeType = chooseRecorderMimeType();
    let recorder;
    try { recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : { videoBitsPerSecond: 5_000_000 }); }
    catch (err) { console.error(err); closeModals(); toast('无法初始化视频编码器。', 'error'); return; }
    state.exportRecorder = recorder;
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((resolve, reject) => { recorder.onstop = resolve; recorder.onerror = () => reject(recorder.error || new Error('Recorder error')); });

    try {
      recorder.start();
      const frameMs = 1000 / state.project.fps;
      for (let i = 0; i < state.project.frames.length; i++) {
        if (state.exportCancelled) break;
        await drawBlobToCanvas(state.project.frames[i].blob, exportCanvas, state.project.aspectRatio);
        if (typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame();
        setExportProgress(Math.round(((i + 1) / state.project.frames.length) * 100), `正在生成动画 ${i + 1} / ${state.project.frames.length}`);
        await new Promise(r => setTimeout(r, Math.max(16, frameMs)));
      }
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      stream.getTracks().forEach(t => t.stop());
      if (state.exportCancelled) { closeModals(); toast('已取消导出。'); return; }
      if (!chunks.length) throw new Error('No encoded video data');
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10); a.href = url; a.download = `stop-motion-${date}.webm`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setExportProgress(100, '导出完成');
      setTimeout(() => { closeModals(); toast('WebM 已生成并开始下载。'); }, 300);
    } catch (err) {
      console.error(err); stream.getTracks().forEach(t => t.stop()); closeModals(); toast('导出失败。请尝试减少帧数，或使用 Chrome / Edge。', 'error', 5000);
    } finally { state.exportRecorder = null; }
  }

  function setExportProgress(percent, message) { els.exportProgress.style.width = `${percent}%`; els.exportPercent.textContent = `${percent}%`; els.exportMessage.textContent = message; }

  function isTypingTarget(target) { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable; }

  function bindEvents() {
    els.startCameraBtn.addEventListener('click', () => startCamera()); els.retryCameraBtn.addEventListener('click', () => startCamera());
    els.cameraToggleBtn.addEventListener('click', () => state.stream ? (stopCamera(), els.cameraEmpty.classList.remove('hidden')) : startCamera(els.cameraSelect.value));
    els.cameraSelect.addEventListener('change', () => startCamera(els.cameraSelect.value));
    els.switchCameraBtn.addEventListener('click', async () => { state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment'; els.cameraSelect.value = ''; await startCamera(); });
    els.shutterBtn.addEventListener('click', captureFrame);
    els.emptyImportBtn.addEventListener('click', () => els.fileInput.click()); els.errorImportBtn.addEventListener('click', () => els.fileInput.click()); els.importBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', async () => { await importFiles(els.fileInput.files); els.fileInput.value = ''; });

    els.onionToggle.addEventListener('change', () => { state.project.onionSkinEnabled = els.onionToggle.checked; updateOnionSkin(); scheduleSave(); });
    els.onionOpacity.addEventListener('input', () => { state.project.onionSkinOpacity = Number(els.onionOpacity.value); els.onionOpacityValue.value = `${state.project.onionSkinOpacity}%`; els.onionOverlay.style.opacity = String(state.project.onionSkinOpacity / 100); scheduleSave(); });
    document.querySelectorAll('.ratio-btn').forEach(btn => btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio)));

    els.playBtn.addEventListener('click', play); els.firstFrameBtn.addEventListener('click', async () => { if (!state.project.frames.length) return toast('还没有可查看的帧。'); stopPlayback(); state.selectedFrameId = state.project.frames[0].id; renderTimeline(); await previewSelectedFrameBriefly(state.selectedFrameId); scrollFrameIntoView(state.selectedFrameId); });
    els.prevFrameBtn.addEventListener('click', () => stepFrame(-1)); els.nextFrameBtn.addEventListener('click', () => stepFrame(1));
    els.loopToggle.addEventListener('change', () => { state.project.loop = els.loopToggle.checked; scheduleSave(); });
    els.fpsRange.addEventListener('input', () => setFps(els.fpsRange.value)); document.querySelectorAll('[data-fps]').forEach(btn => btn.addEventListener('click', () => setFps(btn.dataset.fps)));

    els.duplicateBtn.addEventListener('click', duplicateSelected); els.deleteBtn.addEventListener('click', deleteSelected); els.moveLeftBtn.addEventListener('click', () => moveSelected(-1)); els.moveRightBtn.addEventListener('click', () => moveSelected(1));
    els.undoBtn.addEventListener('click', undo); els.redoBtn.addEventListener('click', redo);
    els.newProjectBtn.addEventListener('click', newProject); els.exportBtn.addEventListener('click', exportWebM); els.settingsBtn.addEventListener('click', openSettings);

    els.projectName.addEventListener('input', () => { state.project.name = els.projectName.value.trimStart() || '未命名项目'; scheduleSave(); });
    els.projectName.addEventListener('blur', () => { if (!els.projectName.value.trim()) { state.project.name = '我的定格动画'; els.projectName.value = state.project.name; scheduleSave(); } });

    els.confirmCancelBtn.addEventListener('click', () => resolveConfirm(false)); els.confirmOkBtn.addEventListener('click', () => resolveConfirm(true));
    els.settingsCloseBtn.addEventListener('click', () => { setAspectRatio(els.settingsRatio.value); setFps(els.settingsFps.value); state.project.loop = els.settingsLoop.checked; els.loopToggle.checked = state.project.loop; scheduleSave(); closeModals(); });
    els.exportCancelBtn.addEventListener('click', () => { state.exportCancelled = true; els.exportMessage.textContent = '正在取消…'; els.exportCancelBtn.disabled = true; setTimeout(() => { els.exportCancelBtn.disabled = false; }, 500); });
    els.modalBackdrop.addEventListener('click', e => { if (e.target === els.modalBackdrop && !els.exportModal.classList.contains('hidden')) return; if (e.target === els.modalBackdrop) { if (state.confirmResolver) resolveConfirm(false); else closeModals(); } });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !els.modalBackdrop.classList.contains('hidden') && els.exportModal.classList.contains('hidden')) { if (state.confirmResolver) resolveConfirm(false); else closeModals(); return; }
      if (isTypingTarget(e.target)) return;
      if (e.code === 'Space') { e.preventDefault(); captureFrame(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (state.selectedFrameId) { e.preventDefault(); deleteSelected(); } }
    });

    window.addEventListener('beforeunload', () => { clearTimeout(state.saveTimer); stopCamera(); revokeAllFrameUrls(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  }

  async function init() {
    bindEvents();
    await initPersistence();
    updateProjectUI();
    await enumerateCameras();
    if (!window.isSecureContext && location.protocol !== 'file:') toast('当前页面不是安全上下文，摄像头可能无法使用。请通过 HTTPS 访问。', 'error', 5000);
  }

  init().catch(err => { console.error(err); toast('应用初始化失败，请刷新页面重试。', 'error', 5000); });
})();
