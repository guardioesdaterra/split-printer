<template>
  <div class="thumbnails-wrap">
    <div class="thumb-header">
      <h3>Pages ({{ total }})</h3>
      <div class="thumb-actions">
        <button class="btn" :disabled="!hasImage" @click="$emit('download-all-png')">All PNG</button>
        <button class="btn" :disabled="!hasImage" @click="$emit('download-all-pdf')">All PDF</button>
        <button class="btn primary" :disabled="!hasImage" @click="$emit('download-merged')">Merged PDF</button>
      </div>
    </div>
    <div class="thumb-grid">
      <div v-for="i in total" :key="i" class="thumb-item">
        <div class="thumb-label">Page {{ i }}</div>
        <canvas :ref="el => setRef(i - 1, el)" width="0" height="0"></canvas>
        <div class="thumb-btns">
          <button class="btn sm" @click="$emit('download-png', i - 1)">PNG</button>
          <button class="btn sm" @click="$emit('download-pdf', i - 1)">PDF</button>
        </div>
      </div>
      <div v-if="!hasImage" class="empty-thumbs">Upload an image to preview pages</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { A4_H, A4_W, computeGrid, extractCanvas } from '../utils/geometry.js'

const props = defineProps({ image: Object, rows: Number, cols: Number, overlap: Number })
defineEmits(['download-png', 'download-pdf', 'download-all-png', 'download-all-pdf', 'download-merged'])

const total = computed(() => props.rows * props.cols)
const hasImage = computed(() => !!props.image && total.value > 0)

const TW = 160
const TH = Math.round(TW * (A4_H / A4_W))
const canvasRefs = ref([])

function setRef(i, el) {
  if (el) canvasRefs.value[i] = el
}

function render() {
  if (!props.image || total.value === 0) return
  const geom = computeGrid(props.image.width, props.image.height, props.rows, props.cols)
  for (let i = 0; i < total.value; i++) {
    const canvas = canvasRefs.value[i]
    if (!canvas) continue
    const r = Math.floor(i / props.cols)
    const c = i % props.cols
    const src = extractCanvas(props.image, r, c, props.rows, props.cols, props.overlap, geom, TW, TH)
    if (src) {
      canvas.width = src.width
      canvas.height = src.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(src, 0, 0)
    }
  }
}

watch(() => [props.image, props.rows, props.cols, props.overlap], () => nextTick(render), { deep: false })
</script>

<style scoped>
.thumbnails-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.thumb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.thumb-header h3 {
  font-size: 13px;
  font-weight: 600;
}
.thumb-actions {
  display: flex;
  gap: 4px;
}
.btn {
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg1);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn.primary:hover:not(:disabled) { filter: brightness(1.1); color: #fff; }
.btn.sm { padding: 3px 8px; font-size: 11px; }
.thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
}
.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--bg2);
  border-radius: 8px;
  padding: 8px;
}
.thumb-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.thumb-item canvas {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.thumb-btns { display: flex; gap: 4px; }
.empty-thumbs {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  color: var(--muted);
  font-size: 13px;
}
</style>
