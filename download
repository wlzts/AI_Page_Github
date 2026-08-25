import { Camera } from 'lucide-react';

export function CaptureButton({ disabled, onCapture }: { disabled?: boolean; onCapture: () => void }) {
  return (
    <button
      type="button"
      className="capture-button group"
      onClick={onCapture}
      disabled={disabled}
      aria-label="拍摄一帧"
      title="拍摄一帧（空格）"
    >
      <span className="capture-ring" />
      <span className="capture-core">
        <Camera size={26} strokeWidth={2.2} />
      </span>
      <span className="absolute -bottom-7 whitespace-nowrap text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
        拍摄 · Space
      </span>
    </button>
  );
}
