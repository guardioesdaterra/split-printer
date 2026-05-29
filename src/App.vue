<template>
  <div class="app" :class="{ 'sidebar-open': sidebarOpen }" tabindex="-1" @keydown="onKey">
    <header class="app-header">
      <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
      <h1>Poster Splitter</h1>
      <span class="subtitle">Split any image into printable pages</span>
      <div class="header-spacer"></div>
      <button
        class="icon-btn"
        :title="thumbCollapsed ? 'Show pages' : 'Hide pages'"
        @click="thumbCollapsed = !thumbCollapsed"
      >{{ thumbCollapsed ? '&#9650;' : '&#9660;' }}</button>
      <ThemeSwitcher />
    </header>

    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <div class="app-body">
      <aside class="sidebar">
        <FileUpload
          :file="file"
          :info-text="fileInfo"
          @file="onFile"
          @remove="resetFile"
        />

        <template v-if="pdfPageCount > 1">
          <h3 class="section-title">PDF Page</h3>
          <div class="control-row">
            <label>Page</label>
            <div class="with-unit">
              <input type="number" :value="pdfPageIndex + 1" @input="e => loadPDFPage(Number(e.target.value) - 1)" min="1" :max="pdfPageCount" />
              <span class="unit">/ {{ pdfPageCount }}</span>
            </div>
          </div>
        </template>

        <GridControls
          :rows="rows"
          :cols="cols"
          :overlap="overlap"
          :page-size="pageSize"
          :orientation="orientation"
          :dpi="dpi"
          @update:rows="rows = $event"
          @update:cols="cols = $event"
          @update:overlap="overlap = $event"
          @update:page-size="pageSize = $event"
          @update:orientation="orientation = $event"
          @update:dpi="dpi = $event"
        />

        <div class="sidebar-info">
          <div v-if="image" class="image-info">
            <span>{{ imageInfo.width }}x{{ imageInfo.height }}px</span>
            <span>{{ (imageInfo.width / imageInfo.height).toFixed(2) }} ratio</span>
          </div>
          <div class="shortcuts-hint">
            <span><kbd>R</kbd> reset view</span>
            <span><kbd>D</kbd> reset crop</span>
            <span><kbd>Ctrl</kbd>+<kbd>wheel</kbd> zoom</span>
          </div>
        </div>

        <div class="sidebar-actions">
          <button class="btn primary w-full" :disabled="!image" @click="downloadAllPNG">Download All PNG</button>
          <button class="btn w-full" :disabled="!image" @click="downloadAllPDF">Download All PDF</button>
          <button class="btn w-full" :disabled="!image" @click="downloadMerged">Merged PDF</button>
        </div>
      </aside>

      <main class="main">
        <div class="canvas-area">
          <CanvasPreview
            :image="image"
            :rows="rows"
            :cols="cols"
            :overlap="overlap"
            :page-w="pageDims.w"
            :page-h="pageDims.h"
            :align-off-x="alignOffX"
            :align-off-y="alignOffY"
            @update:align-off-x="alignOffX = $event"
            @update:align-off-y="alignOffY = $event"
          />
        </div>

        <div
          v-if="!thumbCollapsed"
          class="split-handle"
          @mousedown="onSplitDown"
          title="Drag to resize"
        ></div>

        <div
          v-if="!thumbCollapsed"
          class="thumbs-area"
          :style="{ height: thumbHeight + 'px' }"
        >
          <PageThumbnails
            :image="image"
            :rows="rows"
            :cols="cols"
            :overlap="overlap"
            :page-w="pageDims.w"
            :page-h="pageDims.h"
            :align-off-x="alignOffX"
            :align-off-y="alignOffY"
            @download-png="downloadPagePNG"
            @download-pdf="downloadPagePDF"
            @download-all-png="downloadAllPNG"
            @download-all-pdf="downloadAllPDF"
            @download-merged="downloadMerged"
          />
        </div>
      </main>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import FileUpload from './components/FileUpload.vue'
import GridControls from './components/GridControls.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import PageThumbnails from './components/PageThumbnails.vue'
import ThemeSwitcher from './components/ThemeSwitcher.vue'
import { computeGrid, extractCanvas, getPageDims, pxAtDpi } from './utils/geometry.js'
import { downloadPNG, downloadPDF, downloadAllZIP, downloadMergedPDF } from './utils/downloader.js'

const file = ref(null)
const image = ref(null)
const rows = ref(3)
const cols = ref(3)
const overlap = ref(0)
const pageSize = ref('A4')
const orientation = ref('portrait')
const dpi = ref(300)
const imageInfo = ref({ width: 0, height: 0, name: '' })
const loading = ref(false)
const loadingText = ref('')
const alignOffX = ref(0)
const alignOffY = ref(0)

