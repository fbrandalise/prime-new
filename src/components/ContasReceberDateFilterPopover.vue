<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Popover from 'primevue/popover'
import {
  buildContasReceberCarDateRange,
  isFullCalendarMonthRange,
} from '@/composables/usePeriodFilter'

const props = defineProps({
  summaryLabel: { type: String, default: '' },
  committedDateField: { type: String, default: 'vencimento' },
  committedPeriod: { type: String, default: 'mes' },
  committedDateRange: { type: Array, default: null },
})

const emit = defineEmits(['apply'])

const popoverRef = ref()
const draftDateField = ref('vencimento')
const draftPeriod = ref('mes')
/** @type {import('vue').Ref<[Date, Date] | null>} */
const draftDateRange = ref(null)
const showMonthPick = ref(false)
const monthAnchor = ref(new Date())
let presetSyncLock = false

const PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'estaSemana', label: 'Esta semana' },
  { id: 'semanaPassada', label: 'Semana passada' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mesPassado', label: 'Mês passado' },
  { id: 'selecionarMes', label: 'Selecionar mês' },
  { id: 'custom', label: 'Período customizado' },
]

const activePresetId = computed(() => {
  if (showMonthPick.value) return 'selecionarMes'
  if (draftPeriod.value) return draftPeriod.value
  if (!draftDateRange.value?.[0]) return 'mes'
  if (isFullCalendarMonthRange(draftDateRange.value[0], draftDateRange.value[1] ?? draftDateRange.value[0]))
    return 'selecionarMes'
  return 'custom'
})

function cloneRangeFromCommitted() {
  const { committedPeriod, committedDateRange } = props
  if (committedDateRange?.[0]) {
    return [
      new Date(committedDateRange[0]),
      new Date(committedDateRange[1] ?? committedDateRange[0]),
    ]
  }
  if (committedPeriod) {
    const r = buildContasReceberCarDateRange(committedPeriod)
    return r ? [new Date(r.from), new Date(r.to)] : null
  }
  const r = buildContasReceberCarDateRange('mes')
  return r ? [new Date(r.from), new Date(r.to)] : null
}

function syncDraftFromProps() {
  presetSyncLock = true
  draftDateField.value = props.committedDateField
  draftPeriod.value = props.committedDateRange?.[0] ? null : (props.committedPeriod || 'mes')
  draftDateRange.value = cloneRangeFromCommitted()
  showMonthPick.value = false
  monthAnchor.value = draftDateRange.value?.[0] ? new Date(draftDateRange.value[0]) : new Date()
  nextTick(() => {
    presetSyncLock = false
  })
}

watch(
  draftDateRange,
  () => {
    if (presetSyncLock) return
    draftPeriod.value = null
  },
  { deep: true },
)

function toggle(e) {
  syncDraftFromProps()
  popoverRef.value?.toggle(e)
}

function pickPreset(id) {
  if (id === 'selecionarMes') {
    showMonthPick.value = true
    presetSyncLock = true
    draftPeriod.value = null
    if (draftDateRange.value?.[0]) monthAnchor.value = new Date(draftDateRange.value[0])
    nextTick(() => {
      presetSyncLock = false
    })
    return
  }
  if (id === 'custom') {
    showMonthPick.value = false
    presetSyncLock = true
    draftPeriod.value = null
    if (!draftDateRange.value?.[0]) {
      const r = buildContasReceberCarDateRange('mes')
      draftDateRange.value = r ? [new Date(r.from), new Date(r.to)] : null
    }
    nextTick(() => {
      presetSyncLock = false
    })
    return
  }
  presetSyncLock = true
  draftPeriod.value = id
  const r = buildContasReceberCarDateRange(id)
  draftDateRange.value = r ? [new Date(r.from), new Date(r.to)] : null
  showMonthPick.value = false
  nextTick(() => {
    presetSyncLock = false
  })
}

function onMonthChosen(d) {
  if (!d) return
  const y = d.getFullYear()
  const m = d.getMonth()
  const from = new Date(y, m, 1)
  from.setHours(0, 0, 0, 0)
  const to = new Date(y, m + 1, 0)
  to.setHours(23, 59, 59, 999)
  presetSyncLock = true
  draftPeriod.value = null
  draftDateRange.value = [from, to]
  showMonthPick.value = false
  nextTick(() => {
    presetSyncLock = false
  })
}

function cancel() {
  popoverRef.value?.hide()
}

