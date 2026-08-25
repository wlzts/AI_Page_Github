import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Film, Trash2 } from 'lucide-react';
import type { FrameItem } from '../types';
import { FrameThumbnail } from './FrameThumbnail';

export function FrameTimeline({
  frames,
  selectedIds,
  activeFrameId,
  scrollSignal,
  onSelect,
  onDelete,
  onDuplicate,
  onReorder,
  onClear,
}: {
  frames: FrameItem[];
  selectedIds: Set<string>;
  activeFrameId: string | null;
  scrollSignal: number;
  onSelect: (frameId: string, event: MouseEvent<HTMLButtonElement>) => void;
  onDelete: (frameId: string) => void;
  onDuplicate: (frameId: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onClear: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!scrollSignal || !scrollerRef.current) return;
    scrollerRef.current.scrollTo({ left: scrollerRef.current.scrollWidth, behavior: 'smooth' });
  }, [scrollSignal]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <section className="timeline-panel">
      <div className="timeline-header">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Film size={16} /> 帧时间轴
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">点击查看 · Ctrl/Cmd 多选 · Shift 连选 · 拖动排序</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-400">{frames.length} 帧</span>
          <button className="text-button danger-text" type="button" onClick={onClear} disabled={!frames.length}>
            <Trash2 size={14} /> 清空全部
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="timeline-scroller">
        {!frames.length ? (
          <div className="timeline-empty">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-zinc-500">
              <Film size={19} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">拍摄第一帧，开始你的定格动画。</p>
              <p className="mt-1 text-xs text-zinc-600">Capture your first frame to start your animation.</p>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={frames.map((frame) => frame.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex min-w-max gap-2.5 py-1">
                {frames.map((frame, index) => (
                  <FrameThumbnail
                    key={frame.id}
                    frame={frame}
                    index={index}
                    selected={selectedIds.has(frame.id)}
                    active={activeFrameId === frame.id}
                    onSelect={(event) => onSelect(frame.id, event)}
                    onDelete={() => onDelete(frame.id)}
                    onDuplicate={() => onDuplicate(frame.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
