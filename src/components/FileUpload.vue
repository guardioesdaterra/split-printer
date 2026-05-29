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
      <span v-if="!file" class="upload-icon">&#128190;</span>
      <div v-if="!file" class="upload-text">
        <strong>Drop or click</strong>
        <span class="sub">PNG, JPG, WEBP, PDF</span>
      </div>
      <div v-else class="upload-text">
        <strong>{{ file.name }}</strong>
        <span class="sub">{{ infoText }}</span>
      </div>
    </div>
    <button v-if="file" class="remove-btn" @click.stop="$emit('remove')">x</button>
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
  border: var(--border-w) dashed var(--border);
  cursor: pointer;
  background: var(--bg);
}
.upload-area:hover, .drag-over {
  background: var(--text);
  color: var(--bg);
}
.upload-area:hover .upload-text strong,
.upload-area:hover .upload-text .sub,
.drag-over .upload-text strong,
.drag-over .upload-text .sub {
  color: var(--bg);
}
.upload-area.has-file {
  border-style: solid;
}
.upload-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.upload-icon {
  font-size: 32px;
  line-height: 1;
}
.upload-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.upload-text strong {
  font-size: 13px;
  font-family: var(--font);
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 11px;
  font-family: var(--font);
  color: var(--text-muted);
}
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--text);
  color: var(--bg);
  border: none;
  font-family: var(--font);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
