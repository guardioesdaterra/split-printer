<template>
  <div class="controls">
    <h3 class="section-title">Grid</h3>
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
      <span>Page size</span><span>A4 (210 × 297 mm)</span>
      <span>Resolution</span><span>300 DPI</span>
      <span>Total area</span><span>{{ (cols * 210).toFixed(0) }} × {{ (rows * 297).toFixed(0) }} mm</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ rows: Number, cols: Number, overlap: Number })
defineEmits(['update:rows', 'update:cols', 'update:overlap'])
const clamp = v => Math.max(1, Math.min(20, v || 1))
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
.control-row input {
  width: 64px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg1);
  color: var(--text);
  text-align: center;
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
