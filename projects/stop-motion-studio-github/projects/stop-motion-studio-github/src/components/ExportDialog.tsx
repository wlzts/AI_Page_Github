import { useEffect, useState } from 'react'
import { Download, Film, Image as ImageIcon, X } from 'lucide-react'
import type { ExportFormat, ExportResolution, StudioFrame } from '../types'
import { FPS_OPTIONS } from '../types'
import { canExportWebM, renderGif, renderWebM } from '../lib/exporters'
import { useableFilename } from '../lib/image'

type Props = { open: boolean; frames: StudioFrame[]; fps: number; loop: boolean; projectName: string; onClose: () => void }

export function ExportDialog({ open, frames, fps, loop, projectName, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('gif')
  const [exportFps, setExportFps] = useState(fps)
  const [resolution, setResolution] = useState<ExportResolution>('720')
  const [exportLoop, setExportLoop] = useState(loop)
  const [filename, setFilename] = useState(projectName)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const webmSupported = canExportWebM()

  useEffect(() => { if (open) { setExportFps(fps); setExportLoop(loop); setFilename(projectName); setProgress(null); setError('') } }, [fps, loop, open, projectName])
  if (!open) return null

  const exportNow = async () => {
    if (!frames.length || (progress !== null && progress < 100)) return
    setError('')
    setProgress(0)
    try {
      const options = { fps: exportFps, resolution, loop: exportLoop, onProgress: setProgress }
      const blob = format === 'gif' ? await renderGif(frames, options) : await renderWebM(frames, options)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${useableFilename(filename)}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && progress === null && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold text-white">导出动画</h2><p className="mt-1 text-xs text-zinc-500">所有渲染均在当前浏览器本地完成</p></div><button onClick={onClose} disabled={progress !== null && progress < 100} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-30"><X size={17} /></button></div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setFormat('gif')} className={`export-format ${format === 'gif' ? 'export-format-active' : ''}`}><ImageIcon size={18} /><span><b>Animated GIF</b><small>兼容性最好，可内置循环</small></span></button>
          <button disabled={!webmSupported} onClick={() => setFormat('webm')} className={`export-format ${format === 'webm' ? 'export-format-active' : ''}`}><Film size={18} /><span><b>WebM Video</b><small>{webmSupported ? '视频质量更高' : '当前浏览器不支持'}</small></span></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field-label">导出 FPS<select value={exportFps} onChange={(e) => setExportFps(Number(e.target.value))} className="field-control">{FPS_OPTIONS.map((value) => <option value={value} key={value}>{value} FPS</option>)}</select></label>
          <label className="field-label">分辨率<select value={resolution} onChange={(e) => setResolution(e.target.value as ExportResolution)} className="field-control"><option value="480">长边 480px</option><option value="720">长边 720px</option><option value="1080">长边 1080px</option><option value="original">原始尺寸</option></select></label>
          <label className="field-label sm:col-span-2">文件名<input value={filename} onChange={(e) => setFilename(e.target.value)} className="field-control" /></label>
          <label className={`flex items-center gap-2 text-xs text-zinc-400 ${format === 'webm' ? 'opacity-45' : ''}`}><input disabled={format === 'webm'} type="checkbox" checked={exportLoop} onChange={(e) => setExportLoop(e.target.checked)} className="accent-rose-500" />GIF 无限循环</label>
        </div>

        {format === 'webm' && <p className="mt-3 text-[11px] leading-5 text-zinc-600">WebM 文件本身不写入“循环”属性，是否循环由播放该视频的播放器决定。</p>}
        {(resolution === '1080' || resolution === 'original') && frames.length > 100 && <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/5 p-3 text-[11px] leading-5 text-amber-200/70">高分辨率 + 大量帧会显著增加浏览器内存与渲染时间。GIF 建议优先使用 480p / 720p。</p>}

        {progress !== null && <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-zinc-400"><span>{progress >= 100 ? '渲染完成' : '正在渲染…'}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-rose-500 transition-[width]" style={{ width: `${progress}%` }} /></div></div>}
        {error && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}

        <button onClick={exportNow} disabled={!frames.length || (progress !== null && progress < 100)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"><Download size={16} />{progress === null || progress >= 100 ? `导出 ${format.toUpperCase()}` : `Rendering ${progress}%`}</button>
      </div>
    </div>
  )
}
