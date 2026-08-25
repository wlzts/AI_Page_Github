export async function blobToThumbnail(blob: Blob, maxSize = 220): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('无法创建缩略图画布');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvasToBlob(canvas, 'image/webp', 0.78);
}

export async function getBlobDimensions(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const result = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.9,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('图像编码失败'));
    }, type, quality);
  });
}

export function fitInside(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  return {
    x: Math.round((targetWidth - width) / 2),
    y: Math.round((targetHeight - height) / 2),
    width,
    height,
  };
}

export async function drawBlobToCanvas(
  blob: Blob,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const bitmap = await createImageBitmap(blob);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    bitmap.close();
    throw new Error('无法创建画布');
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  const fit = fitInside(bitmap.width, bitmap.height, width, height);
  ctx.drawImage(bitmap, fit.x, fit.y, fit.width, fit.height);
  bitmap.close();
}

export function safeFilename(value: string) {
  const trimmed = value.trim() || 'stop-motion';
  return trimmed.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 80);
}
