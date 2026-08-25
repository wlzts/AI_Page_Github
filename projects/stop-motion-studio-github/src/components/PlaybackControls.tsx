import { Pause, Play, Repeat2, SkipBack, SkipForward, Video } from 'lucide-react'

type Props = {
  playing: boolean
  loop: boolean
  frameCount: number
  fps: number
  currentIndex: number
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  onLoopChange: (loop: boolean) => void
  onCameraMode: () => void
}

export function PlaybackControls(props: Props) {
  const duration = props.frameCount ? props.frameCount / props.fps : 0
  const button = 'grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-300 transition hover:bg-white/[.09] hover:text-white disabled:opacity-30'
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/75 px-3 py-3 shadow-panel">
      <button className={button} onClick={props.onPrevious} disabled={!props.frameCount} title="上一帧"><SkipBack size={17} /></button>
      <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-zinc-950 transition hover:scale-105 active:scale-95 disabled:opacity-30" onClick={props.onPlayPause} disabled={!props.frameCount} title={props.playing ? '暂停' : '播放'}>
        {props.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="translate-x-[1px]" />}
      </button>
      <button className={button} onClick={props.onNext} disabled={!props.frameCount} title="下一帧"><SkipForward size={17} /></button>
      <button className={`${button} ${props.loop ? 'border-rose-400/30 bg-rose-500/10 text-rose-300' : ''}`} onClick={() => props.onLoopChange(!props.loop)} title="循环播放"><Repeat2 size={16} /></button>
      <button className={button} onClick={props.onCameraMode} title="回到摄像头"><Video size={17} /></button>
      <div className="mx-1 h-6 w-px bg-white/10" />
      <div className="text-xs tabular-nums text-zinc-400"><span className="font-medium text-zinc-200">{props.frameCount}</span> 帧 · <span className="font-medium text-zinc-200">{props.fps}</span> FPS · <span className="font-medium text-zinc-200">{duration.toFixed(1)}</span> 秒</div>
      {props.frameCount > 0 && <div className="ml-auto hidden text-[11px] tabular-nums text-zinc-600 md:block">{Math.min(props.currentIndex + 1, props.frameCount)} / {props.frameCount}</div>}
    </div>
  )
}
