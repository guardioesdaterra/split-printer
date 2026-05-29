<template>
  <div ref="containerRef" class="canvas-wrap" @wheel.prevent="onWheel" @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend.prevent="onTouchEnd">
    <canvas ref="canvasRef" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp" @dblclick="onDblClick"></canvas>
    <div class="zoom-controls">
      <button class="zoom-btn" title="Zoom in" @click="stepZoom(1.25)">+</button>
      <span class="zoom-label">{{ (zoom * 100).toFixed(0) }}%</span>
      <button class="zoom-btn" title="Zoom out" @click="stepZoom(0.8)">-</button>
      <button class="zoom-btn" title="Reset view" @click="resetView">&#8634;</button>
    </div>
    <div v-if="!image" class="placeholder">
      <span class="placeholder-icon">&#128247;</span>
      <span>Upload an image to preview</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { A4_W, A4_H, computeGrid } from '../utils/geometry.js'

const props = defineProps({ image: Object, rows: Number, cols: Number, overlap: Number, pageW: { type: Number, default: A4_W }, pageH: { type: Number, default: A4_H }, alignOffX: { type: Number, default: 0 }, alignOffY: { type: Number, default: 0 } })
const emit = defineEmits(['update:alignOffX', 'update:alignOffY'])

const canvasRef = ref(null)
const containerRef = ref(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
let dragging = false
let lastX = 0, lastY = 0
let rafId = null

let touchId = null
let touchDist = 0
let touchPanX = 0, touchPanY = 0
let touchZoom = 1

const geom = computed(() => {
  if (!props.image) return null
  return computeGrid(props.image.width, props.image.height, props.rows, props.cols, props.pageW, props.pageH, props.alignOffX, props.alignOffY)
})

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container || !props.image || !geom.value) return

  const rect = container.getBoundingClientRect()
  const dpr = devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const g = geom.value
  const bScale = Math.min(rect.width / g.gridW, rect.height / g.gridH)
  const dScale = bScale * zoom.value

  const cx = rect.width / 2 + panX.value
  const cy = rect.height / 2 + panY.value

  ctx.clearRect(0, 0, rect.width, rect.height)

  const cBgAlt = cssVar('--bg-alt')
  const cBg = cssVar('--bg')
  const cBorder = cssVar('--border')
  const cText = cssVar('--text')

  ctx.fillStyle = cBgAlt
  ctx.fillRect(0, 0, rect.width, rect.height)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(dScale, dScale)
  ctx.translate(-g.gridW / 2, -g.gridH / 2)

  ctx.fillStyle = cBg
  ctx.fillRect(0, 0, g.gridW, g.gridH)

  ctx.drawImage(props.image, g.offX, g.offY, g.scaledW, g.scaledH)

  ctx.strokeStyle = cBorder
  ctx.lineWidth = 3 / dScale
  for (let r = 0; r <= props.rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * props.pageH); ctx.lineTo(g.gridW, r * props.pageH); ctx.stroke()
  }
  for (let c = 0; c <= props.cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * props.pageW, 0); ctx.lineTo(c * props.pageW, g.gridH); ctx.stroke()
  }

  const fs = Math.min(props.pageW, props.pageH) * 0.1 / dScale
  ctx.font = `bold ${fs}px Courier New, Courier, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let r = 0; r < props.rows; r++) {
    for (let c = 0; c < props.cols; c++) {
      const n = r * props.cols + c + 1
      const px = (c + 0.5) * props.pageW
      const py = (r + 0.5) * props.pageH
      const pad = 4 / dScale
      const m = ctx.measureText(String(n))
      const bw = m.width + pad * 2
      const bh = fs * 1.4
      ctx.fillStyle = cBg
      ctx.fillRect(px - bw / 2 - 2 / dScale, py - bh / 2 - 2 / dScale, bw + 4 / dScale, bh + 4 / dScale)
      ctx.strokeStyle = cBorder
      ctx.lineWidth = 2 / dScale
      ctx.strokeRect(px - bw / 2 - 2 / dScale, py - bh / 2 - 2 / dScale, bw + 4 / dScale, bh + 4 / dScale)
      ctx.fillStyle = cText
      ctx.fillText(String(n), px, py)
    }
  }

  ctx.restore()
}

function scheduleRender() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => { render(); rafId = null })
}

watch([() => props.image, () => props.rows, () => props.cols, () => props.overlap, () => props.pageW, () => props.pageH, () => props.alignOffX, () => props.alignOffY, zoom, panX, panY], scheduleRender, { deep: false })

watch(() => props.image, () => { zoom.value = 1; panX.value = 0; panY.value = 0 })

onMounted(() => {
  scheduleRender()
  window.addEventListener('resize', scheduleRender)
  window.addEventListener('reset-view', onResetView)
})
onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
  window.removeEventListener('reset-view', onResetView)
  if (rafId) cancelAnimationFrame(rafId)
})

function onDown(e) {
  if (e.button !== 0) return
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
}
function onMove(e) {
  if (!dragging) return
  panX.value += e.clientX - lastX
  panY.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
}
function onUp() { dragging = false }

function onWheel(e) {
  const isTrackpad = Math.abs(e.deltaY) < 20
  const isZoom = e.ctrlKey || e.metaKey
  if (isZoom) {
    const sensitivity = isTrackpad ? 0.005 : 0.001
    const delta = -e.deltaY * sensitivity
    applyZoom(zoom.value * (1 + delta), e)
  } else {
    const f = isTrackpad ? 2 : 1
    if (e.deltaX) panX.value -= e.deltaX * f
    if (e.deltaY) panY.value -= e.deltaY * f
    if (e.shiftKey && e.deltaY) panX.value -= e.deltaY * f
  }
}

function applyZoom(newZoom, e) {
  newZoom = Math.max(0.1, Math.min(10, newZoom))
  const container = containerRef.value
  if (container && e) {
    const rect = container.getBoundingClientRect()
    const mx = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.width / 2) - rect.left - rect.width / 2
    const my = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.height / 2) - rect.top - rect.height / 2
    const ratio = newZoom / zoom.value
    panX.value = mx - ratio * (mx - panX.value)
    panY.value = my - ratio * (my - panY.value)
  }
  zoom.value = newZoom
}

function stepZoom(factor) {
  applyZoom(zoom.value * factor, null)
}

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function onResetView() { resetView() }

// Double-click: reposition grid so clicked image area centers in the page cell
function onDblClick(e) {
  if (!props.image || !geom.value) return
  const g = geom.value
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const bScale = Math.min(rect.width / g.gridW, rect.height / g.gridH)
  const dScale = bScale * zoom.value

  const gx = (mx - rect.width / 2 - panX.value) / dScale + g.gridW / 2
  const gy = (my - rect.height / 2 - panY.value) / dScale + g.gridH / 2

  const col = Math.floor(gx / props.pageW)
  const row = Math.floor(gy / props.pageH)
  if (col < 0 || col >= props.cols || row < 0 || row >= props.rows) return

  const cx = (col + 0.5) * props.pageW
  const cy = (row + 0.5) * props.pageH

  const imgX = (gx - g.offX) / g.scale
  const imgY = (gy - g.offY) / g.scale

  const newOffX = cx - imgX * g.scale
  const newOffY = cy - imgY * g.scale

  const centerOffX = (g.gridW - g.scaledW) / 2
  const centerOffY = (g.gridH - g.scaledH) / 2

  const alignX = newOffX - centerOffX
  const alignY = newOffY - centerOffY

  emit('update:alignOffX', alignX)
  emit('update:alignOffY', alignY)
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    touchId = 1
    touchPanX = panX.value
    touchPanY = panY.value
    lastX = e.touches[0].clientX
    lastY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    touchId = 2
    touchZoom = zoom.value
    touchPanX = panX.value
    touchPanY = panY.value
    const t = e.touches
    touchDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    lastX = (t[0].clientX + t[1].clientX) / 2
    lastY = (t[0].clientY + t[1].clientY) / 2
  }
}

function onTouchMove(e) {
  if (touchId === 1 && e.touches.length === 1) {
    panX.value = touchPanX + (e.touches[0].clientX - lastX)
    panY.value = touchPanY + (e.touches[0].clientY - lastY)
  } else if (touchId === 2 && e.touches.length === 2) {
    const t = e.touches
    const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const newZoom = Math.max(0.1, Math.min(10, touchZoom * (dist / touchDist)))
    const cx = (t[0].clientX + t[1].clientX) / 2
    const cy = (t[0].clientY + t[1].clientY) / 2
    const container = containerRef.value
    if (container) {
      const rect = container.getBoundingClientRect()
      const mx = cx - rect.left - rect.width / 2
      const my = cy - rect.top - rect.height / 2
      const ratio = newZoom / zoom.value
      panX.value = touchPanX + (mx - ratio * mx)
      panY.value = touchPanY + (my - ratio * my)
    }
    zoom.value = newZoom
  }
}

function onTouchEnd() {
  touchId = null
}
</script>

<style scoped>
.canvas-wrap {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: var(--bg-alt);
  min-height: 200px;
  touch-action: none;
  border: var(--border-w) solid var(--border);
}
.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}
.canvas-wrap canvas:active { cursor: grabbing; }
.zoom-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  background: var(--bg);
  border: var(--border-w) solid var(--border);
  box-shadow: var(--shadow);
}
.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.zoom-btn:hover { background: var(--text); color: var(--bg); }
.zoom-label {
  font-size: 12px;
  font-family: var(--font);
  color: var(--text);
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 14px;
  font-family: var(--font);
  pointer-events: none;
}
.placeholder-icon {
  font-size: 40px;
}
</style>
