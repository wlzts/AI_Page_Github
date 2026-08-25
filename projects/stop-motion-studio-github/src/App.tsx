import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Download,
  FolderOpen,
  Images,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  Video,
} from 'lucide-react';
import { CameraPreview } from './components/CameraPreview';
import { CaptureButton } from './components/CaptureButton';
import { ExportDialog } from './components/ExportDialog';
import { FrameTimeline } from './components/FrameTimeline';
import { LoadProjectDialog } from './components/LoadProjectDialog';
import { PlaybackControls } from './components/PlaybackControls';
import { SettingsPanel } from './components/SettingsPanel';
import { useCamera } from './hooks/useCamera';
import { blobToThumbnail, fitInside, getBlobDimensions } from './lib/image';
import {
  deleteProjectFromDb,
  getFrames,
  getLastProjectId,
  getProject,
  listProjects,
  putFrame,
  saveProjectMeta,
} from './lib/db';
import type { FrameItem, PreviewMode, ProjectMeta } from './types';

const DEFAULT_FPS = 8;
const DEFAULT_ONION_OPACITY = 0.3;
const HISTORY_LIMIT = 60;

function newProjectName() {
  return `定格动画 ${new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`;
}

function makeProjectMeta(
  id: string,
  name: string,
  fps: number,
  loop: boolean,
  onionEnabled: boolean,
  onionOpacity: number,
  frames: FrameItem[],
  createdAt: number,
): ProjectMeta {
  return {
    id,
    name,
    fps,
    loop,
    onionEnabled,
    onionOpacity,
    frameOrder: frames.map((frame) => frame.id),
    frameCount: frames.length,
    createdAt,
    updatedAt: Date.now(),
  };
}