const fileInfo = ref('')
const sidebarOpen = ref(false)
const pdfDoc = ref(null)
const pdfPageCount = ref(0)
const pdfPageIndex = ref(0)
let pdfFileData = null

const thumbCollapsed = ref(false)
const thumbHeight = ref(200)
let resizing = false
let resizeStartY = 0
let resizeStartH = 0

const pageDims = computed(() => getPageDims(pageSize.value, orientation.value))

function onSplitDown(e) {
  resizing = true
  resizeStartY = e.clientY
  resizeStartH = thumbHeight.value
  document.addEventListener('mousemove', onSplitMove)
  document.addEventListener('mouseup', onSplitUp)
}

function onSplitMove(e) {
  if (!resizing) return
  const main = document.querySelector('.main')
  if (!main) return
  const mainRect = main.getBoundingClientRect()
  const canvasAreaEl = document.querySelector('.canvas-area')
  const canvasH = canvasAreaEl?.getBoundingClientRect().height ?? 200
  const maxH = mainRect.height - 40
  const minH = 60
  const newH = Math.max(minH, Math.min(maxH, resizeStartH - (e.clientY - resizeStartY)))
  thumbHeight.value = newH
}

function onSplitUp() {
  resizing = false
  document.removeEventListener('mousemove', onSplitMove)
  document.removeEventListener('mouseup', onSplitUp)
}

async function onFile(f) {
  file.value = f
  loading.value = true
  loadingText.value = 'Loading\u2026'
  alignOffX.value = 0
  alignOffY.value = 0
  try {
    if (f.type === 'application/pdf') {
      loadingText.value = 'Rendering PDF\u2026'
      await loadPDF(f)
    } else if (f.type.startsWith('image/')) {
      pdfDoc.value = null
      pdfPageCount.value = 0
      pdfPageIndex.value = 0
      pdfFileData = null
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
        fileInfo.value = `${img.width}x${img.height}px`
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
  pdfFileData = buf
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  pdfDoc.value = pdf
  pdfPageCount.value = pdf.numPages
  pdfPageIndex.value = 0
  await renderPDFPage(0)
}

async function renderPDFPage(index) {
  if (!pdfDoc.value) return
  loading.value = true
  loadingText.value = `Rendering page ${index + 1}\u2026`
  try {
    const page = await pdfDoc.value.getPage(index + 1)
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

    pdfPageIndex.value = index
    image.value = img
    imageInfo.value = { width: img.width, height: img.height, name: file.value.name }
    fileInfo.value = `PDF p.${index + 1}/${pdfPageCount.value} ${img.width}x${img.height}px`
  } finally {
    loading.value = false
  }
}

async function loadPDFPage(index) {
  if (index >= 0 && index < pdfPageCount.value) {
    await renderPDFPage(index)
  }
}

function resetFile() {
  file.value = null
  image.value = null
  imageInfo.value = { width: 0, height: 0, name: '' }
  fileInfo.value = ''
  pdfDoc.value = null
  pdfPageCount.value = 0
  pdfPageIndex.value = 0
  pdfFileData = null
  alignOffX.value = 0
  alignOffY.value = 0
}

function prefix() {
  const base = imageInfo.value.name?.replace(/\.[^.]+$/, '') || 'poster'
  const p = pdfPageCount.value > 1 ? `_p${pdfPageIndex.value + 1}` : ''
  return `${base}${p}_${rows.value}x${cols.value}`
}

function extractAll() {
  if (!image.value) return []
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h, alignOffX.value, alignOffY.value)
  const tW = pxAtDpi(w, dpi.value)
  const tH = pxAtDpi(h, dpi.value)
  const result = []
  for (let r = 0; r < rows.value; r++)
    for (let c = 0; c < cols.value; c++)
      result.push(extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h))
  return result.filter(Boolean)
}

async function downloadPagePNG(i) {
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h, alignOffX.value, alignOffY.value)
  const r = Math.floor(i / cols.value), c = i % cols.value
  const tW = pxAtDpi(w, dpi.value)
  const tH = pxAtDpi(h, dpi.value)
  const canvas = extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h)
  if (canvas) downloadPNG(canvas, `${prefix()}_p${i + 1}.png`)
}

async function downloadPagePDF(i) {
  const { w, h } = pageDims.value
  const geom = computeGrid(image.value.width, image.value.height, rows.value, cols.value, w, h, alignOffX.value, alignOffY.value)
  const r = Math.floor(i / cols.value), c = i % cols.value
  const tW = pxAtDpi(w, dpi.value)
  const tH = pxAtDpi(h, dpi.value)
  const canvas = extractCanvas(image.value, r, c, rows.value, cols.value, overlap.value, geom, tW, tH, w, h)
  if (canvas) downloadPDF(canvas, `${prefix()}_p${i + 1}.pdf`, w, h)
}

