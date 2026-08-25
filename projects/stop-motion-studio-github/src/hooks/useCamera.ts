import { useCallback, useEffect, useRef, useState } from 'react';
import { canvasToBlob } from '../lib/image';

export type CameraCapture = {
  blob: Blob;
  width: number;
  height: number;
};

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((device) => device.kind === 'videoinput'));
    } catch {
      setDevices([]);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string, nextFacingMode?: 'user' | 'environment') => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器不支持摄像头访问，请使用最新版 Chrome、Edge、Safari 或 Firefox。');
        return;
      }

      stopCamera();
      setError(null);
      const targetFacing = nextFacingMode ?? facingMode;

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.deviceId) setActiveDeviceId(settings.deviceId);
        if (settings?.facingMode === 'user' || settings?.facingMode === 'environment') {
          setFacingMode(settings.facingMode);
        } else {
          setFacingMode(targetFacing);
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          if (!video.videoWidth) {
            await new Promise<void>((resolve) => {
              let settled = false;
              const done = () => {
                if (settled) return;
                settled = true;
                resolve();
              };
              video.addEventListener('loadedmetadata', done, { once: true });
              window.setTimeout(done, 1800);
            });
          }
          await video.play().catch(() => undefined);
        }
        await refreshDevices();
        setReady(true);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setError('需要摄像头权限才能拍摄定格动画帧。你也可以使用“导入图片”继续创作。');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError('没有找到可用摄像头，请连接摄像头或改用“导入图片”。');
        } else {
          setError('摄像头启动失败。请检查浏览器权限、HTTPS 环境或摄像头是否被其他应用占用。');
        }
      }
    },
    [facingMode, refreshDevices, stopCamera],
  );

  useEffect(() => {
    void startCamera(undefined, 'environment');
    return () => stopCamera();
    // 首次加载只请求一次；后续切换由显式操作触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchFacing = useCallback(async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setActiveDeviceId('');
    await startCamera(undefined, next);
  }, [facingMode, startCamera]);

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setActiveDeviceId(deviceId);
      await startCamera(deviceId, facingMode);
    },
    [facingMode, startCamera],
  );

  const retry = useCallback(() => startCamera(activeDeviceId || undefined, facingMode), [activeDeviceId, facingMode, startCamera]);

  const capture = useCallback(async (): Promise<CameraCapture> => {
    const video = videoRef.current;
    if (!video || !ready || !video.videoWidth || !video.videoHeight) {
      throw new Error('摄像头尚未准备好');
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法创建拍摄画布');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    return { blob, width: canvas.width, height: canvas.height };
  }, [ready]);

  return {
    videoRef,
    devices,
    activeDeviceId,
    facingMode,
    error,
    ready,
    capture,
    retry,
    selectDevice,
    switchFacing,
    refreshDevices,
  };
}
