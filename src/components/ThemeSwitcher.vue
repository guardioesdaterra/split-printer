<template>
  <div class="theme-switcher">
    <button
      v-for="t in themes"
      :key="t.key"
      class="theme-btn"
      :class="{ active: current === t.key }"
      :title="t.label"
      @click="set(t.key)"
    >
      <span v-html="t.icon"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const current = ref('system')

const themes = [
  { key: 'light', label: 'Light', icon: '&#9788;' },
  { key: 'dark', label: 'Dark', icon: '&#9790;' },
  { key: 'system', label: 'System', icon: '&#9881;' },
]

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved) current.value = saved
  apply(current.value)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => { if (current.value === 'system') apply('system') })
})

function set(key) {
  current.value = key
  localStorage.setItem('theme', key)
  apply(key)
}

function apply(key) {
  const isDark = key === 'dark' || (key === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}
</script>

<style scoped>
.theme-switcher {
  display: flex;
  border: var(--border-w) solid var(--border);
}
.theme-btn {
  padding: 4px 10px;
  background: var(--bg);
  color: var(--text);
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: none;
}
.theme-btn + .theme-btn {
  border-left: var(--border-w) solid var(--border);
}
.theme-btn.active {
  background: var(--text);
  color: var(--bg);
}
</style>
