import { GIFEncoder, quantize, applyPalette } from "gifenc";

export interface ExportFrame {
  blob: Blob;
}

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  loop: boolean;
  onProgress?: (progress: number) => void;
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let width = targetWidth;
  let height = targetHeight;
  let x = 0;
  let y = 0;

  if (sourceRatio > targetRatio) {
    height = targetWidth / sourceRatio;
    y = (targetHeight - height) / 2;
  } else {
    width = targetHeight * sourceRatio;
    x = (targetWidth - width) / 2;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
  );
}


export async function exportGif(
  frames: ExportFrame[],
  options: GifExportOptions,
): Promise<Blob> {

  const gif = GIFEncoder();

  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  const delay = Math.round(1000 / options.fps);


  for (let i = 0; i < frames.length; i++) {

    const bitmap = await createImageBitmap(
      frames[i].blob,
    );


    drawContained(
      ctx,
      bitmap,
      bitmap.width,
      bitmap.height,
      options.width,
      options.height,
    );


    bitmap.close();


    const imageData = ctx.getImageData(
      0,
      0,
      options.width,
      options.height,
    );


    const palette = quantize(
      imageData.data,
      256,
      {
        format: "rgb565",
      },
    );


    const index = applyPalette(
      imageData.data,
      palette,
      "rgb565",
    );


    gif.writeFrame(
      index,
      options.width,
      options.height,
      {
        palette,
        delay,
        repeat:
          i === 0 && options.loop
            ? 0
            : undefined,
      },
    );


    options.onProgress?.(
      Math.round(
        ((i + 1) / frames.length) * 100,
      ),
    );


    if (i % 2 === 0) {
      await nextPaint();
    }
  }


  gif.finish();


  // Fix TypeScript BlobPart compatibility issue
  // Uint8Array<ArrayBufferLike> -> ArrayBuffer
  const bytes = gif.bytes();

  const buffer = new ArrayBuffer(
    bytes.byteLength,
  );

  new Uint8Array(buffer).set(bytes);


  return new Blob(
    [buffer],
    {
      type: "image/gif",
    },
  );
}



export async function exportWebM(
  canvas: HTMLCanvasElement,
  fps: number,
  duration: number,
): Promise<Blob> {

  const stream =
    canvas.captureStream(fps);


  const recorder =
    new MediaRecorder(
      stream,
      {
        mimeType:
          "video/webm",
      },
    );


  const chunks: BlobPart[] = [];


  recorder.ondataavailable = (
    event,
  ) => {

    if (event.data.size > 0) {
      chunks.push(event.data);
    }

  };


  const stopped =
    new Promise<Blob>((resolve) => {

      recorder.onstop = () => {

        resolve(
          new Blob(
            chunks,
            {
              type:
                "video/webm",
            },
          ),
        );

      };

    });


  recorder.start();


  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        duration,
      ),
  );


  recorder.stop();


  return stopped;
}
