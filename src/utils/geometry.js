export const A4_W = 210
export const A4_H = 297
export const A4_PX_300_W = 2480
export const A4_PX_300_H = 3508

export const PAGE_SIZES = {
  A4: { w: 210, h: 297, label: 'A4' },
  A3: { w: 297, h: 420, label: 'A3' },
  Letter: { w: 215.9, h: 279.4, label: 'Letter' },
  Legal: { w: 215.9, h: 355.6, label: 'Legal' },
  A5: { w: 148, h: 210, label: 'A5' },
}

export function getPageDims(sizeKey, orientation) {
  const s = PAGE_SIZES[sizeKey] || PAGE_SIZES.A4
  return orientation === 'landscape' ? { w: s.h, h: s.w } : { w: s.w, h: s.h }
}

export function pxAt300dpi(mm) {
  return Math.round(mm / 25.4 * 300)
}

export function computeGrid(imageW, imageH, rows, cols, pageW = A4_W, pageH = A4_H) {
  const gW = cols * pageW
  const gH = rows * pageH
  const gAspect = gW / gH
  const iAspect = imageW / imageH

  const scale = iAspect > gAspect ? gH / imageH : gW / imageW
  const sW = imageW * scale
  const sH = imageH * scale
  const oX = (gW - sW) / 2
  const oY = (gH - sH) / 2

  return { gridW: gW, gridH: gH, scale, scaledW: sW, scaledH: sH, offX: oX, offY: oY }
}

export function pageSource(image, row, col, rows, cols, overlap, geom, pageW = A4_W, pageH = A4_H) {
  const srcX = (col * pageW - overlap - geom.offX) / geom.scale
  const srcY = (row * pageH - overlap - geom.offY) / geom.scale
  const srcW = (pageW + 2 * overlap) / geom.scale
  const srcH = (pageH + 2 * overlap) / geom.scale

  const cX = Math.max(0, srcX)
  const cY = Math.max(0, srcY)
  const cW = Math.min(image.width - cX, srcW - (cX - srcX))
  const cH = Math.min(image.height - cY, srcH - (cY - srcY))

  return { srcX: cX, srcY: cY, srcW: cW, srcH: cH, extX: srcX, extY: srcY, extW: srcW, extH: srcH }
}

export function extractCanvas(image, row, col, rows, cols, overlap, geom, tW, tH, pageW = A4_W, pageH = A4_H) {
  const src = pageSource(image, row, col, rows, cols, overlap, geom, pageW, pageH)
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
