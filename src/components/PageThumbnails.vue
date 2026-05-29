<template>
  <div class="thumbs-wrap">
    <div class="thumbs-header">
      <span class="thumbs-title">Pages ({{ total }})</span>
      <div class="thumbs-actions">
        <button class="btn" :disabled="!hasImage" @click="$emit('download-all-png')">PNG</button>
        <button class="btn" :disabled="!hasImage" @click="$emit('download-all-pdf')">PDF</button>
        <button class="btn primary" :disabled="!hasImage" @click="$emit('download-merged')">Merged</button>
      </div>
    </div>
    <div class="thumbs-grid">
      <div v-for="i in total" :key="i" class="thumb-item">
        <div class="thumb-label">P{{ i }}</div>
        <canvas :ref="el => setRef(i - 1, el)" width="0" height="0"></canvas>
        <div class="thumb-btns">
          <button class="btn sm" @click="$emit('download-png', i - 1)">PNG</button>
          <button class="btn sm" @click="$emit('download-pdf', i - 1)">PDF</button>
        </div>
      </div>
      <div v-if="!hasImage" class="empty-thumbs">Upload an image</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { A4_W, A4_H, computeGrid, extractCanvas } from '../utils/geometry.js'

const props = defineProps({ image: Object, rows: Number, cols: Number, overlap: Number, pageW: { type: Number, default: A4_W }, pageH: { type: Number, default: A4_H }, alignOffX: { type: Number, default: 0 }, alignOffY: { type: Number, default: 0 } })
defineEmits(['download-png', 'download-pdf', 'download-all-png', 'download-all-pdf', 'download-merged'])

const total = computed(() => props.rows * props.cols)
const hasImage = computed(() => !!props.image && total.value > 0)

const TW = 140
const TH = computed(() => Math.round(TW * (props.pageH / props.pageW)))
const canvasRefs = ref([])

function setRef(i, el) {
  if (el) canvasRefs.value[i] = el
}

function render() {
  if (!props.image || total.value === 0) return
  const geom = computeGrid(props.image.width, props.image.height, props.rows, props.cols, props.pageW, props.pageH, props.alignOffX, props.alignOffY)
  for (let i = 0; i < total.value; i++) {
    const canvas = canvasRefs.value[i]
    if (!canvas) continue
    const r = Math.floor(i / props.cols)
    const c = i % props.cols
    const th = TH.value
    const src = extractCanvas(props.image, r, c, props.rows, props.cols, props.overlap, geom, TW, th, props.pageW, props.pageH)
    if (src) {
      canvas.width = src.width
      canvas.height = src.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(src, 0, 0)
    }
  }
}

watch(() => [props.image, props.rows, props.cols, props.overlap, props.pageW, props.pageH, () => props.alignOffX, () => props.alignOffY], () => nextTick(render), { deep: false })
</script>

<style scoped>
.thumbs-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.thumbs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.thumbs-title {
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
}
.thumbs-actions {
  display: flex;
  gap: 4px;
}
.btn {
  padding: 4px 10px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
}
.btn:hover:not(:disabled) { background: var(--text); color: var(--bg); }
.btn:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
.btn.primary { background: var(--text); color: var(--bg); }
.btn.primary:hover:not(:disabled) { background: var(--bg); color: var(--text); }
.btn.sm { padding: 2px 8px; font-size: 10px; box-shadow: none; }
.thumbs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
}
.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: var(--border-w) solid var(--border);
  padding: 8px;
  box-shadow: var(--shadow);
}
.thumb-label {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
}
.thumb-item canvas {
  display: block;
  max-width: 100%;
  height: auto;
}
.thumb-btns { display: flex; gap: 4px; }
.empty-thumbs {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-family: var(--font);
  font-size: 13px;
}
</style>