function apply() {
  let period = draftPeriod.value
  let dateRange = draftPeriod.value ? null : draftDateRange.value

  if (!period && (!dateRange?.[0])) {
    period = 'mes'
    dateRange = null
  }

  emit('apply', {
    dateField: draftDateField.value,
    period,
    dateRange,
  })
  popoverRef.value?.hide()
}

</script>

<template>
  <div class="car-df-wrap">
    <Button
      type="button"
      class="car-datepicker car-date-filter-trigger"
      :label="summaryLabel"
      icon="pi pi-calendar"
      severity="secondary"
      outlined
      @click="toggle"
    />
    <Popover
      ref="popoverRef"
      class="car-date-filter-popover"
      :dismissable="true"
    >
      <div class="car-df">
        <div class="car-df-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="car-df-tab"
            :class="{ 'is-active': draftDateField === 'emissao' }"
            @click="draftDateField = 'emissao'"
          >
            Alterado em
          </button>
          <button
            type="button"
            role="tab"
            class="car-df-tab"
            :class="{ 'is-active': draftDateField === 'vencimento' }"
            @click="draftDateField = 'vencimento'"
          >
            Data de validade
          </button>
        </div>

        <div class="car-df-body">
          <div class="car-df-cal">
            <template v-if="showMonthPick">
              <span class="car-df-label">Selecionar mês</span>
              <DatePicker
                v-model="monthAnchor"
                view="month"
                date-format="mm/yy"
                inline
                @date-select="onMonthChosen"
              />
            </template>
            <template v-else>
              <span class="car-df-label">Início e fim do período</span>
              <DatePicker
                v-model="draftDateRange"
                selection-mode="range"
                inline
                date-format="dd/mm/yy"
                :number-of-months="1"
              />
            </template>
          </div>
          <div class="car-df-presets" role="menu">
            <button
              v-for="p in PRESETS"
              :key="p.id"
              type="button"
              role="menuitem"
              class="car-df-preset"
              :class="{ 'is-active': activePresetId === p.id }"
              @click="pickPreset(p.id)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <div class="car-df-footer">
          <Button type="button" label="Cancelar" severity="secondary" outlined @click="cancel" />
          <Button type="button" label="Filtrar" @click="apply" />
        </div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.car-df-wrap {
  display: inline-flex;
  flex-shrink: 0;
}

.car-datepicker {
  flex-shrink: 0;
  min-width: 12rem;
  max-width: 20rem;
}

.car-datepicker :deep(.p-button-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-df {
  min-width: 32rem;
  max-width: 36rem;
}

.car-df-tabs {
  display: flex;
  gap: 1.25rem;
  border-bottom: 1px solid var(--p-content-border-color, #e5e7eb);
  margin: -0.25rem -0.5rem 0.75rem;
  padding: 0 0.5rem;
}

.car-df-tab {
  background: none;
  border: none;
  padding: 0.5rem 0.15rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--p-text-muted-color, #6b7280);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
}

.car-df-tab:hover {
  color: var(--p-text-color, #111827);
}

.car-df-tab.is-active {
  color: var(--p-text-color, #111827);
  border-bottom-color: var(--p-primary-700, #008F42);
}

.car-df-body {
  display: flex;
  gap: 0;
  align-items: flex-start;
}

.car-df-cal {
  flex: 1;
  min-width: 0;
  padding-right: 0.75rem;
}

.car-df-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color, #6b7280);
  margin-bottom: 0.35rem;
}

.car-df-presets {
  flex: 0 0 9.5rem;
  border-left: 1px solid var(--p-content-border-color, #e5e7eb);
  padding-left: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.car-df-preset {
  text-align: left;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: var(--p-border-radius-md, 6px);
  background: transparent;
  font-size: 0.875rem;
  color: var(--p-text-color, #374151);
  cursor: pointer;
}

.car-df-preset:hover {
  background: var(--p-content-hover-background, #f3f4f6);
}

.car-df-preset.is-active {
  background: var(--p-content-hover-background, #f3f4f6);
  color: var(--p-primary-800, #006830);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--p-primary-700, #008F42);
}

.car-df-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-content-border-color, #e5e7eb);
}

.car-df-cal :deep(.p-datepicker) {
  border: none;
  padding: 0;
  box-shadow: none;
}

.car-df-cal :deep(.p-datepicker-panel) {
  border: none;
}
</style>
