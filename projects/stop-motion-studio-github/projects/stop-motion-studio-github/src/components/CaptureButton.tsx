import { Camera } from 'lucide-react'

export function CaptureButton({ onCapture, disabled, frameCount }: { onCapture: () => void; disabled: boolean; frameCount: number }) {
  return (
    <div className="flex items-center justify-center gap-5 py-3 md:py-4">
      <div className="hidden min-w-24 text-right text-xs text-zinc-500 sm:block"><span className="font-semibold text-zinc-300">Space</span><br />拍摄一帧</div>
      <button
        onClick={onCapture}
        disabled={disabled}
        aria-label="拍摄一帧"
        className="group relative grid h-[76px] w-[76px] place-items-center rounded-full border-[5px] border-zinc-200 bg-rose-500 shadow-[0_0_0_6px_rgba(255,255,255,.05),0_16px_35px_rgba(0,0,0,.4)] transition hover:scale-105 hover:bg-rose-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <span className="absolute inset-1 rounded-full border border-white/35" />
        <Camera size={25} className="relative text-white transition group-active:scale-90" />
      </button>
      <div className="min-w-24 text-xs text-zinc-500"><span className="font-semibold text-zinc-300">{frameCount}</span> 帧<br />已拍摄</div>
    </div>
  )
}
