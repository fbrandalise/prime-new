<script setup>
import { ref, computed } from 'vue'
import Popover from 'primevue/popover'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import { useAppSettings } from '@/composables/useAppSettings'

const popoverRef = ref(null)

const { fontSize, spacing, colorScheme, darkMode } = useAppSettings()

const fontOptions    = [{ label: 'P', value: 'small' }, { label: 'M', value: 'medium' }, { label: 'G', value: 'large' }]
const spacingOptions = [{ label: 'P', value: 'small' }, { label: 'M', value: 'medium' }, { label: 'G', value: 'large' }]

const schemes = [
  { id: 'floresta',   name: 'Floresta',   sidebar: '#043329', content: '#F2F1ED' },
  { id: 'bege',       name: 'Bege',       sidebar: '#043329', content: '#F9FFE5' },
  { id: 'menta',      name: 'Menta',      sidebar: '#043329', content: '#D1FFD1' },
  { id: 'neon',       name: 'Neon',       sidebar: '#00F070', content: '#F2F1ED' },
  { id: 'neon-bege',  name: 'Neon Bege',  sidebar: '#00F070', content: '#F9FFE5' },
  { id: 'neon-menta', name: 'Neon Menta', sidebar: '#00F070', content: '#D1FFD1' },
  { id: 'preto',      name: 'Preto',      sidebar: '#151515', content: '#F9FFE5' },
  { id: 'escuro',     name: 'Escuro',     sidebar: '#151515', content: '#1A2A1F' },
]

// O toggle reflete o estado real (incluindo quando "Escuro" está ativo)
const isDarkEffective = computed(() => darkMode.value || colorScheme.value === 'escuro')

function toggleDark(val) {
  // Não permite desligar dark mode enquanto está no esquema "Escuro"
  if (colorScheme.value === 'escuro') return
  darkMode.value = val
}

defineExpose({
  toggle: (event) => popoverRef.value?.toggle(event)
})
</script>

<template>
  <Popover ref="popoverRef" class="app-settings-popover" :pt="{ root: { class: 'settings-popover-root' } }">
    <div class="settings-panel">

      <!-- Tema de cores -->
      <div class="settings-section">
        <p class="settings-label">Tema de cores</p>
        <div class="scheme-grid">
          <button
            v-for="s in schemes"
            :key="s.id"
            class="scheme-swatch"
            :class="{ 'is-active': colorScheme === s.id }"
            :title="s.name"
            @click="colorScheme = s.id"
          >
            <span class="swatch-preview">
              <span class="swatch-sidebar" :style="{ background: s.sidebar }" />
              <span class="swatch-content" :style="{ background: s.content }" />
            </span>
            <span class="swatch-name">{{ s.name }}</span>
            <span v-if="colorScheme === s.id" class="swatch-check">
              <i class="pi pi-check" />
            </span>
          </button>
        </div>
      </div>

      <div class="settings-divider" />

      <!-- Tamanho de fonte -->
      <div class="settings-section settings-row">
        <p class="settings-label">Tamanho de fonte</p>
        <SelectButton
          v-model="fontSize"
          :options="fontOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="settings-select-btn"
        />
      </div>

      <!-- Espaçamento de listagens -->
      <div class="settings-section settings-row">
        <p class="settings-label">Espaçamento</p>
        <SelectButton
          v-model="spacing"
          :options="spacingOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="settings-select-btn"
        />
      </div>

      <div class="settings-divider" />

      <!-- Modo escuro -->
      <div class="settings-section settings-row">
        <div>
          <p class="settings-label">Modo escuro</p>
          <p v-if="colorScheme === 'escuro'" class="settings-hint">Ativo pelo tema Escuro</p>
        </div>
        <ToggleSwitch
          :model-value="isDarkEffective"
          :disabled="colorScheme === 'escuro'"
          @update:model-value="toggleDark"
        />
      </div>

    </div>
  </Popover>
</template>

<style scoped>
.settings-panel {
  width: 15rem;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
}

.settings-section {
  padding: 0.5rem 1rem;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.settings-label {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-row .settings-label {
  margin: 0;
}

.settings-hint {
  margin: 0.125rem 0 0;
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  font-style: italic;
}

.settings-divider {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

/* ── Esquemas de cor ─────────────────────────────────────────────────── */
.scheme-grid {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.scheme-swatch {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: 2px solid var(--p-surface-border);
  border-radius: 8px;
  padding: 0.25rem;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  outline: none;
  width: 2.75rem;
}

.scheme-swatch:hover {
  border-color: var(--bling-green);
  transform: translateY(-1px);
}

.scheme-swatch.is-active {
  border-color: var(--bling-green);
}

.swatch-preview {
  display: flex;
  width: 100%;
  height: 1.75rem;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.swatch-sidebar {
  width: 35%;
  flex-shrink: 0;
}

.swatch-content {
  flex: 1;
}

.swatch-name {
  font-size: 0.5625rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  text-align: center;
  line-height: 1;
}

.swatch-check {
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  background: var(--bling-green);
  color: #0D3828;
  border-radius: 50%;
  width: 0.875rem;
  height: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.4375rem;
}

/* ── SelectButton sobreescrito ─────────────────────────────────────── */
.settings-select-btn :deep(.p-selectbutton .p-button) {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  min-width: 1.75rem;
}
</style>
