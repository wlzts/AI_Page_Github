import { memo } from 'react'
import { Copy, GripVertical, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { StudioFrame } from '../types'
import { useObjectUrl } from '../hooks/useObjectUrl'

type Props = {
  frame: StudioFrame
  index: number
  selected: boolean
  active: boolean
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export const FrameThumbnail = memo(function FrameThumbnail({ frame, index, selected, active, onSelect, onDelete, onDuplicate }: Props) {
  const url = useObjectUrl(frame.thumbnail)
  const sortable = useSortable({ id: frame.id })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }

  return (
    <div ref={sortable.setNodeRef} style={style} className={`timeline-frame group relative w-[118px] shrink-0 rounded-xl border p-1.5 transition ${active ? 'border-rose-400 bg-rose-500/10 shadow-[0_0_0_1px_rgba(251,113,133,.2)]' : selected ? 'border-sky-400/70 bg-sky-500/10' : 'border-white/10 bg-white/[.035] hover:border-white/20'}`}>
      <div role="button" tabIndex={0} onClick={(e) => onSelect(e as unknown as React.MouseEvent, frame.id, index)} onKeyDown={(e) => { if (e.key === 'Enter') onSelect(e as unknown as React.MouseEvent, frame.id, index) }} className="block w-full cursor-pointer text-left">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          {url && <img src={url} alt={`第 ${index + 1} 帧`} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
          <button {...sortable.attributes} {...sortable.listeners} onClick={(e) => e.stopPropagation()} className="absolute left-1 top-1 grid h-6 w-6 cursor-grab place-items-center rounded-md bg-black/55 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100 active:cursor-grabbing"><GripVertical size={13} /></button>
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-white/80">{String(index + 1).padStart(3, '0')}</div>
        </div>
        <div className="mt-1.5 truncate px-0.5 text-[10px] text-zinc-500">帧 {index + 1}</div>
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={() => onDuplicate(frame.id)} className="grid h-6 w-6 place-items-center rounded-md bg-black/65 text-zinc-200 backdrop-blur hover:bg-zinc-700" title="复制"><Copy size={12} /></button>
        <button onClick={() => onDelete(frame.id)} className="grid h-6 w-6 place-items-center rounded-md bg-black/65 text-zinc-200 backdrop-blur hover:bg-rose-500" title="删除"><Trash2 size={12} /></button>
      </div>
    </div>
  )
})
