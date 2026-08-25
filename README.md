import { useEffect, useMemo, useState } from 'react';
import { Download, Film, Image as ImageIcon, LoaderCircle, X } from 'lucide-react';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import type { ExportFormat, ExportResolution, FrameItem } from '../types';
import { drawBlobToCanvas, safeFilename } from '../lib/image';

const FPS_OPTIONS = [1, 2, 4, 6, 8, 10, 12, 15, 24];

function even(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function getTargetSize(frame: FrameItem, resolution: ExportResolution) {
  if (resolution === 'source') return { width: even(frame.width), height: even(frame.height) };
  const maxHeight = resolution === '720p' ? 720 : 480;
  if (frame.height <= maxHeight) return { width: even(frame.width), height: even(frame.height) };
  const scale = maxHeight / frame.height;
  return { width: even(frame.width * scale), height: even(frame.height * scale) };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function ExportDialog({
  open,
  frames,
  defaultFps,
  defaultLoop,
  projectName,
  onClose,
}: {
  open: boolean;
  frames: FrameItem[];
  defaultFps: number;
  defaultLoop: boolean;
  projectName: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>('gif');
  const [fps, setFps] = useState(defaultFps);
  const [resolution, setResolution] = useState<ExportResolution>('720p');
  const [loop, setLoop] = useState(defaultLoop);
  const [filename, setFilename] = useState(projectName || 'stop-motion');
  const [progress, setProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFps(defaultFps);
    setLoop(defaultLoop);
    setFilename(projectName || 'stop-motion');
    setProgress(0);
    setError(null);
  }, [open, defaultFps, defaultLoop, projectName]);

  const size = useMemo(() => (frames[0] ? getTargetSize(frames[0], resolution) : null), [frames, resolution]);

  if (!open) return null;

  const exportGif = async () => {
    if (!frames.length || !size) return;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) throw new Error('无法创建 GIF 导出画布');

    const gif = GIFEncoder();
    const delay = Math.max(20, Math.round(1000 / fps));

    for (let i = 0; i < frames.length; i += 1) {
      await drawBlobToCanvas(frames[i].blob, canvas, size.width, size.height);
      const rgba = ctx.getImageData(0, 0, size.width, size.height).data;
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      gif.writeFrame(index, size.width, size.height, {
        palette,
        delay,
        ...(i === 0 ? { repeat: loop ? 0 : -1 } : {}),
      });
      setProgress(Math.round(((i + 1) / frames.length) * 96));
      await sleep(0);
    }

    gif.finish();
    const bytes = gif.bytes();
    setProgress(100);
    downloadBlob(new Blob([bytes], { type: 'image/gif' }), `${safeFilename(filename)}.gif`);
  };

  const exportWebm = async () => {
    if (!frames.length || !size) return;
    if (typeof MediaRecorder === 'undefined') throw new Error('当前浏览器不支持 WebM 录制导出。建议改用最新版 Chrome / Edge / Firefox。');

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const stream = canvas.captureStream(fps);
    const mimeType = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (!mimeType) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('当前浏览器没有可用的 WebM 编码器，请改用 GIF 导出。');
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: size.height >= 720 ? 6_000_000 : 3_000_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error('WebM 编码失败'));
    });

    recorder.start(100);
    const frameDelay = Math.max(20, 1000 / fps);
    await sleep(80);
    for (let i = 0; i < frames.length; i += 1) {
      await drawBlobToCanvas(frames[i].blob, canvas, size.width, size.height);
      setProgress(Math.round(((i + 1) / frames.length) * 96));
      await sleep(frameDelay);
    }
    await sleep(120);
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    setProgress(100);
    downloadBlob(new Blob(chunks, { type: mimeType }), `${safeFilename(filename)}.webm`);
  };

  const handleExport = async () => {
    if (!frames.length || rendering) return;
    setError(null);
    setProgress(0);
    setRendering(true);
    try {
      if (format === 'gif') await exportGif();
      else await exportWebm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请重试。');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <div className="dialog-header">
          <div>
            <h2 id="export-title" className="text-base font-semibold text-white">导出动画</h2>
            <p className="mt-1 text-xs text-zinc-500">所有渲染都在当前浏览器本地完成，不上传图片。</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={rendering} aria-label="关闭导出窗口">
            <X size={17} />
          </button>
        </div>

        <div className="dialog-body space-y-5">
          <div>
            <label className="field-label">格式</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`format-card ${format === 'gif' ? 'format-active' : ''}`} onClick={() => setFormat('gif')} disabled={rendering}>
                <ImageIcon size={19} />
                <span><strong>Animated GIF</strong><small>通用、支持循环</small></span>
              </button>
              <button type="button" className={`format-card ${format === 'webm' ? 'format-active' : ''}`} onClick={() => setFormat('webm')} disabled={rendering}>
                <Film size={19} />
                <span><strong>WebM Video</strong><small>更高画质、体积更小</small></span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">FPS</span>
              <select className="select-input" value={fps} onChange={(event) => setFps(Number(event.target.value))} disabled={rendering}>
                {FPS_OPTIONS.map((value) => <option key={value} value={value}>{value} FPS</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">分辨率</span>
              <select className="select-input" value={resolution} onChange={(event) => setResolution(event.target.value as ExportResolution)} disabled={rendering}>
                <option value="source">原始尺寸</option>
                <option value="720p">最高 720p（推荐）</option>
                <option value="480p">最高 480p（更快）</option>
              </select>
            </label>
          </div>

          <label>
            <span className="field-label">文件名</span>
            <input className="text-input" value={filename} onChange={(event) => setFilename(event.target.value)} disabled={rendering} />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div>
              <div className="text-sm font-medium text-zinc-200">循环动画</div>
              <div className="mt-0.5 text-xs text-zinc-600">
                {format === 'gif' ? '写入 GIF 循环标记' : 'WebM 是否循环由播放器控制，文件本身没有通用循环标记'}
              </div>
            </div>
            <button
              type="button"
              className={`toggle ${loop && format === 'gif' ? 'toggle-on' : ''}`}
              onClick={() => setLoop(!loop)}
              disabled={rendering || format === 'webm'}
              aria-pressed={loop}
            ><span /></button>
          </div>

          {size && <div className="text-xs text-zinc-600">输出：{size.width} × {size.height} · {frames.length} 帧 · {(frames.length / fps).toFixed(1)} 秒</div>}

          {rendering && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Rendering</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-track"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}
        </div>

        <div className="dialog-footer">
          <button className="secondary-button" type="button" onClick={onClose} disabled={rendering}>取消</button>
          <button className="primary-button" type="button" onClick={handleExport} disabled={!frames.length || rendering}>
            <Download size={15} /> {rendering ? `渲染中 ${progress}%` : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  );
}
