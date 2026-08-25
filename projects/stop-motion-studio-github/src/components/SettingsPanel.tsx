import { Camera, Gauge, Layers3, Repeat2, RefreshCw } from 'lucide-react';

const FPS_OPTIONS = [1, 2, 4, 6, 8, 10, 12, 15, 24];

export function SettingsPanel({
  fps,
  loop,
  onionEnabled,
  onionOpacity,
  devices,
  activeDeviceId,
  facingMode,
  onFpsChange,
  onLoopChange,
  onOnionChange,
  onOpacityChange,
  onDeviceChange,
  onSwitchFacing,
  onRefreshDevices,
}: {
  fps: number;
  loop: boolean;
  onionEnabled: boolean;
  onionOpacity: number;
  devices: MediaDeviceInfo[];
  activeDeviceId: string;
  facingMode: 'user' | 'environment';
  onFpsChange: (fps: number) => void;
  onLoopChange: (loop: boolean) => void;
  onOnionChange: (enabled: boolean) => void;
  onOpacityChange: (opacity: number) => void;
  onDeviceChange: (deviceId: string) => void;
  onSwitchFacing: () => void;
  onRefreshDevices: () => void;
}) {
  return (
    <aside className="settings-panel">
      <div className="settings-title">动画设置</div>

      <div className="setting-group">
        <label className="setting-label">
          <span className="flex items-center gap-2"><Gauge size={15} /> FPS 帧率</span>
          <span className="setting-value">{fps}</span>
        </label>
        <div className="fps-grid">
          {FPS_OPTIONS.map((value) => (
            <button
              key={value}
              className={`fps-button ${fps === value ? 'fps-active' : ''}`}
              type="button"
              onClick={() => onFpsChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-label">
          <span className="flex items-center gap-2"><Layers3 size={15} /> Onion Skin 洋葱皮</span>
          <button
            type="button"
            className={`toggle ${onionEnabled ? 'toggle-on' : ''}`}
            onClick={() => onOnionChange(!onionEnabled)}
            aria-pressed={onionEnabled}
          >
            <span />
          </button>
        </div>
        <label className={`mt-4 block ${onionEnabled ? '' : 'opacity-45'}`}>
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>上一帧透明度</span>
            <span>{Math.round(onionOpacity * 100)}%</span>
          </div>
          <input
            className="range-input"
            type="range"
            min="0.05"
            max="0.8"
            step="0.05"
            value={onionOpacity}
            disabled={!onionEnabled}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="setting-group">
        <div className="setting-label">
          <span className="flex items-center gap-2"><Repeat2 size={15} /> 循环播放</span>
          <button
            type="button"
            className={`toggle ${loop ? 'toggle-on' : ''}`}
            onClick={() => onLoopChange(!loop)}
            aria-pressed={loop}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="setting-group">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Camera size={15} /> 摄像头</span>
          <button className="icon-button-small" type="button" onClick={onRefreshDevices} title="重新扫描摄像头">
            <RefreshCw size={13} />
          </button>
        </div>
        <select
          className="select-input"
          value={activeDeviceId}
          onChange={(event) => onDeviceChange(event.target.value)}
          aria-label="选择摄像头"
        >
          <option value="">自动选择摄像头</option>
          {devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `摄像头 ${index + 1}`}
            </option>
          ))}
        </select>
        <button className="secondary-button mt-2 w-full justify-center" type="button" onClick={onSwitchFacing}>
          切换{facingMode === 'environment' ? '前置' : '后置'}摄像头
        </button>
      </div>
    </aside>
  );
}
