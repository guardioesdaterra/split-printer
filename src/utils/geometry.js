export const A4_W = 210
export const A4_H = 297
export const A4_PX_300_W = 2480
export const A4_PX_300_H = 3508

export function computeGrid(imageW, imageH, rows, cols) {
  const gW = cols * A4_W
  const gH = rows * A4_H
  const gAspect = gW / gH
  const iAspect = imageW / imageH

  const scale = iAspect > gAspect ? gH / imageH : gW / imageW
  const sW = imageW * scale
  const sH = imageH * scale
  const oX = (gW - sW) / 2
  const oY = (gH - sH) / 2

  return { gridW: gW, gridH: gH, scale, scaledW: sW, scaledH: sH, offX: oX, offY: oY }
}

export function pageSource(image, row, col, rows, cols, overlap, geom) {
  const srcX = (col * A4_W - overlap - geom.offX) / geom.scale
  const srcY = (row * A4_H - overlap - geom.offY) / geom.scale
  const srcW = (A4_W + 2 * overlap) / geom.scale
  const srcH = (A4_H + 2 * overlap) / geom.scale

  const cX = Math.max(0, srcX)
  const cY = Math.max(0, srcY)
  const cW = Math.min(image.width - cX, srcW - (cX - srcX))
  const cH = Math.min(image.height - cY, srcH - (cY - srcY))

  return { srcX: cX, srcY: cY, srcW: cW, srcH: cH, extX: srcX, extY: srcY, extW: srcW, extH: srcH }
}

export function extractCanvas(image, row, col, rows, cols, overlap, geom, tW, tH) {
  const src = pageSource(image, row, col, rows, cols, overlap, geom)
  if (src.srcW <= 0 || src.srcH <= 0) return null

  const sX = tW / src.extW
  const sY = tH / src.extH
  const dX = (src.srcX - src.extX) * sX
  const dY = (src.srcY - src.extY) * sY
  const dW = src.srcW * sX
  const dH = src.srcH * sY

  const c = document.createElement('canvas')
  c.width = tW
  c.height = tH
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tW, tH)
  if (dW > 0 && dH > 0) ctx.drawImage(image, src.srcX, src.srcY, src.srcW, src.srcH, dX, dY, dW, dH)
  return c
}
