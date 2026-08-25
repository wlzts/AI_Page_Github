import { useEffect, useRef } from 'react'
import type { StudioFrame } from '../types'
import { drawContained } from '../lib/image'

export function AnimationPreview({ frame, label }: { frame?: StudioFrame; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const canvas = canvasRef.current
      if (!canvas || !frame) return
      const bitmap = await createImageBitmap(frame.blob)
      if (cancelled) { bitmap.close(); return }
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d', { alpha: false })!
      drawContained(ctx, bitmap, bitmap.width, bitmap.height, canvas.width, canvas.height)
      bitmap.close()
    })()
    return () => { cancelled = true }
  }, [frame])

  return (
    <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-panel md:min-h-[460px]">
      {frame ? <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" /> : <p className="text-sm text-zinc-500">还没有可预览的帧</p>}
      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 backdrop-blur-md">{label}</div>
    </div>
  )
}
