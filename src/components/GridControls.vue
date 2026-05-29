<template>
  <div class="controls">
    <h3 class="section-title">Page</h3>
    <div class="control-row">
      <label>Size</label>
      <select :value="pageSize" @change="$emit('update:pageSize', $event.target.value)">
        <option v-for="(s, k) in PAGE_SIZES" :key="k" :value="k">{{ s.label }} ({{ s.w }}×{{ s.h }})</option>
      </select>
    </div>
    <div class="control-row">
      <label>Orientation</label>
      <div class="toggle-group">
        <button class="toggle-btn" :class="{ active: orientation === 'portrait' }" @click="$emit('update:orientation', 'portrait')">Portrait</button>
        <button class="toggle-btn" :class="{ active: orientation === 'landscape' }" @click="$emit('update:orientation', 'landscape')">Landscape</button>
      </div>
    </div>

    <h3 class="section-title">Grid</h3>
    <div class="presets">
      <button v-for="p in presets" :key="p.label" class="preset-btn" :class="{ active: rows === p.r && cols === p.c }" @click="applyPreset(p.r, p.c)">{{ p.label }}</button>
    </div>
    <div class="control-row">
      <label>Rows</label>
      <input type="number" :value="rows" @input="e => $emit('update:rows', clamp(+e.target.value))" min="1" max="20" />
    </div>
    <div class="control-row">
      <label>Columns</label>
      <input type="number" :value="cols" @input="e => $emit('update:cols', clamp(+e.target.value))" min="1" max="20" />
    </div>
    <div class="total-pages">{{ rows * cols }} pages ({{ rows }} × {{ cols }})</div>

    <h3 class="section-title">Bleed</h3>
    <div class="control-row">
      <label>Overlap</label>
      <div class="with-unit">
        <input type="number" :value="overlap" @input="e => $emit('update:overlap', Math.max(0, +e.target.value || 0))" min="0" step="0.5" />
        <span class="unit">mm</span>
      </div>
    </div>

    <h3 class="section-title">Info</h3>
    <div class="info-grid">
      <span>Page size</span><span>{{ dims.label }} ({{ dims.w }} × {{ dims.h }} mm)</span>
      <span>Resolution</span><span>300 DPI</span>
      <span>Total area</span><span>{{ (cols * dims.w).toFixed(0) }} × {{ (rows * dims.h).toFixed(0) }} mm</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PAGE_SIZES, getPageDims } from '../utils/geometry.js'

const props = defineProps({ rows: Number, cols: Number, overlap: Number, pageSize: String, orientation: String })
const emit = defineEmits(['update:rows', 'update:cols', 'update:overlap', 'update:pageSize', 'update:orientation'])

const clamp = v => Math.max(1, Math.min(20, v || 1))

const presets = [
  { label: '2×2', r: 2, c: 2 },
  { label: '3×3', r: 3, c: 3 },
  { label: '4×4', r: 4, c: 4 },
  { label: '2×3', r: 2, c: 3 },
  { label: '3×4', r: 3, c: 4 },
  { label: '1×2', r: 1, c: 2 },
  { label: '2×1', r: 2, c: 1 },
]

const dims = computed(() => getPageDims(props.pageSize, props.orientation))

function applyPreset(r, c) {
  emit('update:rows', r)
  emit('update:cols', c)
}
</script>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-top: 8px;
}
.section-title:first-child { margin-top: 0; }
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.control-row label {
  font-size: 13px;
}
.control-row input,
.control-row select {
  width: 72px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg1);
  color: var(--text);
  text-align: center;
}
.control-row select {
  width: auto;
  min-width: 72px;
  text-align: left;
}
.with-unit {
  display: flex;
  align-items: center;
  gap: 4px;
}
.unit {
  font-size: 11px;
  color: var(--muted);
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.preset-btn {
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--bg1);
  color: var(--text);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover { border-color: var(--accent); }
.preset-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.toggle-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.toggle-btn {
  padding: 4px 10px;
  border: none;
  background: var(--bg1);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn.active {
  background: var(--accent);
  color: #fff;
}
.total-pages {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  padding: 4px 0;
}
.info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 12px;
  font-size: 12px;
}
.info-grid span:nth-child(odd) { color: var(--muted); }
</style>
