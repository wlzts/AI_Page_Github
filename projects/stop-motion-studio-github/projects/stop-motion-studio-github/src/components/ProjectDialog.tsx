import { useEffect, useState } from 'react'
import { FolderOpen, X } from 'lucide-react'
import { listProjects } from '../lib/db'
import type { StudioProject } from '../types'

export function ProjectDialog({ open, currentId, onClose, onLoad }: { open: boolean; currentId: string; onClose: () => void; onLoad: (id: string) => void }) {
  const [projects, setProjects] = useState<StudioProject[]>([])
  useEffect(() => { if (open) void listProjects().then(setProjects) }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">载入本地项目</h2><p className="mt-1 text-xs text-zinc-500">项目和帧保存在这个浏览器的 IndexedDB 中</p></div><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"><X size={17} /></button></div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto">
          {projects.map((project) => <button key={project.id} onClick={() => onLoad(project.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-white/[.06] ${project.id === currentId ? 'border-rose-400/30 bg-rose-500/10' : 'border-white/10 bg-white/[.025]'}`}><div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-zinc-500"><FolderOpen size={16} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-zinc-200">{project.name}</div><div className="mt-1 text-[10px] text-zinc-600">{project.frames.length} 帧 · {project.fps} FPS · {new Date(project.updatedAt).toLocaleString('zh-CN')}</div></div>{project.id === currentId && <span className="text-[10px] text-rose-300">当前</span>}</button>)}
          {!projects.length && <div className="py-10 text-center text-sm text-zinc-600">还没有保存的项目</div>}
        </div>
      </div>
    </div>
  )
}
