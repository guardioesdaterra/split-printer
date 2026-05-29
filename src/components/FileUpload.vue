<template>
  <div
    class="upload-area"
    :class="{ 'drag-over': isDragover, 'has-file': file }"
    @dragover.prevent="isDragover = true"
    @dragleave.prevent="isDragover = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/bmp,application/pdf"
      hidden
      @change="onFile"
    />
    <div class="upload-content" @click="inputRef.click()">
      <svg v-if="!file" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <div v-if="!file" class="upload-text">
        <strong>Drop an image or PDF here</strong>
        <span class="sub">or click to browse — PNG, JPG, WEBP, PDF</span>
      </div>
      <div v-else class="upload-text">
        <strong>{{ file.name }}</strong>
        <span class="sub">{{ infoText }}</span>
      </div>
    </div>
    <button v-if="file" class="remove-btn" @click.stop="$emit('remove')">&times;</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ file: Object, infoText: String })
const emit = defineEmits(['file', 'remove'])
const inputRef = ref(null)
const isDragover = ref(false)

function onFile(e) {
  const f = e.target.files?.[0]
  if (f) emit('file', f)
  isDragover.value = false
}
function onDrop(e) {
  const f = e.dataTransfer.files?.[0]
  if (f) emit('file', f)
  isDragover.value = false
}
</script>

<style scoped>
.upload-area {
  position: relative;
  border: 2px dashed var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg2);
}
.upload-area:hover, .drag-over {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg2));
}
.upload-area.has-file {
  border-style: solid;
  border-color: var(--accent);
}
.upload-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.upload-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.upload-text strong {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 12px;
  color: var(--muted);
}
.remove-btn {
  position: absolute;
  top: 6px;
  right: 8px;
  background: none;
  border: none;
  font-size: 20px;
  color: var(--muted);
  cursor: pointer;
  line-height: 1;
}
.remove-btn:hover { color: var(--text); }
</style>
