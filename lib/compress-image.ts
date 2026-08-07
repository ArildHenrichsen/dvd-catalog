const TARGET_UPLOAD_BYTES = 3_800_000;
const MAX_WIDTH = 2_000;
const MAX_HEIGHT = 3_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Bildet kunne ikke leses"));
        image.src = url;
      });

      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Bildet kunne ikke komprimeres"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

function jpegFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "") || "cover";
  return `${base}.jpg`;
}

export async function compressImageForUpload(file: File): Promise<File> {
  let decoded: DecodedImage;

  try {
    decoded = await decodeImage(file);
  } catch {
    if (file.size <= TARGET_UPLOAD_BYTES) {
      return file;
    }

    throw new Error(
      "Bildet er for stort, og nettleseren kunne ikke komprimere formatet. Velg bildet fra bildebiblioteket som JPEG.",
    );
  }

  try {
    const initialScale = Math.min(
      1,
      MAX_WIDTH / decoded.width,
      MAX_HEIGHT / decoded.height,
    );

    let width = Math.max(1, Math.round(decoded.width * initialScale));
    let height = Math.max(1, Math.round(decoded.height * initialScale));
    let quality = 0.86;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Nettleseren støtter ikke bildekomprimering");
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      const blob = await canvasToJpeg(canvas, quality);

      if (blob.size <= TARGET_UPLOAD_BYTES) {
        return new File([blob], jpegFilename(file.name), {
          type: "image/jpeg",
          lastModified: file.lastModified,
        });
      }

      if (quality > 0.62) {
        quality -= 0.08;
      } else {
        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
        quality = 0.78;
      }
    }

    throw new Error(
      "Bildet kunne ikke komprimeres nok. Prøv et bilde med lavere oppløsning.",
    );
  } finally {
    decoded.cleanup();
  }
}
