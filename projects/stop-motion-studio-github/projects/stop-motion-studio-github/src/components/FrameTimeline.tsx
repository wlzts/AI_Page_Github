import { useEffect, useRef } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Copy, Film, Images, Trash2 } from 'lucide-react'
import type { StudioFrame } from '../types'
import { FrameThumbnail } from './FrameThumbnail'

type Props = {
  frames: StudioFrame[]
  selectedIds: string[]
  activeFrameId: string | null
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDelete: (ids: string[]) => void
  onDuplicate: (ids: string[]) => void
  onReorder: (activeId: string, overId: string) => void
  onClear: () => void
  onImport: () => void
}

export function FrameTimeline(props: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const previousCount = useRef(props.frames.length)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (props.frames.length > previousCount.current) {
      requestAnimationFrame(() => scrollerRef.current?.scrollTo({ left: scrollerRef.current.scrollWidth, behavior: 'smooth' }))
    }
    previousCount.current = props.frames.length
  }, [props.frames.length])

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) props.onReorder(String(event.active.id), String(event.over.id))
  }

  return (
    <section className="border-t border-white/10 bg-zinc-950/90 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:px-5">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2"><Film size={15} className="text-zinc-500" /><span className="text-xs font-semibold uppercase tracking-[.14em] text-zinc-400">时间轴</span><span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-600">{props.frames.length}</span></div>
          <span className="hidden text-[10px] text-zinc-600 sm:inline">Ctrl/Cmd 点击多选 · Shift 连选 · 拖动排序</span>
          {props.selectedIds.length > 0 && <>
            <button onClick={() => props.onDuplicate(props.selectedIds)} className="timeline-action"><Copy size={13} />复制所选</button>
            <button onClick={() => props.onDelete(props.selectedIds)} className="timeline-action hover:!text-rose-300"><Trash2 size={13} />删除所选</button>
          </>}
          {props.frames.length > 0 && <button onClick={props.onClear} className="timeline-action hover:!text-rose-300">清空全部</button>}
        </div>

        {props.frames.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={props.frames.map((frame) => frame.id)} strategy={horizontalListSortingStrategy}>
              <div ref={scrollerRef} className="scrollbar-thin flex gap-2 overflow-x-auto pb-2">
                {props.frames.map((frame, index) => (
                  <FrameThumbnail
                    key={frame.id}
                    frame={frame}
                    index={index}
                    selected={props.selectedIds.includes(frame.id)}
                    active={props.activeFrameId === frame.id}
                    onSelect={props.onSelect}
                    onDelete={(id) => props.onDelete([id])}
                    onDuplicate={(id) => props.onDuplicate([id])}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <button onClick={props.onImport} className="flex min-h-[104px] w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-5 text-left transition hover:border-white/20 hover:bg-white/[.04]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-zinc-500"><Images size={18} /></div>
            <div><div className="text-sm font-medium text-zinc-300">拍摄第一帧，开始制作你的动画</div><div className="mt-1 text-xs text-zinc-600">Capture your first frame to start your animation · 或点击这里导入图片</div></div>
          </button>
        )}
      </div>
    </section>
  )
}
