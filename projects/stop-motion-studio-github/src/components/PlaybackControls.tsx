import { Pause, Play, Repeat2, SkipBack, SkipForward } from 'lucide-react';

export function PlaybackControls({
  playing,
  loop,
  frameCount,
  fps,
  onPlayPause,
  onPrevious,
  onNext,
  onToggleLoop,
}: {
  playing: boolean;
  loop: boolean;
  frameCount: number;
  fps: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleLoop: () => void;
}) {
  const disabled = frameCount === 0;
  const duration = frameCount / fps;

  return (
    <div className="playback-bar">
      <div className="playback-controls">
        <button className="round-control" type="button" onClick={onPrevious} disabled={disabled} title="上一帧">
          <SkipBack size={17} fill="currentColor" />
        </button>
        <button className="play-control" type="button" onClick={onPlayPause} disabled={disabled} title={playing ? '暂停' : '播放'}>
          {playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" className="translate-x-0.5" />}
        </button>
        <button className="round-control" type="button" onClick={onNext} disabled={disabled} title="下一帧">
          <SkipForward size={17} fill="currentColor" />
        </button>
        <button
          className={`round-control ${loop ? 'text-amber-300 ring-1 ring-amber-400/30' : ''}`}
          type="button"
          onClick={onToggleLoop}
          title="循环播放"
        >
          <Repeat2 size={17} />
        </button>
      </div>
      <div className="playback-meta">
        <span>{frameCount} Frames</span>
        <span className="meta-dot" />
        <span>{fps} FPS</span>
        <span className="meta-dot" />
        <span>{duration.toFixed(1)} sec</span>
      </div>
    </div>
  );
}
