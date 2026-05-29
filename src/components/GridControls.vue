<template>
  <div class="controls">
    <h3 class="section-title">Page</h3>
    <div class="control-row">
      <label>Size</label>
      <select :value="pageSize" @change="$emit('update:pageSize', $event.target.value)">
        <option v-for="(s, k) in PAGE_SIZES" :key="k" :value="k">{{ s.label }} ({{ s.w }}x{{ s.h }})</option>
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
      <label>Cols</label>
      <input type="number" :value="cols" @input="e => $emit('update:cols', clamp(+e.target.value))" min="1" max="20" />
    </div>
    <div class="total-pages">{{ rows }}x{{ cols }} = {{ rows * cols }} pages</div>

    <h3 class="section-title">Output</h3>
    <div class="control-row">
      <label>DPI</label>
      <select :value="dpi" @change="$emit('update:dpi', Number($event.target.value))">
        <option :value="150">150</option>
        <option :value="300">300</option>
        <option :value="600">600</option>
      </select>
    </div>

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
      <span>Page</span><span>{{ dims.label }} {{ dims.w }}x{{ dims.h }}mm</span>
      <span>DPI</span><span>{{ dpi }}</span>
      <span>Area</span><span>{{ (cols * dims.w).toFixed(0) }}x{{ (rows * dims.h).toFixed(0) }}mm</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PAGE_SIZES, getPageDims } from '../utils/geometry.js'

const props = defineProps({ rows: Number, cols: Number, overlap: Number, pageSize: String, orientation: String, dpi: { type: Number, default: 300 } })
const emit = defineEmits(['update:rows', 'update:cols', 'update:overlap', 'update:pageSize', 'update:orientation', 'update:dpi'])

const clamp = v => Math.max(1, Math.min(20, v || 1))

const presets = [
  { label: '2x2', r: 2, c: 2 },
  { label: '3x3', r: 3, c: 3 },
  { label: '4x4', r: 4, c: 4 },
  { label: '2x3', r: 2, c: 3 },
  { label: '3x4', r: 3, c: 4 },
  { label: '1x2', r: 1, c: 2 },
  { label: '2x1', r: 2, c: 1 },
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
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
  margin-top: 12px;
  padding-bottom: 2px;
  border-bottom: var(--border-w) solid var(--border);
}
.section-title:first-child { margin-top: 0; }
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.control-row label {
  font-size: 12px;
  font-family: var(--font);
  font-weight: 700;
  color: var(--text);
}
.control-row input,
.control-row select {
  width: 72px;
  padding: 4px 6px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
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
  font-family: var(--font);
  color: var(--text-muted);
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.preset-btn {
  padding: 3px 8px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.preset-btn:hover { background: var(--text); color: var(--bg); }
.preset-btn.active {
  background: var(--text);
  color: var(--bg);
}
.toggle-group {
  display: flex;
}
.toggle-btn {
  padding: 4px 8px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.toggle-btn + .toggle-btn { border-left: none; }
.toggle-btn.active {
  background: var(--text);
  color: var(--bg);
}
.total-pages {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
  padding: 4px 0;
}
.info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 8px;
  font-size: 12px;
  font-family: var(--font);
}
.info-grid span:nth-child(odd) { color: var(--text-muted); }
.info-grid span:nth-child(even) { color: var(--text); }
</style>
