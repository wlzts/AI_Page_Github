import type { RefObject } from 'react';
import { Camera, Images, RotateCcw } from 'lucide-react';
import type { FrameItem, PreviewMode } from '../types';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function CameraPreview({
  mode,
  videoRef,
  playbackCanvasRef,
  selectedFrame,
  onionFrame,
  onionEnabled,
  onionOpacity,
  cameraError,
  cameraReady,
  flash,
  onRetryCamera,
  onImport,
  onReturnCamera,
}: {
  mode: PreviewMode;
  videoRef: RefObject<HTMLVideoElement | null>;
  playbackCanvasRef: RefObject<HTMLCanvasElement | null>;
  selectedFrame?: FrameItem;
  onionFrame?: FrameItem;
  onionEnabled: boolean;
  onionOpacity: number;
  cameraError: string | null;
  cameraReady: boolean;
  flash: boolean;
  onRetryCamera: () => void;
  onImport: () => void;
  onReturnCamera: () => void;
}) {
  const selectedUrl = useObjectUrl(selectedFrame?.blob);
  const onionUrl = useObjectUrl(onionFrame?.blob);

  return (
    <div className="preview-shell">
      <div className="preview-topline">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <span className={`status-dot ${cameraReady ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          {mode === 'camera' ? '实时相机' : mode === 'playback' ? '动画预览' : '帧预览'}
        </div>
        {mode !== 'camera' && (
          <button className="text-button" type="button" onClick={onReturnCamera}>
            <Camera size={14} /> 返回相机
          </button>
        )}
      </div>

      <div className="preview-stage">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`preview-media ${mode === 'camera' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {mode === 'camera' && onionEnabled && onionUrl && (
          <img
            src={onionUrl}
            alt="上一帧洋葱皮叠加"
            className="preview-media pointer-events-none"
            style={{ opacity: onionOpacity }}
          />
        )}

        {mode === 'frame' && selectedUrl && (
          <img src={selectedUrl} alt="当前选中帧" className="preview-media" />
        )}

        <canvas
          ref={playbackCanvasRef}
          className={`preview-media ${mode === 'playback' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {mode === 'camera' && cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-800 text-zinc-200">
                <Camera size={26} />
              </div>
              <h2 className="text-base font-semibold text-white">无法使用摄像头</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{cameraError}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="secondary-button" type="button" onClick={onRetryCamera}>
                  <RotateCcw size={15} /> 重试摄像头
                </button>
                <button className="primary-button" type="button" onClick={onImport}>
                  <Images size={15} /> 导入图片
                </button>
              </div>
            </div>
          </div>
        )}

        {flash && <div className="capture-flash" />}
      </div>
    </div>
  );
}
