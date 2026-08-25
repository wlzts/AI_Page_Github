import type { StudioFrame } from '../types'

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))), type, quality)
  })
}

async function decodeBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob)
}

export async function makeThumbnail(blob: Blob, maxWidth = 240): Promise<Blob> {
  const bitmap = await decodeBlob(blob)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvasToBlob(canvas, 'image/jpeg', 0.7)
}

export async function captureVideoFrame(video: HTMLVideoElement): Promise<StudioFrame> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('摄像头画面还没有准备好')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })!
  ctx.drawImage(video, 0, 0, width, height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  const thumbnail = await makeThumbnail(blob)
  return {
    id: crypto.randomUUID(),
    blob,
    thumbnail,
    width,
    height,
    createdAt: Date.now(),
  }
}

export async function fileToFrame(file: File): Promise<StudioFrame> {
  const bitmap = await decodeBlob(file)
  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()
  return {
    id: crypto.randomUUID(),
    blob: file,
    thumbnail: await makeThumbnail(file),
    width,
    height,
    createdAt: Date.now(),
    sourceName: file.name,
  }
}

export function drawContained(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  ctx.drawImage(source, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height)
}

export function useableFilename(name: string) {
  return (name.trim() || 'stop-motion').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}
