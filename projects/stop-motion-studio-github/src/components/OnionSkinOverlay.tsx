import { useObjectUrl } from '../hooks/useObjectUrl'

export function OnionSkinOverlay({ blob, opacity }: { blob?: Blob; opacity: number }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return (
    <img
      src={url}
      alt="上一帧洋葱皮"
      draggable={false}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      style={{ opacity }}
    />
  )
}
