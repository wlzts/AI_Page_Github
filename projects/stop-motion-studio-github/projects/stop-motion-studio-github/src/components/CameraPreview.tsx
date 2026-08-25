import { Camera, CameraOff, Images, RefreshCw } from 'lucide-react'
import type { RefObject } from 'react'
import { OnionSkinOverlay } from './OnionSkinOverlay'

type Props = {
  videoRef: RefObject<HTMLVideoElement>
  status: 'idle' | 'requesting' | 'ready' | 'denied' | 'error'
  error: string
  flash: boolean
  onionEnabled: boolean
  onionOpacity: number
  onionBlob?: Blob
  onRetry: () => void
  onImport: () => void
}

export function CameraPreview({ videoRef, status, error, flash, onionEnabled, onionOpacity, onionBlob, onRetry, onImport }: Props) {
  return (
    <div className="relative isolate flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-panel md:min-h-[460px]">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      {onionEnabled && onionBlob && <OnionSkinOverlay blob={onionBlob} opacity={onionOpacity} />}

      {status === 'requesting' && (
        <div className="relative z-10 flex flex-col items-center gap-3 text-zinc-400"><RefreshCw className="animate-spin" /><span className="text-sm">正在连接摄像头…</span></div>
      )}

      {(status === 'denied' || status === 'error') && (
        <div className="relative z-10 mx-5 max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl backdrop-blur">
          <CameraOff className="mx-auto mb-3 text-zinc-500" size={30} />
          <h2 className="font-semibold text-white">摄像头暂不可用</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{error || '需要摄像头权限才能拍摄定格动画帧。'}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={onRetry} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"><Camera size={15} className="mr-1.5 inline" />重试摄像头</button>
            <button onClick={onImport} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"><Images size={15} className="mr-1.5 inline" />导入图片</button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 backdrop-blur-md">LIVE CAMERA</div>
      {onionEnabled && onionBlob && <div className="absolute right-3 top-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200">ONION {Math.round(onionOpacity * 100)}%</div>}
      <div className={`pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-150 ${flash ? 'opacity-70' : 'opacity-0'}`} />
    </div>
  )
}
