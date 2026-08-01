import jsQR from 'jsqr'
import { parseTransferPayload, type TransferResolve } from './xMoneyTransfer'

export type QrDecodeResult = {
  decode: TransferResolve
  /** Cropped preview of detected QR region (blob URL) — revoke when done */
  cropPreviewUrl: string | null
  /** Full image preview blob URL */
  fullPreviewUrl: string
  /** Glass mask source (prefer crop when available) */
  glassSourceFile: Blob
  attempts: string[]
}

function failDecode(
  note: string,
  method: TransferResolve['method'] = 'qr_lib',
  raw = '',
): TransferResolve {
  return {
    ok: false,
    handle: null,
    transferUrl: null,
    kind: null,
    raw,
    method,
    isXMoney: false,
    note,
  }
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(
        new Error(
          'Image decode failed — try PNG/JPG/WEBP or paste the X Money link',
        ),
      )
    img.src = url
  })
}

function drawToCanvas(
  img: CanvasImageSource,
  sw: number,
  sh: number,
  maxSide = 1280,
  minSide = 320,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } {
  // Upscale tiny QRs (phone thumbnails / 118px exports) so jsQR can lock
  let scale = Math.min(1, maxSide / Math.max(sw, sh))
  if (Math.max(sw, sh) < minSide) {
    scale = minSide / Math.max(sw, sh)
  }
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2d context unavailable')
  ctx.imageSmoothingEnabled = scale < 1
  ctx.drawImage(img, 0, 0, w, h)
  return { canvas, ctx, w, h }
}

function tryJsQr(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
  attempts: string[],
  inversion: 'dontInvert' | 'attemptBoth' | 'invertFirst' = 'attemptBoth',
): ReturnType<typeof jsQR> {
  const { data } = ctx.getImageData(0, 0, w, h)
  const code = jsQR(data, w, h, { inversionAttempts: inversion })
  attempts.push(code ? `${label}: hit` : `${label}: miss`)
  return code
}

/** Bounding box from jsQR corner points + padding */
function cropFromLocation(
  source: HTMLCanvasElement,
  location: NonNullable<ReturnType<typeof jsQR>>['location'],
  padRatio = 0.12,
): HTMLCanvasElement {
  const pts = [
    location.topLeftCorner,
    location.topRightCorner,
    location.bottomLeftCorner,
    location.bottomRightCorner,
  ]
  let minX = Math.min(...pts.map((p) => p.x))
  let maxX = Math.max(...pts.map((p) => p.x))
  let minY = Math.min(...pts.map((p) => p.y))
  let maxY = Math.max(...pts.map((p) => p.y))
  const bw = maxX - minX
  const bh = maxY - minY
  const pad = Math.max(bw, bh) * padRatio
  minX = Math.max(0, Math.floor(minX - pad))
  minY = Math.max(0, Math.floor(minY - pad))
  maxX = Math.min(source.width, Math.ceil(maxX + pad))
  maxY = Math.min(source.height, Math.ceil(maxY + pad))
  const cw = Math.max(1, maxX - minX)
  const ch = Math.max(1, maxY - minY)
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const octx = out.getContext('2d')
  if (!octx) throw new Error('crop ctx failed')
  octx.drawImage(source, minX, minY, cw, ch, 0, 0, cw, ch)
  return out
}

/** Heuristic: high-contrast center square crop (when jsQR needs help) */
function centerSquareCrop(source: HTMLCanvasElement, fraction = 0.72): HTMLCanvasElement {
  const side = Math.floor(Math.min(source.width, source.height) * fraction)
  const x = Math.floor((source.width - side) / 2)
  const y = Math.floor((source.height - side) / 2)
  const out = document.createElement('canvas')
  out.width = side
  out.height = side
  const octx = out.getContext('2d')
  if (!octx) throw new Error('center crop failed')
  octx.drawImage(source, x, y, side, side, 0, 0, side, side)
  return out
}

function thresholdCanvas(source: HTMLCanvasElement, t = 128): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0)
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] + d[i + 1] + d[i + 2]) / 3
    const v = g > t ? 255 : 0
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return out
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

