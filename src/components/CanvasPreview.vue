<template>
  <div ref="containerRef" class="canvas-wrap" @wheel.prevent="onWheel">
    <canvas ref="canvasRef" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp"></canvas>
    <div class="zoom-badge">{{ (zoom * 100).toFixed(0) }}%</div>
    <div v-if="!image" class="placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      <span>Upload an image to preview</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { A4_W, A4_H, computeGrid } from '../utils/geometry.js'

const props = defineProps({ image: Object, rows: Number, cols: Number, overlap: Number })

const canvasRef = ref(null)
const containerRef = ref(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
let dragging = false
let lastX = 0, lastY = 0
let rafId = null

const geom = computed(() => {
  if (!props.image) return null
  return computeGrid(props.image.width, props.image.height, props.rows, props.cols)
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

  // background
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, rect.width, rect.height)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(dScale, dScale)
  ctx.translate(-g.gridW / 2, -g.gridH / 2)

  // grid background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, g.gridW, g.gridH)

  // image
  ctx.drawImage(props.image, g.offX, g.offY, g.scaledW, g.scaledH)

  // grid lines
  ctx.strokeStyle = '#e53e3e'
  ctx.lineWidth = 1.5 / dScale
  for (let r = 0; r <= props.rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * A4_H); ctx.lineTo(g.gridW, r * A4_H); ctx.stroke()
  }
  for (let c = 0; c <= props.cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * A4_W, 0); ctx.lineTo(c * A4_W, g.gridH); ctx.stroke()
  }

  // page numbers
  const fs = Math.min(A4_W, A4_H) * 0.08 / dScale
  ctx.font = `bold ${fs}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let r = 0; r < props.rows; r++) {
    for (let c = 0; c < props.cols; c++) {
      const n = r * props.cols + c + 1
      const px = (c + 0.5) * A4_W
      const py = (r + 0.5) * A4_H
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

watch([() => props.image, () => props.rows, () => props.cols, () => props.overlap, zoom, panX, panY], scheduleRender, { deep: false })

onMounted(() => {
  scheduleRender()
  window.addEventListener('resize', scheduleRender)
})
onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
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
  const delta = -e.deltaY * 0.001
  const newZoom = Math.max(0.1, Math.min(10, zoom.value * (1 + delta)))
  const rect = containerRef.value.getBoundingClientRect()
  const mx = e.clientX - rect.left - rect.width / 2
  const my = e.clientY - rect.top - rect.height / 2
  const ratio = newZoom / zoom.value
  panX.value = mx - ratio * (mx - panX.value)
  panY.value = my - ratio * (my - panY.value)
  zoom.value = newZoom
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
}
.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}
.canvas-wrap canvas:active { cursor: grabbing; }
.zoom-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
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
