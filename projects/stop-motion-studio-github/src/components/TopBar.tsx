import { Download, FolderOpen, ImagePlus, Redo2, Save, Sparkles, Undo2, Plus } from 'lucide-react'

type Props = {
  name: string
  canUndo: boolean
  canRedo: boolean
  onNameChange: (name: string) => void
  onUndo: () => void
  onRedo: () => void
  onImport: () => void
  onExport: () => void
  onSave: () => void
  onLoad: () => void
  onNew: () => void
}

const iconButton = 'inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/[.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35'

export function TopBar(props: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 px-3 py-2 backdrop-blur-xl md:px-5">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2">
        <div className="mr-2 flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-950/30"><Sparkles size={18} /></div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold tracking-wide text-white">定格动画工坊</div>
            <div className="text-[10px] uppercase tracking-[.2em] text-zinc-500">Stop Motion Studio</div>
          </div>
        </div>

        <input
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          aria-label="项目名称"
          className="min-w-[150px] flex-1 rounded-xl border border-transparent bg-white/[.04] px-3 py-2 text-sm font-medium text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/10 focus:border-rose-400/50 focus:bg-white/[.06] md:max-w-sm"
        />

        <div className="flex items-center gap-1">
          <button className={iconButton} onClick={props.onUndo} disabled={!props.canUndo} title="撤销 Ctrl/Cmd + Z"><Undo2 size={16} /><span className="hidden lg:inline">撤销</span></button>
          <button className={iconButton} onClick={props.onRedo} disabled={!props.canRedo} title="重做 Ctrl/Cmd + Shift + Z"><Redo2 size={16} /><span className="hidden lg:inline">重做</span></button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button className={iconButton} onClick={props.onNew}><Plus size={16} /><span className="hidden md:inline">新建</span></button>
          <button className={iconButton} onClick={props.onSave}><Save size={16} /><span className="hidden md:inline">保存</span></button>
          <button className={iconButton} onClick={props.onLoad}><FolderOpen size={16} /><span className="hidden md:inline">载入</span></button>
          <button className={iconButton} onClick={props.onImport}><ImagePlus size={16} /><span className="hidden sm:inline">导入图片</span></button>
          <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-500 px-3.5 text-sm font-semibold text-white transition hover:bg-rose-400 active:scale-[.98]" onClick={props.onExport}><Download size={16} />导出</button>
        </div>
      </div>
    </header>
  )
}
