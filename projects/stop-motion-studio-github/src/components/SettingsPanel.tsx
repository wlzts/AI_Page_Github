import { Camera, FlipHorizontal2, Layers3, Repeat2, SlidersHorizontal } from 'lucide-react'
import { FPS_OPTIONS } from '../types'

type Props = {
  className?: string
  fps: number
  onionSkin: boolean
  onionOpacity: number
  loop: boolean
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  onFpsChange: (fps: number) => void
  onOnionChange: (enabled: boolean) => void
  onOpacityChange: (opacity: number) => void
  onLoopChange: (loop: boolean) => void
  onCameraChange: (id: string) => void
  onFlipCamera: () => void
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-rose-500' : 'bg-zinc-700'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

export function SettingsPanel(props: Props) {
  return (
    <aside className={`rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-panel backdrop-blur md:w-[280px] md:shrink-0 ${props.className ?? ''}`}>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-white"><SlidersHorizontal size={16} />动画设置</div>

      <div className="space-y-5">
        <section>
          <label className="mb-2 block text-xs font-medium text-zinc-400">FPS 帧率</label>
          <select value={props.fps} onChange={(e) => props.onFpsChange(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-400/50">
            {FPS_OPTIONS.map((fps) => <option key={fps} value={fps}>{fps} FPS</option>)}
          </select>
        </section>

        <section className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-zinc-300"><Layers3 size={15} />洋葱皮</span>
            <Switch checked={props.onionSkin} onChange={props.onOnionChange} />
          </div>
          <div className={props.onionSkin ? '' : 'opacity-40'}>
            <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500"><span>上一帧透明度</span><span>{Math.round(props.onionOpacity * 100)}%</span></div>
            <input disabled={!props.onionSkin} type="range" min="0.05" max="0.8" step="0.05" value={props.onionOpacity} onChange={(e) => props.onOpacityChange(Number(e.target.value))} className="accent-rose-500 w-full" />
          </div>
        </section>

        <section className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-zinc-300"><Repeat2 size={15} />循环播放</span>
            <Switch checked={props.loop} onChange={props.onLoopChange} />
          </div>
        </section>

        <section className="space-y-2 border-t border-white/10 pt-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300"><Camera size={15} />摄像头</label>
          <select value={props.selectedDeviceId} onChange={(e) => props.onCameraChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-rose-400/50">
            {!props.devices.length && <option value="">默认摄像头</option>}
            {props.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `摄像头 ${index + 1}`}</option>)}
          </select>
          <button onClick={props.onFlipCamera} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] py-2.5 text-xs text-zinc-300 transition hover:bg-white/[.08] hover:text-white"><FlipHorizontal2 size={14} />切换前 / 后摄像头</button>
        </section>
      </div>
    </aside>
  )
}
