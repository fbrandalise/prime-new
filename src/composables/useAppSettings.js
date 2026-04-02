import { ref, watch } from 'vue'

// ── Estado singleton (compartilhado entre componentes) ─────────────────────────
const fontSize    = ref(localStorage.getItem('bling-font-size') || 'medium')
const spacing     = ref(localStorage.getItem('bling-spacing')   || 'medium')
const colorScheme = ref(localStorage.getItem('bling-scheme')    || 'floresta')
const darkMode    = ref(localStorage.getItem('bling-dark')      === 'true')

// ── Aplicar tudo no DOM ────────────────────────────────────────────────────────
function applyAll() {
  const html = document.documentElement
  html.setAttribute('data-font-size', fontSize.value)
  html.setAttribute('data-spacing',   spacing.value)
  html.setAttribute('data-scheme',    colorScheme.value)

  const isDark = darkMode.value || colorScheme.value === 'escuro'
  html.classList.toggle('dark-mode', isDark)
  html.dataset.agThemeMode = isDark ? 'dark' : 'light'
}

// Inicializar ao importar
applyAll()

// ── Watchers ───────────────────────────────────────────────────────────────────
watch(fontSize, v => {
  document.documentElement.setAttribute('data-font-size', v)
  localStorage.setItem('bling-font-size', v)
})

watch(spacing, v => {
  document.documentElement.setAttribute('data-spacing', v)
  localStorage.setItem('bling-spacing', v)
})

watch(colorScheme, v => {
  document.documentElement.setAttribute('data-scheme', v)
  localStorage.setItem('bling-scheme', v)
  // Esquema "escuro" força dark mode independente do toggle
  const isDark = darkMode.value || v === 'escuro'
  document.documentElement.classList.toggle('dark-mode', isDark)
  document.documentElement.dataset.agThemeMode = isDark ? 'dark' : 'light'
})

watch(darkMode, v => {
  document.documentElement.classList.toggle('dark-mode', v)
  document.documentElement.dataset.agThemeMode = v ? 'dark' : 'light'
  localStorage.setItem('bling-dark', String(v))
})

export function useAppSettings() {
  return { fontSize, spacing, colorScheme, darkMode }
}