function hitResult(
  code: NonNullable<ReturnType<typeof jsQR>>,
  glassCanvas: HTMLCanvasElement,
  fullPreviewUrl: string,
  attempts: string[],
  cropFromCode: boolean,
): Promise<QrDecodeResult> {
  return (async () => {
    const source = cropFromCode ? cropFromLocation(glassCanvas, code.location) : glassCanvas
    if (cropFromCode) attempts.push('auto-crop: from finder corners')
    const cropBlob = await canvasToPngBlob(source)
    const cropPreviewUrl = URL.createObjectURL(cropBlob)
    return {
      decode: parseTransferPayload(code.data, 'qr_lib'),
      cropPreviewUrl,
      fullPreviewUrl,
      glassSourceFile: cropBlob,
      attempts,
    }
  })()
}

/**
 * Auto multi-pass QR decode + crop.
 * Accepts any File; non-images fail with a clear note (UI picker is accept=all).
 * Passes: full → center crops → threshold. Tiny frames are upscaled first.
 */
export async function decodeQrFromFile(file: File): Promise<QrDecodeResult> {
  const fullPreviewUrl = URL.createObjectURL(file)
  const attempts: string[] = [`file: ${file.name || 'blob'} (${file.type || 'unknown'} · ${file.size}b)`]

  // Non-image MIME still allowed by picker — try decode; if browser can't rasterize, error cleanly
  let img: ImageBitmap | HTMLImageElement
  try {
    if (typeof createImageBitmap === 'function') {
      try {
        img = await createImageBitmap(file)
        attempts.push('bitmap: ok')
      } catch {
        img = await loadImageFromUrl(fullPreviewUrl)
        attempts.push('img-tag: ok')
      }
    } else {
      img = await loadImageFromUrl(fullPreviewUrl)
      attempts.push('img-tag: ok')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    attempts.push(`load: fail · ${msg}`)
    return {
      decode: failDecode(
        `Could not open file as image (${file.type || 'no mime'}). Paste https://x.com/i/money/pay|transfer/{handle} instead.`,
      ),
      cropPreviewUrl: null,
      fullPreviewUrl,
      glassSourceFile: file,
      attempts,
    }
  }

  const sw =
    'naturalWidth' in img && img.naturalWidth
      ? img.naturalWidth
      : (img as ImageBitmap).width
  const sh =
    'naturalHeight' in img && img.naturalHeight
      ? img.naturalHeight
      : (img as ImageBitmap).height

  if (!sw || !sh) {
    return {
      decode: failDecode('Image has zero dimensions'),
      cropPreviewUrl: null,
      fullPreviewUrl,
      glassSourceFile: file,
      attempts,
    }
  }

  const { canvas, ctx, w, h } = drawToCanvas(img, sw, sh)
  attempts.push(`canvas: ${w}x${h} (src ${sw}x${sh})`)
  if ('close' in img && typeof img.close === 'function') {
    try {
      img.close()
    } catch {
      /* ignore */
    }
  }

  let code = tryJsQr(ctx, w, h, 'full', attempts, 'attemptBoth')

  // Center crop passes (UI chrome screenshots)
  if (!code) {
    for (const frac of [0.85, 0.7, 0.55, 0.4]) {
      const mid = centerSquareCrop(canvas, frac)
      const mctx = mid.getContext('2d', { willReadFrequently: true })!
      code = tryJsQr(mctx, mid.width, mid.height, `center-${Math.round(frac * 100)}`, attempts, 'attemptBoth')
      if (code) {
        return hitResult(code, mid, fullPreviewUrl, attempts, false)
      }
    }
  }

  // Threshold passes on full frame
  if (!code) {
    for (const t of [100, 128, 160]) {
      const thr = thresholdCanvas(canvas, t)
      const tctx = thr.getContext('2d', { willReadFrequently: true })!
      code = tryJsQr(tctx, thr.width, thr.height, `thr-${t}`, attempts, 'attemptBoth')
      if (code) {
        return hitResult(code, thr, fullPreviewUrl, attempts, true)
      }
    }
  }

  if (!code) {
    return {
      decode: failDecode(
        'No QR found after full + center + threshold passes. Use a tighter crop or paste the X Money pay/transfer link.',
      ),
      cropPreviewUrl: null,
      fullPreviewUrl,
      glassSourceFile: file,
      attempts,
    }
  }

  return hitResult(code, canvas, fullPreviewUrl, attempts, true)
}
