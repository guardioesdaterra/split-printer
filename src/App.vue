<template>
  <div class="app" tabindex="-1" @keydown="onKey">
    <header class="app-header">
      <h1>Poster Splitter</h1>
      <span class="subtitle">Split any image into pages for large-format printing</span>
    </header>

    <div class="app-body">
      <aside class="sidebar">
        <FileUpload
          :file="file"
          :info-text="fileInfo"
          @file="onFile"
          @remove="resetFile"
        />

        <GridControls
          :rows="rows"
          :cols="cols"
          :overlap="overlap"
          :page-size="pageSize"
          :orientation="orientation"
          @update:rows="rows = $event"
          @update:cols="cols = $event"
          @update:overlap="overlap = $event"
          @update:page-size="pageSize = $event"
          @update:orientation="orientation = $event"
        />

        <div class="sidebar-actions">
          <button class="btn primary w-full" :disabled="!image" @click="downloadAllPNG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download All PNG
          </button>
          <button class="btn w-full" :disabled="!image" @click="downloadAllPDF">
            Download All PDF
          </button>
          <button class="btn w-full" :disabled="!image" @click="downloadMerged">
            Merged PDF
          </button>
        </div>

        <div v-if="image" class="image-info">
          <span>{{ imageInfo.width }} &times; {{ imageInfo.height }} px</span>
          <span>{{ (imageInfo.width / imageInfo.height).toFixed(2) }} aspect</span>
        </div>

        <div class="shortcuts-hint">
          <span><kbd>R</kbd> reset view</span>
          <span><kbd>0</kbd> fit zoom</span>
        </div>
      </aside>

      <main class="main">
        <CanvasPreview
          :image="image"
          :rows="rows"
          :cols="cols"
          :overlap="overlap"
          :page-w="pageDims.w"
          :page-h="pageDims.h"
        />

        <PageThumbnails
          :image="image"
          :rows="rows"
          :cols="cols"
          :overlap="overlap"
          :page-w="pageDims.w"
          :page-h="pageDims.h"
          @download-png="downloadPagePNG"
          @download-pdf="downloadPagePDF"
          @download-all-png="downloadAllPNG"
          @download-all-pdf="downloadAllPDF"
          @download-merged="downloadMerged"
        />
      </main>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>{{ loadingText }}</span>
      <span v-if="downloadProgress" class="progress-text">{{ downloadProgress }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FileUpload from './components/FileUpload.vue'
import GridControls from './components/GridControls.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import PageThumbnails from './components/PageThumbnails.vue'
import { A4_PX_300_W, A4_PX_300_H, computeGrid, extractCanvas, getPageDims } from './utils/geometry.js'
import { downloadPNG, downloadPDF, downloadAllZIP, downloadMergedPDF } from './utils/downloader.js'

const file = ref(null)
const image = ref(null)
const rows = ref(3)
const cols = ref(3)
const overlap = ref(0)
const pageSize = ref('A4')
const orientation = ref('portrait')
const imageInfo = ref({ width: 0, height: 0, name: '' })
const loading = ref(false)
const loadingText = ref('')
const downloadProgress = ref('')

const fileInfo = ref('')

const pageDims = computed(() => getPageDims(pageSize.value, orientation.value))

async function onFile(f) {
  file.value = f
  loading.value = true
  loadingText.value = 'Loading\u2026'
  try {
    if (f.type === 'application/pdf') {
      loadingText.value = 'Rendering PDF\u2026'
      await loadPDF(f)
    } else if (f.type.startsWith('image/')) {
      await loadImage(f)
    } else {
      throw new Error('Unsupported format')
    }
  } catch (e) {
    file.value = null
    image.value = null
    imageInfo.value = { width: 0, height: 0, name: '' }
    fileInfo.value = 'Error: ' + e.message
  } finally {
    loading.value = false
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        image.value = img
        imageInfo.value = { width: img.width, height: img.height, name: file.name }
        fileInfo.value = `${img.width} \u00d7 ${img.height} px`
        resolve()
      }
      img.onerror = () => reject(new Error('Invalid image file'))
      img.src = e.target.result
    }
    r.onerror = () => reject(new Error('Failed to read file'))
    r.readAsDataURL(file)
  })
}

