/**
 * Load any user-picked file (screenshots, HEIC, WebP, gallery exports, etc.)
 * and extract a QR payload or pay-link text. Uses BarcodeDetector when present
 * and jsQR as a cross-browser fallback (with multi-scale + invert attempts).
 */
import jsQR from "jsqr";

async function bitmapFromFile(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    /* fall through */
  }

  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    /* fall through */
  }

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    return await createImageBitmap(img);
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

async function detectWithBarcodeDetector(
  source: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  try {
    // @ts-expect-error BarcodeDetector not in all TS DOM libs
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const codes = await detector.detect(source);
    const value = codes?.[0]?.rawValue as string | undefined;
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  opts?: { invert?: boolean; contrast?: number },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  if (opts?.invert || opts?.contrast) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const c = opts.contrast ?? 1;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      // contrast around mid gray
      r = Math.min(255, Math.max(0, (r - 128) * c + 128));
      g = Math.min(255, Math.max(0, (g - 128) * c + 128));
      b = Math.min(255, Math.max(0, (b - 128) * c + 128));
      if (opts.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

function decodeJsQR(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const code = jsQR(data, width, height, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Run multiple scales / crops / contrast passes — phone screenshots often
 * put a small QR in a corner of a large image.
 */
function decodeWithJsQRMulti(bmp: ImageBitmap): string | null {
  const w = bmp.width;
  const h = bmp.height;
  if (w < 8 || h < 8) return null;

  // Scale targets: native (capped), upscales for tiny codes, downscales for huge screenshots
  const maxSide = Math.max(w, h);
  const scales: number[] = [];
  if (maxSide > 1600) scales.push(1200 / maxSide, 800 / maxSide);
  scales.push(1);
  if (maxSide < 600) scales.push(2, 3);
  else if (maxSide < 1200) scales.push(1.5);
  scales.push(0.75, 0.5);

  const seen = new Set<number>();
  for (const s of scales) {
    const key = Math.round(s * 1000);
    if (seen.has(key)) continue;
    seen.add(key);
    const tw = Math.max(32, Math.round(w * s));
    const th = Math.max(32, Math.round(h * s));
    // skip absurd sizes
    if (tw * th > 12_000_000) continue;

    for (const invert of [false, true]) {
      for (const contrast of [1, 1.4, 1.8]) {
        const canvas = drawToCanvas(bmp, tw, th, { invert, contrast });
        const hit = decodeJsQR(canvas);
        if (hit) return hit;
      }
    }
  }

  // Center-crop (common: QR centered on share sheet)
  const crops: Array<[number, number, number, number]> = [
    [0.15, 0.15, 0.7, 0.7],
    [0.25, 0.2, 0.5, 0.6],
    [0.05, 0.05, 0.45, 0.45], // top-left
    [0.5, 0.05, 0.45, 0.45], // top-right
    [0.05, 0.5, 0.45, 0.45], // bottom-left
    [0.5, 0.5, 0.45, 0.45], // bottom-right
  ];
  for (const [fx, fy, fw, fh] of crops) {
    const sx = Math.floor(w * fx);
    const sy = Math.floor(h * fy);
    const sw = Math.max(32, Math.floor(w * fw));
    const sh = Math.max(32, Math.floor(h * fh));
    const canvas = document.createElement("canvas");
    // upscale crop for small QR regions
    const scale = Math.min(4, Math.max(1, 600 / Math.min(sw, sh)));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const hit = decodeJsQR(canvas);
    if (hit) return hit;
    // inverted crop
    const inv = drawToCanvas(canvas, canvas.width, canvas.height, {
      invert: true,
      contrast: 1.5,
    });
    const hit2 = decodeJsQR(inv);
    if (hit2) return hit2;
  }

  return null;
}

async function decodeQrFromBitmap(bmp: ImageBitmap): Promise<string | null> {
  // 1) Native BarcodeDetector (Chrome/Android — fast when available)
  let value = await detectWithBarcodeDetector(bmp);
  if (value) return value;
  try {
    const canvas = drawToCanvas(bmp, bmp.width, bmp.height);
    value = await detectWithBarcodeDetector(canvas);
    if (value) return value;
  } catch {
    /* ignore */
  }

  // 2) jsQR multi-pass (works in Firefox/Safari/Playwright Chromium)
  return decodeWithJsQRMulti(bmp);
}

/** Pull an x.com / @handle / money URL out of freeform screenshot OCR-ish text. */
function extractLinkFromLooseText(text: string): string | null {
  const cleaned = text.replace(/\u0000/g, " ").trim();
  if (!cleaned || cleaned.length > 8000) return null;
  if (/[\x00-\x08\x0e-\x1f]/.test(cleaned.slice(0, 200)) && cleaned.length > 500) {
    return null; // likely binary
  }

  const urlMatch = cleaned.match(
    /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/i\/money\/(?:pay|transfer)\/[A-Za-z0-9_]+/i,
  );
  if (urlMatch) return urlMatch[0];

  const handleMatch = cleaned.match(/@([A-Za-z0-9_]{1,15})\b/);
  if (handleMatch) return `@${handleMatch[1]}`;

  if (/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) return cleaned;

  return null;
}

export type QrFileResult =
  | { ok: true; value: string; source: "qr" | "text" }
  | { ok: false; error: string };

/**
 * Accept any file (screenshots, gallery picks, cloud exports).
 * Tries QR decode first, then plain-text URL payload.
 */
export async function extractPayPayloadFromFile(
  file: File,
): Promise<QrFileResult> {
  const bmp = await bitmapFromFile(file);
  if (bmp) {
    try {
      const value = await decodeQrFromBitmap(bmp);
      if (value) return { ok: true, value, source: "qr" };
    } finally {
      bmp.close();
    }
  }

  // Text / note / clipboard export files
  try {
    const text = (await readAsText(file)).trim();
    const extracted = extractLinkFromLooseText(text);
    if (extracted) return { ok: true, value: extracted, source: "text" };
  } catch {
    /* ignore */
  }

  if (!bmp) {
    return {
      ok: false,
      error:
        "Could not open that file as an image. Try PNG/JPG/WebP screenshot, or paste the X Money link.",
    };
  }

  return {
    ok: false,
    error:
      "No QR found in that screenshot. Crop tighter around the QR (or zoom in), re-upload, or paste the X Money link.",
  };
}
