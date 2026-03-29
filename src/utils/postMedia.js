function clampInt(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.round(num)))
}

export function resolvePostMedia(raw = {}) {
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : []
  const imageCaptions = Array.isArray(raw.imageCaptions)
    ? raw.imageCaptions
    : (Array.isArray(raw.image_captions) ? raw.image_captions : [])

  const requestedMode = String(raw.coverMode ?? raw.cover_mode ?? '').trim().toLowerCase()
  const coverMode = requestedMode === 'auto' && images.length ? 'auto' : 'manual'

  let coverImageCount = 0
  if (images.length) {
    if (coverMode === 'auto') {
      const maxAutoCount = Math.min(3, images.length)
      coverImageCount = clampInt(raw.coverImageCount ?? raw.cover_image_count, 1, maxAutoCount, maxAutoCount)
    } else {
      coverImageCount = 1
    }
  }

  const coverImages = images.slice(0, coverImageCount)
  const bodyImages = images.slice(coverImageCount)
  const coverCaptions = imageCaptions.slice(0, coverImageCount)
  const bodyImageCaptions = imageCaptions.slice(coverImageCount)

  return {
    coverMode,
    coverImageCount,
    coverImages,
    bodyImages,
    coverCaptions,
    bodyImageCaptions
  }
}