async function loadPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const page = await pdf.getPage(1)
  const vp = page.getViewport({ scale: 2 })

  const c = document.createElement('canvas')
  c.width = vp.width
  c.height = vp.height
  const ctx = c.getContext('2d')
  await page.render({ canvasContext: ctx, viewport: vp }).promise

  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('PDF render failed'))
    img.src = c.toDataURL('image/png')
  })

  image.value = img
  imageInfo.value = { width: img.width, height: img.height, name: file.name }
  fileInfo.value = `PDF \u2192 ${img.width} \u00d7 ${img.height} px`
}

function resetFile() {
  file.value = null
  image.value = null
  imageInfo.value = { width: 0, height: 0, name: '' }
  fileInfo.value = ''
}

function prefix() {
  const base = imageInfo.value.name?.replace(/\.[^.]+$/, '') || 'poster'
  return `${base}_${rows.value}x${cols.value}`
}

function extractAll() {
  if (!image.value) return []
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h)
  const tW = Math.round(w / 25.4 * 300)
  const tH = Math.round(h / 25.4 * 300)
  const result = []
  for (let r = 0; r < rows.value; r++)
    for (let c = 0; c < cols.value; c++)
      result.push(extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h))
  return result.filter(Boolean)
}

async function downloadPagePNG(i) {
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h)
  const r = Math.floor(i / cols.value), c = i % cols.value
  const tW = Math.round(w / 25.4 * 300)
  const tH = Math.round(h / 25.4 * 300)
  const canvas = extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h)
  if (canvas) downloadPNG(canvas, `${prefix()}_p${i + 1}.png`)
}

async function downloadPagePDF(i) {
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h)
  const r = Math.floor(i / cols.value), c = i % cols.value
  const tW = Math.round(w / 25.4 * 300)
  const tH = Math.round(h / 25.4 * 300)
  const canvas = extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h)
  if (canvas) downloadPDF(canvas, `${prefix()}_p${i + 1}.pdf`, w, h)
}

async function downloadAllPNG() {
  const all = extractAll()
  if (all.length) {
    loading.value = true
    loadingText.value = 'Generating PNGs\u2026'
    downloadProgress.value = ''
    await downloadAllZIP(all, prefix(), 'png')
    loading.value = false
  }
}

async function downloadAllPDF() {
  const all = extractAll()
  if (all.length) {
    loading.value = true
    loadingText.value = 'Generating PDFs\u2026'
    downloadProgress.value = ''
    const { w, h } = pageDims.value
    await downloadAllZIP(all, prefix(), 'pdf', w, h)
    loading.value = false
  }
}

async function downloadMerged() {
  const all = extractAll()
  if (all.length) {
    loading.value = true
    loadingText.value = 'Generating merged PDF\u2026'
    downloadProgress.value = ''
    const { w, h } = pageDims.value
    await downloadMergedPDF(all, prefix(), w, h)
    loading.value = false
  }
}

function onKey(e) {
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('reset-view'))
  }
}
</script>

<style>
:root {
  --bg1: #ffffff;
  --bg2: #f5f5f5;
  --text: #1a1a1a;
  --muted: #888;
  --border: #ddd;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg1: #1a1a2e;
    --bg2: #16213e;
    --text: #e0e0e0;
    --muted: #888;
    --border: #333;
    --accent: #3b82f6;
    --accent-hover: #60a5fa;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg2);
  color: var(--text);
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  outline: none;
}
.app-header {
  padding: 12px 20px;
  background: var(--bg1);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-shrink: 0;
}
.app-header h1 {
  font-size: 16px;
  font-weight: 700;
}
.app-header .subtitle {
  font-size: 12px;
  color: var(--muted);
}
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg1);
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg1);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.btn:hover:not(:disabled) { border-color: var(--accent); }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
.w-full { width: 100%; }
.image-info {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
.shortcuts-hint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
.shortcuts-hint kbd {
  display: inline-block;
  padding: 1px 4px;
  font-size: 10px;
  font-family: inherit;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 3px;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
  min-width: 0;
}
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 100;
  color: #fff;
  font-size: 14px;
}
.progress-text {
  font-size: 12px;
  opacity: 0.8;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
