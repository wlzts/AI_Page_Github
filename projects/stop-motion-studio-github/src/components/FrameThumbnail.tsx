import type { MouseEvent } from 'react';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { FrameItem } from '../types';

export function FrameThumbnail({
  frame,
  index,
  selected,
  active,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  frame: FrameItem;
  index: number;
  selected: boolean;
  active: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const url = useObjectUrl(frame.thumbnail);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`frame-card ${selected ? 'frame-selected' : ''} ${active ? 'frame-active' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="frame-image-button"
        onClick={onSelect}
        aria-label={`选择第 ${index + 1} 帧`}
      >
        {url && <img src={url} alt={`第 ${index + 1} 帧`} className="h-full w-full object-cover" loading="lazy" />}
        <span className="frame-number">{String(index + 1).padStart(3, '0')}</span>
      </button>
      <div className="frame-actions">
        <button type="button" className="icon-button-small" onClick={onDuplicate} title="复制帧" aria-label="复制帧">
          <Copy size={13} />
        </button>
        <button
          type="button"
          className="icon-button-small cursor-grab active:cursor-grabbing"
          title="拖动排序"
          aria-label="拖动排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={13} />
        </button>
        <button type="button" className="icon-button-small hover:text-rose-300" onClick={onDelete} title="删除帧" aria-label="删除帧">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
