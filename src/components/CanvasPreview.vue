<template>
  <div ref="containerRef" class="canvas-wrap" @wheel.prevent="onWheel" @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend.prevent="onTouchEnd">
    <canvas ref="canvasRef" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp"></canvas>
    <div class="zoom-controls">
      <button class="zoom-btn" title="Zoom in" @click="stepZoom(1.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
      <span class="zoom-label">{{ (zoom * 100).toFixed(0) }}%</span>
      <button class="zoom-btn" title="Zoom out" @click="stepZoom(0.8)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
      <button class="zoom-btn" title="Reset zoom" @click="resetView"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v5h5"/></svg></button>
    </div>
    <div v-if="!image" class="placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      <span>Upload an image to preview</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { A4_W, A4_H, computeGrid } from '../utils/geometry.js'

const props = defineProps({ image: Object, rows: Number, cols: Number, overlap: Number, pageW: { type: Number, default: A4_W }, pageH: { type: Number, default: A4_H } })

const canvasRef = ref(null)
const containerRef = ref(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
let dragging = false
let lastX = 0, lastY = 0
let rafId = null

// touch state
let touchId = null
let touchDist = 0
let touchPanX = 0, touchPanY = 0
let touchZoom = 1

const geom = computed(() => {
  if (!props.image) return null
  return computeGrid(props.image.width, props.image.height, props.rows, props.cols, props.pageW, props.pageH)
})

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

  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, rect.width, rect.height)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(dScale, dScale)
  ctx.translate(-g.gridW / 2, -g.gridH / 2)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, g.gridW, g.gridH)

  ctx.drawImage(props.image, g.offX, g.offY, g.scaledW, g.scaledH)

  ctx.strokeStyle = '#e53e3e'
  ctx.lineWidth = 1.5 / dScale
  for (let r = 0; r <= props.rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * props.pageH); ctx.lineTo(g.gridW, r * props.pageH); ctx.stroke()
  }
  for (let c = 0; c <= props.cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * props.pageW, 0); ctx.lineTo(c * props.pageW, g.gridH); ctx.stroke()
  }

  const fs = Math.min(props.pageW, props.pageH) * 0.08 / dScale
  ctx.font = `bold ${fs}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let r = 0; r < props.rows; r++) {
    for (let c = 0; c < props.cols; c++) {
      const n = r * props.cols + c + 1
      const px = (c + 0.5) * props.pageW
      const py = (r + 0.5) * props.pageH
      const pad = 2 / dScale
      const m = ctx.measureText(String(n))
      const bw = m.width + pad * 2
      const bh = fs * 1.4
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillRect(px - bw / 2, py - bh / 2, bw, bh)
      ctx.strokeStyle = '#e53e3e'
      ctx.lineWidth = 1 / dScale
      ctx.strokeRect(px - bw / 2, py - bh / 2, bw, bh)
      ctx.fillStyle = '#e53e3e'
      ctx.fillText(String(n), px, py)
    }
  }

  ctx.restore()
}

function scheduleRender() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => { render(); rafId = null })
}

watch([() => props.image, () => props.rows, () => props.cols, () => props.overlap, () => props.pageW, () => props.pageH, zoom, panX, panY], scheduleRender, { deep: false })

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

// Notebook trackpad / mouse wheel behavior:
//   - Trackpad two-finger swipe → pan (like every native app)
//   - Ctrl+wheel / pinch gesture → zoom centered on cursor
//   - Mouse wheel → pan vertically; Shift+wheel → pan horizontally
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

// Touch events for mobile / touchscreen notebooks
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
  border-radius: 8px;
  background: #e8e8e8;
  min-height: 300px;
  touch-action: none;
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
  gap: 2px;
  background: rgba(0,0,0,0.6);
  border-radius: 6px;
  padding: 2px;
  pointer-events: auto;
}
.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}
.zoom-btn:hover { background: rgba(255,255,255,0.15); }
.zoom-label {
  font-size: 11px;
  color: #fff;
  min-width: 36px;
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
  color: #999;
  font-size: 14px;
  pointer-events: none;
}
</style>
