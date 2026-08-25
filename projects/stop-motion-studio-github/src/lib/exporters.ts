import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import type { ExportResolution, StudioFrame } from '../types'
import { drawContained } from './image'

type ExportOptions = {
  fps: number
  resolution: ExportResolution
  loop: boolean
  onProgress: (progress: number) => void
}

function getExportSize(frame: StudioFrame, resolution: ExportResolution) {
  if (resolution === 'original') return { width: frame.width, height: frame.height }
  const longEdge = Number(resolution)
  const isLandscape = frame.width >= frame.height
  if (isLandscape) {
    return { width: longEdge, height: Math.max(2, Math.round((frame.height / frame.width) * longEdge / 2) * 2) }
  }
  return { width: Math.max(2, Math.round((frame.width / frame.height) * longEdge / 2) * 2), height: longEdge }
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

export async function renderGif(frames: StudioFrame[], options: ExportOptions) {
  if (!frames.length) throw new Error('没有可导出的帧')
  const { width, height } = getExportSize(frames[0], options.resolution)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })!
  const gif = GIFEncoder()
  const delay = Math.max(20, Math.round(1000 / options.fps))

  for (let i = 0; i < frames.length; i++) {
    const bitmap = await createImageBitmap(frames[i].blob)
    drawContained(ctx, bitmap, bitmap.width, bitmap.height, width, height)
    bitmap.close()
    const rgba = ctx.getImageData(0, 0, width, height).data
    const palette = quantize(rgba, 256, { format: 'rgb565' })
    const index = applyPalette(rgba, palette, 'rgb565')
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: i === 0 ? (options.loop ? 0 : -1) : undefined,
    })
    options.onProgress(Math.round(((i + 1) / frames.length) * 100))
    if (i % 2 === 0) await nextPaint()
  }

  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}

function pickWebmMimeType() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function canExportWebM() {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function' && !!pickWebmMimeType()
}

export async function renderWebM(frames: StudioFrame[], options: ExportOptions) {
  if (!frames.length) throw new Error('没有可导出的帧')
  if (!canExportWebM()) throw new Error('当前浏览器不支持 WebM 导出，请改用 GIF')
  const { width, height } = getExportSize(frames[0], options.resolution)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })!
  const stream = canvas.captureStream(options.fps)
  const mimeType = pickWebmMimeType()
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: Math.min(16_000_000, Math.max(2_000_000, width * height * options.fps * 0.12)),
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('WebM 编码失败'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
  })

  recorder.start(250)
  const frameDelay = 1000 / options.fps
  for (let i = 0; i < frames.length; i++) {
    const bitmap = await createImageBitmap(frames[i].blob)
    drawContained(ctx, bitmap, bitmap.width, bitmap.height, width, height)
    bitmap.close()
    options.onProgress(Math.round(((i + 1) / frames.length) * 100))
    await new Promise((resolve) => setTimeout(resolve, frameDelay))
  }
  await new Promise((resolve) => setTimeout(resolve, Math.max(80, frameDelay)))
  recorder.stop()
  stream.getTracks().forEach((track) => track.stop())
  return finished
}
