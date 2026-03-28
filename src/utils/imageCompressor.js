/**
 * 浏览器端图片压缩工具
 * - 将图片压缩为 WebP，支持可选最大宽度缩放
 * - 默认质量 0.9，如需更小体积可传入 0.6~0.8
 * @param {File|Blob} file 原始文件对象
 * @param {number} quality 压缩质量 (0.1 - 1.0), 默认 0.9
 * @param {number} maxWidth 最大宽度，0 表示不限制
 * @returns {Promise<Blob>} WebP Blob
 */
export async function compressToWebP(file, quality = 0.9, maxWidth = 0) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result

      img.onload = () => {
        let w = img.width
        let h = img.height

        // 如果指定了最大宽度则按比例缩放
        if (maxWidth > 0 && w > maxWidth) {
          const ratio = maxWidth / w
          w = maxWidth
          h = h * ratio
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        }, 'image/webp', quality)
      }

      img.onerror = (err) => reject(err)
    }

    reader.onerror = (err) => reject(err)
  })
}

/**
 * 将 File 压缩后转换为可直接上传的 File 对象
 * @param {File} file 原文件
 * @param {object} opts 选项 { quality?: number, maxWidth?: number, name?: string }
 * @returns {Promise<File>} 压缩后的文件
 */
export async function compressFile(file, opts = {}) {
  const { quality = 0.9, maxWidth = 0, name } = opts
  const blob = await compressToWebP(file, quality, maxWidth)
  const filename = name || `${(file.name || 'photo').replace(/\.[^.]+$/, '')}.webp`
  return new File([blob], filename, { type: 'image/webp' })
}
