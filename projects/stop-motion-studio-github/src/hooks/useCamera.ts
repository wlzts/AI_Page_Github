import { useCallback, useEffect, useRef, useState } from 'react'

type FacingMode = 'user' | 'environment'

export function useCamera(videoRef: React.RefObject<HTMLVideoElement>) {
  const streamRef = useRef<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'error'>('idle')
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [videoRef])

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const all = await navigator.mediaDevices.enumerateDevices()
    setDevices(all.filter((device) => device.kind === 'videoinput'))
  }, [])

  const start = useCallback(async (deviceId?: string, requestedFacing?: FacingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('当前浏览器不支持摄像头访问')
      return
    }
    setStatus('requesting')
    setError('')
    stop()
    try {
      const targetFacing = requestedFacing ?? facingMode
      const video: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: targetFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      setSelectedDeviceId(settings.deviceId || deviceId || '')
      setFacingMode(targetFacing)
      await refreshDevices()
      setStatus('ready')
    } catch (err) {
      const domError = err as DOMException
      if (domError.name === 'NotAllowedError' || domError.name === 'SecurityError') {
        setStatus('denied')
        setError('需要摄像头权限才能拍摄定格动画帧。你仍然可以导入图片继续创作。')
      } else {
        setStatus('error')
        setError(domError.message || '无法打开摄像头')
      }
    }
  }, [facingMode, refreshDevices, stop, videoRef])

  const switchFacing = useCallback(async () => {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await start(undefined, next)
  }, [facingMode, start])

  useEffect(() => {
    void start()
    return stop
    // only boot once; subsequent camera changes are explicit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler)
  }, [refreshDevices])

  return { devices, selectedDeviceId, facingMode, status, error, start, switchFacing, refreshDevices }
}
