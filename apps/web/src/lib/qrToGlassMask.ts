/**
 * GlassObject extrudes from alpha only.
 * Build module silhouette from a File or Blob (prefer auto-cropped QR).
 */

export type GlassMaskResult = {
  previewUrl: string
  glassUrl: string
  mode: 'light-modules' | 'dark-modules'
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image for glass mask'))
    img.src = url
  })
}

export async function blobToGlassMask(blob: Blob): Promise<GlassMaskResult> {
  const previewUrl = URL.createObjectURL(blob)
  const img = await loadImage(previewUrl)

  const maxSide = 512
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const { data } = imageData

  let sum = 0
  const n = w * h
  for (let i = 0; i < n; i++) {
    const o = i * 4
    sum += 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
  }
  const mean = sum / n
  const lightModules = mean < 128
  const mode: GlassMaskResult['mode'] = lightModules
    ? 'light-modules'
    : 'dark-modules'
  const threshold = mean

  for (let i = 0; i < n; i++) {
    const o = i * 4
    const y = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
    const isModule = lightModules ? y >= threshold : y < threshold
    if (isModule) {
      data[o] = 255
      data[o + 1] = 255
      data[o + 2] = 255
      data[o + 3] = 255
    } else {
      data[o + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)

  const glassUrl = await new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob failed'))),
      'image/png',
    )
  })

  return { previewUrl, glassUrl, mode }
}

export async function qrFileToGlassMask(file: File): Promise<GlassMaskResult> {
  return blobToGlassMask(file)
}
