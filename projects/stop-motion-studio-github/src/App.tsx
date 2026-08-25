import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { TopBar } from './components/TopBar'
import { CameraPreview } from './components/CameraPreview'
import { CaptureButton } from './components/CaptureButton'
import { SettingsPanel } from './components/SettingsPanel'
import { PlaybackControls } from './components/PlaybackControls'
import { FrameTimeline } from './components/FrameTimeline'
import { AnimationPreview } from './components/AnimationPreview'
import { ExportDialog } from './components/ExportDialog'
import { ProjectDialog } from './components/ProjectDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { useCamera } from './hooks/useCamera'
import { useStudioProject } from './hooks/useStudioProject'
import { captureVideoFrame, fileToFrame } from './lib/image'
import type { ViewMode } from './types'

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const camera = useCamera(videoRef)
  const studio = useStudioProject()
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('camera')
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'clear' | 'new' | null>(null)
  const [toast, setToast] = useState('')
  const selectionAnchorRef = useRef<number | null>(null)

  const frames = studio.project.frames
  const activeIndex = useMemo(() => {
    const index = frames.findIndex((frame) => frame.id === studio.activeFrameId)
    return index >= 0 ? index : Math.max(0, frames.length - 1)
  }, [frames, studio.activeFrameId])
  const activeFrame = frames[activeIndex]
  const onionFrame = frames.at(-1)
  const previewFrame = viewMode === 'playback' ? frames[playhead] : activeFrame

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 1800)
  }, [])

  const capture = useCallback(async () => {
    if (capturing || camera.status !== 'ready' || !videoRef.current) return
    setCapturing(true)
    try {
      const frame = await captureVideoFrame(videoRef.current)
      studio.addFrames([frame])
      setPlaying(false)
      setViewMode('camera')
      navigator.vibrate?.(18)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 120)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '拍摄失败')
    } finally {
      setCapturing(false)
    }
  }, [camera.status, capturing, showToast, studio])

  const importImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const supported = Array.from(files).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    if (!supported.length) { showToast('请选择 JPG、PNG 或 WEBP 图片'); return }
    try {
      const imported = []
      for (const file of supported) imported.push(await fileToFrame(file))
      studio.addFrames(imported)
      setPlaying(false)
      setViewMode('frame')
      showToast(`已导入 ${imported.length} 张图片`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '图片导入失败')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [showToast, studio])

  const play = useCallback(() => {
    if (!frames.length) return
    if (viewMode !== 'playback') setPlayhead(activeIndex)
    setViewMode('playback')
    setPlaying((value) => !value)
  }, [activeIndex, frames.length, viewMode])

  useEffect(() => {
    if (!playing || !frames.length) return
    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + 1
        if (next < frames.length) return next
        if (studio.project.loop) return 0
        setPlaying(false)
        return frames.length - 1
      })
    }, 1000 / studio.project.fps)
    return () => window.clearInterval(timer)
  }, [frames.length, playing, studio.project.fps, studio.project.loop])

  useEffect(() => {
    if (playhead >= frames.length) setPlayhead(Math.max(0, frames.length - 1))
  }, [frames.length, playhead])

  const previousFrame = useCallback(() => {
    if (!frames.length) return
    setPlaying(false)
    const start = viewMode === 'playback' ? playhead : activeIndex
    setPlayhead(Math.max(0, start - 1))
    setViewMode('playback')
  }, [activeIndex, frames.length, playhead, viewMode])

  const nextFrame = useCallback(() => {
    if (!frames.length) return
    setPlaying(false)
    const start = viewMode === 'playback' ? playhead : activeIndex
    setPlayhead(Math.min(frames.length - 1, start + 1))
    setViewMode('playback')
  }, [activeIndex, frames.length, playhead, viewMode])

  const selectFrame = useCallback((event: React.MouseEvent, id: string, index: number) => {
    const toggle = event.metaKey || event.ctrlKey
    if (event.shiftKey && selectionAnchorRef.current !== null) {
      const start = Math.min(selectionAnchorRef.current, index)
      const end = Math.max(selectionAnchorRef.current, index)
      studio.setSelectedIds(frames.slice(start, end + 1).map((frame) => frame.id))
    } else if (toggle) {
      studio.setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
      selectionAnchorRef.current = index
    } else {
      studio.setSelectedIds([id])
      selectionAnchorRef.current = index
    }
    studio.setActiveFrameId(id)
    setViewMode('frame')
    setPlaying(false)
  }, [frames, studio])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.matches('input,textarea,select,[contenteditable="true"]')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        if (typing) return
        event.preventDefault()
        if (event.shiftKey) studio.redo(); else studio.undo()
        return
      }
      if (event.code === 'Space' && !typing) {
        event.preventDefault()
        void capture()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [capture, studio, viewMode])

  const confirm = async () => {
    if (confirmAction === 'clear') {
      studio.clearFrames()
      setPlaying(false)
      setViewMode('camera')
      showToast('已清空全部帧，可使用撤销恢复')
    } else if (confirmAction === 'new') {
      await studio.newProject()
      setPlaying(false)
      setViewMode('camera')
      showToast('已创建新项目')
    }
    setConfirmAction(null)
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <TopBar
        name={studio.project.name}
        canUndo={studio.canUndo}
        canRedo={studio.canRedo}
        onNameChange={(name) => studio.updateSettings({ name })}
        onUndo={studio.undo}
        onRedo={studio.redo}
        onImport={() => fileInputRef.current?.click()}
        onExport={() => frames.length ? setExportOpen(true) : showToast('先拍摄或导入至少一帧')}
        onSave={() => void studio.saveNow().then(() => showToast('项目已保存到浏览器'))}
        onLoad={() => setProjectOpen(true)}
        onNew={() => frames.length ? setConfirmAction('new') : void studio.newProject().then(() => showToast('已创建新项目'))}
      />

      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => void importImages(e.target.files)} />

      <main className="mx-auto max-w-[1800px] p-3 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            {viewMode === 'camera' ? (
              <CameraPreview
                videoRef={videoRef}
                status={camera.status}
                error={camera.error}
                flash={flash}
                onionEnabled={studio.project.onionSkin}
                onionOpacity={studio.project.onionOpacity}
                onionBlob={onionFrame?.blob}
                onRetry={() => void camera.start()}
                onImport={() => fileInputRef.current?.click()}
              />
            ) : (
              <AnimationPreview frame={previewFrame} label={viewMode === 'playback' ? (playing ? 'PLAYING' : 'ANIMATION PREVIEW') : `FRAME ${activeIndex + 1}`} />
            )}

            <div className="relative">
              <CaptureButton onCapture={() => void capture()} disabled={camera.status !== 'ready' || capturing} frameCount={frames.length} />
              {viewMode !== 'camera' && <button onClick={() => { setViewMode('camera'); setPlaying(false) }} className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-zinc-400 hover:bg-white/[.08] hover:text-white sm:flex"><Camera size={14} />返回实时摄像头</button>}
            </div>

            <PlaybackControls
              playing={playing}
              loop={studio.project.loop}
              frameCount={frames.length}
              fps={studio.project.fps}
              currentIndex={viewMode === 'playback' ? playhead : activeIndex}
              onPlayPause={play}
              onPrevious={previousFrame}
              onNext={nextFrame}
              onLoopChange={(loop) => studio.updateSettings({ loop })}
              onCameraMode={() => { setPlaying(false); setViewMode('camera') }}
            />
          </div>

          <SettingsPanel
            className="hidden md:block"
            fps={studio.project.fps}
            onionSkin={studio.project.onionSkin}
            onionOpacity={studio.project.onionOpacity}
            loop={studio.project.loop}
            devices={camera.devices}
            selectedDeviceId={camera.selectedDeviceId}
            onFpsChange={(fps) => studio.updateSettings({ fps })}
            onOnionChange={(onionSkin) => studio.updateSettings({ onionSkin })}
            onOpacityChange={(onionOpacity) => studio.updateSettings({ onionOpacity })}
            onLoopChange={(loop) => studio.updateSettings({ loop })}
            onCameraChange={(id) => void camera.start(id)}
            onFlipCamera={() => void camera.switchFacing()}
          />
        </div>
      </main>

      <FrameTimeline
        frames={frames}
        selectedIds={studio.selectedIds}
        activeFrameId={studio.activeFrameId}
        onSelect={selectFrame}
        onDelete={studio.deleteFrames}
        onDuplicate={studio.duplicateFrames}
        onReorder={studio.reorderFrame}
        onClear={() => setConfirmAction('clear')}
        onImport={() => fileInputRef.current?.click()}
      />

      <div className="p-3 md:hidden">
        <SettingsPanel
          fps={studio.project.fps}
          onionSkin={studio.project.onionSkin}
          onionOpacity={studio.project.onionOpacity}
          loop={studio.project.loop}
          devices={camera.devices}
          selectedDeviceId={camera.selectedDeviceId}
          onFpsChange={(fps) => studio.updateSettings({ fps })}
          onOnionChange={(onionSkin) => studio.updateSettings({ onionSkin })}
          onOpacityChange={(onionOpacity) => studio.updateSettings({ onionOpacity })}
          onLoopChange={(loop) => studio.updateSettings({ loop })}
          onCameraChange={(id) => void camera.start(id)}
          onFlipCamera={() => void camera.switchFacing()}
        />
      </div>

      <ExportDialog open={exportOpen} frames={frames} fps={studio.project.fps} loop={studio.project.loop} projectName={studio.project.name} onClose={() => setExportOpen(false)} />
      <ProjectDialog open={projectOpen} currentId={studio.project.id} onClose={() => setProjectOpen(false)} onLoad={(id) => void studio.switchProject(id).then(() => { setProjectOpen(false); setViewMode('camera'); setPlaying(false); showToast('项目已载入') }).catch((err) => showToast(err instanceof Error ? err.message : '载入失败'))} />
      <ConfirmDialog open={confirmAction !== null} title={confirmAction === 'clear' ? '清空全部帧？' : '创建新项目？'} message={confirmAction === 'clear' ? '时间轴中的所有帧会被移除。完成后仍可立即使用撤销恢复。' : '当前项目会先自动保存到浏览器，然后创建一个新的空项目。'} confirmText={confirmAction === 'clear' ? '清空全部' : '新建项目'} onConfirm={() => void confirm()} onCancel={() => setConfirmAction(null)} />

      {toast && <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-800/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur">{toast}</div>}
    </div>
  )
}