export default function App() {
  const camera = useCamera();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const bitmapCacheRef = useRef(new Map<string, ImageBitmap>());
  const renderTokenRef = useRef(0);

  const [projectId, setProjectId] = useState(() => crypto.randomUUID());
  const [createdAt, setCreatedAt] = useState(() => Date.now());
  const [projectName, setProjectName] = useState(newProjectName);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [loop, setLoop] = useState(true);
  const [onionEnabled, setOnionEnabled] = useState(false);
  const [onionOpacity, setOnionOpacity] = useState(DEFAULT_ONION_OPACITY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('camera');
  const [playing, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [history, setHistory] = useState<FrameItem[][]>([]);
  const [redoStack, setRedoStack] = useState<FrameItem[][]>([]);
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeFrame = useMemo(
    () => frames.find((frame) => frame.id === activeFrameId) ?? undefined,
    [frames, activeFrameId],
  );
  const onionFrame = frames.at(-1);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 1800);
  }, []);

  const refreshProjectList = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  const resetTransientState = useCallback(() => {
    setSelectedIds(new Set());
    setActiveFrameId(null);
    lastSelectedIndexRef.current = null;
    setPreviewMode('camera');
    setPlaying(false);
    setPlaybackIndex(0);
    setHistory([]);
    setRedoStack([]);
  }, []);

  const loadProjectById = useCallback(async (id: string) => {
    const meta = await getProject(id);
    if (!meta) return false;
    const loadedFrames = await getFrames(meta.frameOrder);
    const byId = new Map(loadedFrames.map((frame) => [frame.id, frame]));
    const ordered = meta.frameOrder.map((frameId) => byId.get(frameId)).filter((frame): frame is FrameItem => Boolean(frame));
    setProjectId(meta.id);
    setCreatedAt(meta.createdAt);
    setProjectName(meta.name);
    setFrames(ordered);
    setFps(meta.fps);
    setLoop(meta.loop);
    setOnionEnabled(meta.onionEnabled);
    setOnionOpacity(meta.onionOpacity);
    resetTransientState();
    return true;
  }, [resetTransientState]);

  useEffect(() => {
    void (async () => {
      try {
        const lastId = await getLastProjectId();
        if (lastId && await loadProjectById(lastId)) {
          setHydrated(true);
          return;
        }
        const now = Date.now();
        const id = crypto.randomUUID();
        setProjectId(id);
        setCreatedAt(now);
        await saveProjectMeta(makeProjectMeta(id, projectName, fps, loop, onionEnabled, onionOpacity, [], now));
      } finally {
        setHydrated(true);
      }
    })();
    // Initial hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void saveProjectMeta(makeProjectMeta(
        projectId,
        projectName,
        fps,
        loop,
        onionEnabled,
        onionOpacity,
        frames,
        createdAt,
      ));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hydrated, projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt]);

  useEffect(() => {
    return () => {
      bitmapCacheRef.current.forEach((bitmap) => bitmap.close());
      bitmapCacheRef.current.clear();
    };
  }, []);

  const persistFrameOrder = useCallback((nextFrames: FrameItem[]) => {
    if (!hydrated) return;
    void saveProjectMeta(makeProjectMeta(
      projectId,
      projectName,
      fps,
      loop,
      onionEnabled,
      onionOpacity,
      nextFrames,
      createdAt,
    ));
  }, [hydrated, projectId, projectName, fps, loop, onionEnabled, onionOpacity, createdAt]);

  const commitFrames = useCallback((next: FrameItem[]) => {
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), frames]);
    setRedoStack([]);
    setFrames(next);
    persistFrameOrder(next);
  }, [frames, persistFrameOrder]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setRedoStack((current) => [...current, frames]);
    setHistory((current) => current.slice(0, -1));
    setFrames(previous);
    persistFrameOrder(previous);
    setSelectedIds(new Set());
    setActiveFrameId(null);
    setPlaying(false);
    setPreviewMode('camera');
  }, [history, frames, persistFrameOrder]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((current) => [...current, frames]);
    setRedoStack((current) => current.slice(0, -1));
    setFrames(next);
    persistFrameOrder(next);
    setSelectedIds(new Set());
    setActiveFrameId(null);
    setPlaying(false);
    setPreviewMode('camera');
  }, [redoStack, frames, persistFrameOrder]);

  const shutterFeedback = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 145);
    navigator.vibrate?.(18);
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.045);
      window.setTimeout(() => void ctx.close(), 120);
    } catch {
      // Sound feedback is optional; flash/vibration still work.
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (capturing) return;
    if (!camera.ready) {
      showToast('摄像头还没准备好');
      return;
    }
    setCapturing(true);
    try {
      const captured = await camera.capture();
      const thumbnail = await blobToThumbnail(captured.blob);
      const frame: FrameItem = {
        id: crypto.randomUUID(),
        projectId,
        blob: captured.blob,
        thumbnail,
        width: captured.width,
        height: captured.height,
        createdAt: Date.now(),
      };
      await putFrame(frame);
      commitFrames([...frames, frame]);
      setSelectedIds(new Set([frame.id]));
      setActiveFrameId(frame.id);
      lastSelectedIndexRef.current = frames.length;
      setPreviewMode('camera');
      setScrollSignal((value) => value + 1);
      shutterFeedback();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '拍摄失败');
    } finally {
      setCapturing(false);
    }
  }, [capturing, camera, projectId, commitFrames, frames, shutterFeedback, showToast]);

  const openImport = useCallback(() => fileInputRef.current?.click(), []);

  const importImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const imported: FrameItem[] = [];
      for (const file of Array.from(files)) {
        const supportedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!supportedType && !supportedExtension) continue;
        const { width, height } = await getBlobDimensions(file);
        const thumbnail = await blobToThumbnail(file);
        imported.push({
          id: crypto.randomUUID(),
          projectId,
          blob: file,
          thumbnail,
          width,
          height,
          createdAt: Date.now(),
        });
      }
      if (!imported.length) {
        showToast('没有可导入的 JPG / PNG / WEBP 图片');
        return;
      }
      await Promise.all(imported.map((frame) => putFrame(frame)));
      commitFrames([...frames, ...imported]);
      const last = imported[imported.length - 1];
      setSelectedIds(new Set([last.id]));
      setActiveFrameId(last.id);
      setPreviewMode('frame');
      setScrollSignal((value) => value + 1);
      showToast(`已导入 ${imported.length} 张图片`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '图片导入失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [projectId, frames, commitFrames, showToast]);

  const handleSelectFrame = useCallback((frameId: string, event: MouseEvent<HTMLButtonElement>) => {
    const index = frames.findIndex((frame) => frame.id === frameId);
    if (index < 0) return;
    const additive = event.ctrlKey || event.metaKey;
    const range = event.shiftKey && lastSelectedIndexRef.current !== null;

    if (range) {
      const start = Math.min(lastSelectedIndexRef.current!, index);
      const end = Math.max(lastSelectedIndexRef.current!, index);
      setSelectedIds(new Set(frames.slice(start, end + 1).map((frame) => frame.id)));
    } else if (additive) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(frameId)) next.delete(frameId);
        else next.add(frameId);
        return next;
      });
    } else {
      setSelectedIds(new Set([frameId]));
    }
    lastSelectedIndexRef.current = index;
    setActiveFrameId(frameId);
    setPlaybackIndex(index);
    setPlaying(false);
    setPreviewMode('frame');
  }, [frames]);

  const idsForAction = useCallback((frameId: string) => {
    if (selectedIds.has(frameId) && selectedIds.size > 1) return selectedIds;
    return new Set([frameId]);
  }, [selectedIds]);

  const deleteFrames = useCallback((frameId: string) => {
    const targets = idsForAction(frameId);
    const next = frames.filter((frame) => !targets.has(frame.id));
    commitFrames(next);
    setSelectedIds(new Set());
    setActiveFrameId(null);
    setPlaying(false);
    setPreviewMode('camera');
  }, [frames, idsForAction, commitFrames]);

  const duplicateFrames = useCallback(async (frameId: string) => {
    const targets = idsForAction(frameId);
    const next: FrameItem[] = [];
    const copies: FrameItem[] = [];
    for (const frame of frames) {
      next.push(frame);
      if (targets.has(frame.id)) {
        const copy: FrameItem = {
          ...frame,
          id: crypto.randomUUID(),
          projectId,
          createdAt: Date.now(),
        };
        next.push(copy);
        copies.push(copy);
      }
    }
    await Promise.all(copies.map((frame) => putFrame(frame)));
    commitFrames(next);
    setSelectedIds(new Set(copies.map((frame) => frame.id)));
    setActiveFrameId(copies.at(-1)?.id ?? null);
    setScrollSignal((value) => value + 1);
  }, [frames, idsForAction, projectId, commitFrames]);

  const reorderFrames = useCallback((activeId: string, overId: string) => {
    const oldIndex = frames.findIndex((frame) => frame.id === activeId);
    const newIndex = frames.findIndex((frame) => frame.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    commitFrames(arrayMove(frames, oldIndex, newIndex));
  }, [frames, commitFrames]);

  const clearFrames = useCallback(() => {
    if (!frames.length) return;
    if (!window.confirm(`确定清空当前项目的 ${frames.length} 帧吗？清空后仍可立即使用 Undo 撤销。`)) return;
    commitFrames([]);
    setSelectedIds(new Set());
    setActiveFrameId(null);
    setPlaying(false);
    setPreviewMode('camera');
  }, [frames, commitFrames]);

  const drawPlaybackFrame = useCallback(async (frame: FrameItem) => {
    const canvas = playbackCanvasRef.current;
    if (!canvas) return;
    const token = ++renderTokenRef.current;
    let bitmap = bitmapCacheRef.current.get(frame.id);
    if (bitmap) {
      bitmapCacheRef.current.delete(frame.id);
      bitmapCacheRef.current.set(frame.id, bitmap);
    } else {
      bitmap = await createImageBitmap(frame.blob);
      bitmapCacheRef.current.set(frame.id, bitmap);
      if (bitmapCacheRef.current.size > 16) {
        const oldest = bitmapCacheRef.current.entries().next().value as [string, ImageBitmap] | undefined;
        if (oldest) {
          bitmapCacheRef.current.delete(oldest[0]);
          oldest[1].close();
        }
      }
    }
    if (token !== renderTokenRef.current) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const fit = fitInside(bitmap.width, bitmap.height, canvas.width, canvas.height);
    ctx.drawImage(bitmap, fit.x, fit.y, fit.width, fit.height);
  }, []);

  useEffect(() => {
    if (previewMode !== 'playback' || !frames.length) return;
    const frame = frames[Math.min(playbackIndex, frames.length - 1)];
    if (frame) void drawPlaybackFrame(frame);
  }, [previewMode, playbackIndex, frames, drawPlaybackFrame]);

  useEffect(() => {
    if (!playing || !frames.length) return;
    const timer = window.setInterval(() => {
      setPlaybackIndex((current) => {
        const next = current + 1;
        if (next < frames.length) return next;
        if (loop) return 0;
        setPlaying(false);
        return current;
      });
    }, 1000 / fps);
    return () => window.clearInterval(timer);
  }, [playing, fps, loop, frames.length]);

  const togglePlay = useCallback(() => {
    if (!frames.length) return;
    setPreviewMode('playback');
    setPlaying((current) => {
      if (!current && playbackIndex >= frames.length - 1 && !loop) setPlaybackIndex(0);
      return !current;
    });
  }, [frames.length, playbackIndex, loop]);

  const stepFrame = useCallback((direction: -1 | 1) => {
    if (!frames.length) return;
    setPlaying(false);
    let next = playbackIndex + direction;
    if (next < 0) next = loop ? frames.length - 1 : 0;
    if (next >= frames.length) next = loop ? 0 : frames.length - 1;
    setPlaybackIndex(next);
    const frame = frames[next];
    setSelectedIds(new Set([frame.id]));
    setActiveFrameId(frame.id);
    setPreviewMode('frame');
  }, [frames, playbackIndex, loop]);

  const saveNow = useCallback(async () => {
    await saveProjectMeta(makeProjectMeta(
      projectId,
      projectName,
      fps,
      loop,
      onionEnabled,
      onionOpacity,
      frames,
      createdAt,
    ));
    showToast('项目已保存到当前浏览器');
  }, [projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt, showToast]);

  const createNewProject = useCallback(async () => {
    if (frames.length && !window.confirm('新建项目会切换离开当前时间轴。当前项目已自动保存在浏览器中，是否继续？')) return;
    await saveProjectMeta(makeProjectMeta(
      projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt,
    ));
    const id = crypto.randomUUID();
    const now = Date.now();
    const name = newProjectName();
    setProjectId(id);
    setCreatedAt(now);
    setProjectName(name);
    setFrames([]);
    setFps(DEFAULT_FPS);
    setLoop(true);
    setOnionEnabled(false);
    setOnionOpacity(DEFAULT_ONION_OPACITY);
    resetTransientState();
    await saveProjectMeta(makeProjectMeta(id, name, DEFAULT_FPS, true, false, DEFAULT_ONION_OPACITY, [], now));
    showToast('已新建项目');
  }, [frames, projectId, projectName, fps, loop, onionEnabled, onionOpacity, createdAt, resetTransientState, showToast]);

  const openProjectDialog = useCallback(async () => {
    await saveProjectMeta(makeProjectMeta(
      projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt,
    ));
    await refreshProjectList();
    setLoadOpen(true);
  }, [projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt, refreshProjectList]);

  const handleLoadProject = useCallback(async (id: string) => {
    await saveProjectMeta(makeProjectMeta(
      projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt,
    ));
    await loadProjectById(id);
    setLoadOpen(false);
    showToast('项目已打开');
  }, [projectId, projectName, fps, loop, onionEnabled, onionOpacity, frames, createdAt, loadProjectById, showToast]);

  const handleDeleteProject = useCallback(async (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project || !window.confirm(`确定删除本地项目“${project.name}”及其帧数据吗？此操作不可撤销。`)) return;
    await deleteProjectFromDb(id);
    if (id === projectId) {
      const nextId = crypto.randomUUID();
      const now = Date.now();
      const name = newProjectName();
      setProjectId(nextId);
      setCreatedAt(now);
      setProjectName(name);
      setFrames([]);
      setFps(DEFAULT_FPS);
      setLoop(true);
      setOnionEnabled(false);
      setOnionOpacity(DEFAULT_ONION_OPACITY);
      resetTransientState();
      await saveProjectMeta(makeProjectMeta(nextId, name, DEFAULT_FPS, true, false, DEFAULT_ONION_OPACITY, [], now));
    }
    await refreshProjectList();
  }, [projects, projectId, resetTransientState, refreshProjectList]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y' && !typing) {
        event.preventDefault();
        redo();
        return;
      }
      if (event.code === 'Space' && !typing && !exportOpen && !loadOpen) {
        event.preventDefault();
        void captureFrame();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !typing && selectedIds.size) {
        event.preventDefault();
        const first = selectedIds.values().next().value as string | undefined;
        if (first) deleteFrames(first);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, captureFrame, exportOpen, loadOpen, selectedIds, deleteFrames]);

  const handleNameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Video size={19} fill="currentColor" /></div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold tracking-tight text-white">定格动画工作室</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Stop Motion Studio</div>
          </div>
        </div>

        <div className="project-name-wrap">
          <Sparkles size={14} className="shrink-0 text-amber-300" />
          <input
            className="project-name-input"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            onKeyDown={handleNameKeyDown}
            aria-label="项目名称"
          />
        </div>

        <div className="toolbar-actions">
          <button className="icon-button" type="button" onClick={undo} disabled={!history.length} title="撤销 Ctrl/Cmd + Z"><Undo2 size={16} /></button>
          <button className="icon-button" type="button" onClick={redo} disabled={!redoStack.length} title="重做 Ctrl/Cmd + Shift + Z"><Redo2 size={16} /></button>
          <span className="toolbar-divider" />
          <button className="toolbar-button" type="button" onClick={createNewProject}>新建</button>
          <button className="toolbar-button" type="button" onClick={saveNow}><Save size={15} /> <span className="hidden xl:inline">保存</span></button>
          <button className="toolbar-button" type="button" onClick={openProjectDialog}><FolderOpen size={15} /> <span className="hidden xl:inline">打开</span></button>
          <button className="toolbar-button" type="button" onClick={openImport}><Images size={15} /> <span className="hidden xl:inline">导入</span></button>
          <button className="export-button" type="button" onClick={() => setExportOpen(true)} disabled={!frames.length}><Download size={15} /> 导出</button>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="studio-column">
          <CameraPreview
            mode={previewMode}
            videoRef={camera.videoRef}
            playbackCanvasRef={playbackCanvasRef}
            selectedFrame={activeFrame}
            onionFrame={onionFrame}
            onionEnabled={onionEnabled}
            onionOpacity={onionOpacity}
            cameraError={camera.error}
            cameraReady={camera.ready}
            flash={flash}
            onRetryCamera={() => void camera.retry()}
            onImport={openImport}
            onReturnCamera={() => { setPlaying(false); setPreviewMode('camera'); }}
          />

          <div className="capture-zone">
            <CaptureButton disabled={!camera.ready || capturing || previewMode === 'playback' && playing} onCapture={() => void captureFrame()} />
          </div>

          <PlaybackControls
            playing={playing}
            loop={loop}
            frameCount={frames.length}
            fps={fps}
            onPlayPause={togglePlay}
            onPrevious={() => stepFrame(-1)}
            onNext={() => stepFrame(1)}
            onToggleLoop={() => setLoop((value) => !value)}
          />
        </section>

        <SettingsPanel
          fps={fps}
          loop={loop}
          onionEnabled={onionEnabled}
          onionOpacity={onionOpacity}
          devices={camera.devices}
          activeDeviceId={camera.activeDeviceId}
          facingMode={camera.facingMode}
          onFpsChange={setFps}
          onLoopChange={setLoop}
          onOnionChange={setOnionEnabled}
          onOpacityChange={setOnionOpacity}
          onDeviceChange={(id) => void camera.selectDevice(id)}
          onSwitchFacing={() => void camera.switchFacing()}
          onRefreshDevices={() => void camera.refreshDevices()}
        />
      </main>

      <FrameTimeline
        frames={frames}
        selectedIds={selectedIds}
        activeFrameId={activeFrameId}
        scrollSignal={scrollSignal}
        onSelect={handleSelectFrame}
        onDelete={deleteFrames}
        onDuplicate={(id) => void duplicateFrames(id)}
        onReorder={reorderFrames}
        onClear={clearFrames}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={(event) => void importImages(event.target.files)}
      />

      <ExportDialog
        open={exportOpen}
        frames={frames}
        defaultFps={fps}
        defaultLoop={loop}
        projectName={projectName}
        onClose={() => setExportOpen(false)}
      />

      <LoadProjectDialog
        open={loadOpen}
        projects={projects}
        currentProjectId={projectId}
        onLoad={(id) => void handleLoadProject(id)}
        onDelete={(id) => void handleDeleteProject(id)}
        onClose={() => setLoadOpen(false)}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
