// Browser-side preparation of a photo before it is uploaded: decode (HEIC through the lazy `heic-to` decoder only when the
// browser cannot read it), apply the EXIF orientation, shrink so the long side is at most 2400px and write a JPEG at q≈0.85.
// A 48 MP phone frame becomes a few hundred KB, so the server's size limit is never reached.

export const MAX_SIDE = 2400
const QUALITY = 0.85

export const isHeicLike = (f: File) => /^image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)
export const looksLikeImage = (f: File) => f.type.startsWith('image/') || isHeicLike(f) || /\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i.test(f.name)

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void }

/** The picture's size as the browser shows it (orientation applied) from the file header alone: a <img> that is never painted is not decoded. */
async function headerSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('unreadable'))
    })
    return img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // A 48 MP frame is ~190 MB as pixels, too much for a phone with other tabs open: ask the decoder for the final size
      // at once. Engines differ on whether the resize sees the picture before or after the EXIF rotation, so the result
      // is used only when its proportions are the header's; otherwise (or without support) the full decode below runs.
      const size = await headerSize(blob)
      if (size && Math.max(size.width, size.height) > MAX_SIDE) {
        const k = MAX_SIDE / Math.max(size.width, size.height)
        const w = Math.max(1, Math.round(size.width * k))
        const h = Math.max(1, Math.round(size.height * k))
        const small = await createImageBitmap(blob, { imageOrientation: 'from-image', resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }).catch(() => null)
        if (small && Math.abs(small.width / small.height - size.width / size.height) < 0.02) return { source: small, width: small.width, height: small.height, close: () => small.close() }
        small?.close()
      }
      let bmp: ImageBitmap
      try {
        bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      } catch (e) {
        // An old engine may not know the options object; a real decode failure fails here again.
        if (!(e instanceof TypeError)) throw e
        bmp = await createImageBitmap(blob)
      }
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const jpegName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`

/**
 * Returns a JPEG `File` ready to upload. `onHeic` is called when the heavy decoder starts (to say «Зменшуємо HEIC → JPG»).
 * Throws when the file cannot be read as an image.
 */
export async function prepareImage(file: File, onHeic: () => void): Promise<File> {
  let decoded: Decoded | null = null
  let converted: Blob | null = null
  try {
    decoded = await decode(file)
  } catch {
    decoded = null
  }
  if (!decoded && isHeicLike(file)) {
    onHeic()
    const { heicTo } = await import('heic-to')
    converted = await heicTo({ blob: file, type: 'image/jpeg', quality: QUALITY })
    decoded = await decode(converted)
  }
  if (!decoded) throw new Error('not-decodable')
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(decoded.width, decoded.height))
    // The decoder's own JPEG is already oriented and small enough: no second compression.
    if (converted && scale === 1) return new File([converted], jpegName(file.name), { type: 'image/jpeg' })
    const w = Math.max(1, Math.round(decoded.width * scale))
    const h = Math.max(1, Math.round(decoded.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no-canvas')
    ctx.fillStyle = '#fff' // transparent PNGs go onto white
    ctx.fillRect(0, 0, w, h)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(decoded.source, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('no-blob')
    return new File([blob], jpegName(file.name), { type: 'image/jpeg' })
  } finally {
    decoded.close()
  }
}