async function downloadAllPNG() {
  const all = extractAll()
  if (all.length) {
    loading.value = true
    loadingText.value = 'Generating PNGs\u2026'
    await downloadAllZIP(all, prefix(), 'png')
    loading.value = false
  }
}

async function downloadAllPDF() {
  const all = extractAll()
  if (all.length) {
    loading.value = true
    loadingText.value = 'Generating PDFs\u2026'
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
  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault()
    alignOffX.value = 0
    alignOffY.value = 0
  }
  if (e.key === 'Escape' && sidebarOpen.value) {
    sidebarOpen.value = false
  }
}
</script>

<style>
:root {
  --bg: #ffffff;
  --bg-alt: #f0f0f0;
  --text: #000000;
  --text-muted: #666666;
  --text-inverse: #ffffff;
  --border: #000000;
  --border-w: 3px;
  --border-r: 0px;
  --shadow: 4px 4px 0px 0px #000000;
  --font: 'Courier New', Courier, monospace;
  --header-h: 52px;
  --sidebar-w: 270px;
}
[data-theme="dark"] {
  --bg: #000000;
  --bg-alt: #1a1a1a;
  --text: #ffffff;
  --text-muted: #888888;
  --text-inverse: #000000;
  --border: #ffffff;
  --shadow: 4px 4px 0px 0px #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #000000;
    --bg-alt: #1a1a1a;
    --text: #ffffff;
    --text-muted: #888888;
    --text-inverse: #000000;
    --border: #ffffff;
    --shadow: 4px 4px 0px 0px #ffffff;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
}
::selection { background: var(--text); color: var(--bg); }
input, select, button { font-family: var(--font); }
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
  height: var(--header-h);
  padding: 0 16px;
  background: var(--bg);
  border-bottom: var(--border-w) solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.app-header h1 {
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
}
.app-header .subtitle {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font);
}
.header-spacer { flex: 1; }
.menu-btn {
  display: none;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-size: 18px;
  cursor: pointer;
  padding: 2px 8px;
  font-family: var(--font);
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  cursor: pointer;
  font-size: 14px;
  font-family: var(--font);
}
.icon-btn:hover { background: var(--text); color: var(--bg); }

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg);
  border-right: var(--border-w) solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.image-info {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  font-family: var(--font);
  color: var(--text-muted);
  text-align: center;
}
.shortcuts-hint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  font-family: var(--font);
  color: var(--text-muted);
  text-align: center;
}
.shortcuts-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 10px;
  font-family: var(--font);
  font-weight: 700;
  background: var(--bg);
  color: var(--text);
  border: 2px solid var(--border);
}
.section-title {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font);
  color: var(--text);
  margin-top: 4px;
}
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.control-row label { font-size: 12px; font-family: var(--font); font-weight: 700; color: var(--text); }
.control-row input {
  width: 64px;
  padding: 4px 6px;
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.with-unit { display: flex; align-items: center; gap: 4px; }
.unit { font-size: 11px; font-family: var(--font); color: var(--text-muted); }
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
  background: var(--bg);
  color: var(--text);
  border: var(--border-w) solid var(--border);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
}
.btn:hover:not(:disabled) { background: var(--text); color: var(--bg); }
.btn:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
.btn.primary { background: var(--text); color: var(--bg); }
.btn.primary:hover:not(:disabled) { background: var(--bg); color: var(--text); }
.w-full { width: 100%; }

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Split handle */
.split-handle {
  flex-shrink: 0;
  height: 10px;
  cursor: ns-resize;
  background: var(--bg);
  border: var(--border-w) solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.split-handle::after {
  content: '\u2022\u2022\u2022';
  font-size: 10px;
  letter-spacing: 4px;
  color: var(--text);
  line-height: 1;
}

.thumbs-area {
  flex-shrink: 0;
  overflow-y: auto;
  min-height: 0;
  background: var(--bg-alt);
  border: var(--border-w) solid var(--border);
  padding: 8px;
}

/* Loading */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 100;
  color: var(--bg);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 700;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 4px solid var(--bg);
  border-top-color: var(--text);
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile */
@media (max-width: 768px) {
  .menu-btn { display: block; }
  .app-header .subtitle { display: none; }
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.2s;
    width: 280px;
    border-right: none;
    box-shadow: 6px 0 0 0 var(--border);
  }
  .sidebar-open .sidebar {
    transform: translateX(0);
  }
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0,0,0,0.4);
  }
}
@media (min-width: 769px) {
  .sidebar-overlay { display: none; }
}
</style>
