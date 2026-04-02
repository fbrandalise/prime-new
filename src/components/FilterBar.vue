<script setup>
/**
 * FilterBar — barra de filtros reutilizável
 *
 * Props
 *   filters          Array de FilterDef (veja interface abaixo)
 *   modelValue       Objeto com os valores { [filterId]: valor }
 *   selectionCount   Número de linhas selecionadas na tabela
 *   totalCount       Total de registros exibidos
 *   selectionActions Array de MenuItem (PrimeVue Menu) para "Mais ações"
 *
 * Emits
 *   update:modelValue  quando qualquer filtro muda
 *   clear              quando "Limpar filtros" é clicado
 *   clear-selection    quando o × de seleção é clicado
 *   lower-selected     quando "Baixar selecionados" é clicado
 *
 * FilterDef
 *   id               string  — chave única (usada em modelValue)
 *   type             'selectbutton' | 'daterange' | 'multiselect' | 'select' | 'input'
 *   label            string  — nome exibido no popover "+ Filtros" e na row 2
 *   options          any[]   — para select / multiselect / selectbutton
 *   optionLabel      string  — campo label nas opções (objetos)
 *   optionValue      string  — campo value nas opções (objetos)
 *   placeholder      string  — placeholder do controle
 *   width            string  — largura CSS (ex: '11rem')
 *   pinned           boolean — sempre visível, não pode ser removido (default: false)
 *   defaultVisible   boolean — visível por padrão, mas pode ser removido (default: false)
 */

import { ref, computed } from 'vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Drawer from 'primevue/drawer'
import Menu from 'primevue/menu'
import Checkbox from 'primevue/checkbox'

const props = defineProps({
  filters: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Object,
    default: () => ({}),
  },
  selectionCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  selectionActions: {
    type: Array,
    default: () => [],
  },
  primarySelectionAction: {
    type: [Object, Array],
    default: null,
  },
  selectionTotal: {
    type: String,
    default: null,
  },
  // ── Colunas ────────────────────────────────────────────────────────────────
  columnDefs: {
    type: Array,
    default: () => [], // [{ key, label }]
  },
  visibleColumns: {
    type: Array,
    default: () => [], // array de keys visíveis
  },
})

const emit = defineEmits([
  'update:modelValue',
  'clear',
  'clear-selection',
  'lower-selected',
  'toggle-column',
])

// ── Separação de filtros ──────────────────────────────────────────────────────
const pinnedFilters = computed(() => props.filters.filter(f => f.pinned))
const extraFilters  = computed(() => props.filters.filter(f => !f.pinned))

// ── Visibilidade dos filtros extras (automática, baseada em valor) ────────────
const visibleExtraFilters = computed(() =>
  extraFilters.value.filter(f => {
    const val = props.modelValue[f.id]
    if (val == null || val === '') return false
    if (Array.isArray(val)) return val.length > 0
    return true
  }),
)

const hideFilter = (id) => {
  const updated = { ...props.modelValue }
  delete updated[id]
  emit('update:modelValue', updated)
}

const clearExtraFilters = () => {
  const updated = { ...props.modelValue }
  extraFilters.value.forEach(f => delete updated[f.id])
  emit('update:modelValue', updated)
}

// ── Atualização de valor de filtro ────────────────────────────────────────────
const updateFilter = (id, val) => {
  emit('update:modelValue', { ...props.modelValue, [id]: val })
}

// ── Detecção de filtros ativos ────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
  props.filters.some(f => {
    const val = props.modelValue[f.id]
    if (val == null || val === '') return false
    if (Array.isArray(val)) return val.length > 0
    return true
  }),
)

// ── Refs de drawer e menus ────────────────────────────────────────────────────
const addFiltersDrawerVisible = defineModel('filtersDrawerVisible', { default: false })
const selectionActionsMenuRef = ref()
const toggleSelectionMenu    = (e) => selectionActionsMenuRef.value.toggle(e)

// ── Aba do drawer ─────────────────────────────────────────────────────────────
const drawerTab = ref('filters')
const drawerTabOptions = [
  { label: 'Filtros',  value: 'filters'  },
  { label: 'Colunas',  value: 'columns'  },
]
</script>

<template>
  <div class="fb" :class="{ 'fb--selection': selectionCount > 0 }">

    <!-- ── Linha 1: slide entre estado-filtros e estado-seleção ────────────── -->
    <div class="fb-swap-container">
      <Transition name="fb-swap">

        <!-- Estado: seleção ativa -->
        <div v-if="selectionCount > 0" key="sel" class="fb-main">
          <div class="fb-sel">
            <Button
              icon="pi pi-times"
              size="small"
              variant="text"
              severity="secondary"
              v-tooltip.top="'Limpar seleção'"
              @click="emit('clear-selection')"
            />
            <div class="fb-divider" />
            <span class="fb-sel-count">
              <strong>{{ selectionCount }}</strong>
              {{ selectionCount === 1 ? 'item selecionado' : 'itens selecionados' }}
            </span>
            <template v-if="primarySelectionAction">
              <div class="fb-divider" />
              <template v-if="Array.isArray(primarySelectionAction)">
                <Button
                  v-for="action in primarySelectionAction"
                  :key="action.label"
                  :label="action.label"
                  :icon="action.icon"
                  size="small"
                  severity="secondary"
                  @click="action.command()"
                />
              </template>
              <Button
                v-else
                :label="primarySelectionAction.label"
                :icon="primarySelectionAction.icon"
                size="small"
                severity="secondary"
                @click="primarySelectionAction.command()"
              />
            </template>
            <Button
              label="Mais ações"
              icon="pi pi-chevron-down"
              icon-pos="right"
              size="small"
              severity="secondary"
              @click="toggleSelectionMenu"
            />
            <Menu ref="selectionActionsMenuRef" :model="selectionActions" popup />
          </div>
          <div class="fb-meta">
            <div v-if="selectionTotal" class="fb-meta-item fb-meta-total">
              <i class="pi pi-calculator" />
              <span>{{ selectionTotal }}</span>
            </div>
            <div class="fb-meta-item">
              <i class="pi pi-list" />
              <span>{{ totalCount }} registros</span>
            </div>
          </div>
        </div>

        <!-- Estado: filtros normais -->
        <div v-else key="flt" class="fb-main">

          <div class="fb-filters">

            <!-- Filtros fixos (pinned) -->
            <template v-for="filter in pinnedFilters" :key="filter.id">

              <SelectButton
                v-if="filter.type === 'selectbutton'"
                :model-value="modelValue[filter.id]"
                :options="filter.options"
                :option-label="filter.optionLabel"
                :option-value="filter.optionValue"
                size="small"
                @update:model-value="updateFilter(filter.id, $event)"
              />

              <DatePicker
                v-else-if="filter.type === 'daterange'"
                :model-value="modelValue[filter.id]"
                selection-mode="range"
                date-format="dd/mm/yy"
                show-icon
                icon-display="input"
                size="small"
                :placeholder="filter.placeholder"
                class="fb-datepicker"
                :style="filter.width ? { width: filter.width } : undefined"
                @update:model-value="updateFilter(filter.id, $event)"
              />

              <MultiSelect
                v-else-if="filter.type === 'multiselect'"
                :model-value="modelValue[filter.id]"
                :options="filter.options"
                :option-label="filter.optionLabel"
                :option-value="filter.optionValue"
                :placeholder="filter.placeholder || filter.label"
                size="small"
                display="chip"
                :style="filter.width ? { minWidth: filter.width } : undefined"
                @update:model-value="updateFilter(filter.id, $event)"
              />

              <Select
                v-else-if="filter.type === 'select'"
                :model-value="modelValue[filter.id]"
                :options="filter.options"
                :option-label="filter.optionLabel"
                :option-value="filter.optionValue"
                :placeholder="filter.placeholder || filter.label"
                size="small"
                :style="filter.width ? { width: filter.width } : undefined"
                @update:model-value="updateFilter(filter.id, $event)"
              />

              <InputText
                v-else-if="filter.type === 'input'"
                :model-value="modelValue[filter.id]"
                :placeholder="filter.placeholder || filter.label"
                size="small"
                :style="filter.width ? { width: filter.width } : undefined"
                @update:model-value="updateFilter(filter.id, $event)"
              />

            </template>

            <!-- Limpar filtros -->
            <Button
              v-if="hasActiveFilters"
              label="Limpar filtros"
              icon="pi pi-times"
              variant="text"
              severity="secondary"
              size="small"
              @click="emit('clear')"
            />

            <!-- Filtros extras aplicados — inline, quebram linha só quando necessário -->
            <template v-for="filter in visibleExtraFilters" :key="`x-${filter.id}`">
              <div class="fb-extra-item">

                <MultiSelect
                  v-if="filter.type === 'multiselect'"
                  :model-value="modelValue[filter.id]"
                  :options="filter.options"
                  :option-label="filter.optionLabel"
                  :option-value="filter.optionValue"
                  :placeholder="filter.placeholder || filter.label"
                  display="chip"
                  size="small"
                  :style="{ minWidth: filter.width || '10rem' }"
                  @update:model-value="updateFilter(filter.id, $event)"
                />

                <Select
                  v-else-if="filter.type === 'select'"
                  :model-value="modelValue[filter.id]"
                  :options="filter.options"
                  :option-label="filter.optionLabel"
                  :option-value="filter.optionValue"
                  :placeholder="filter.placeholder || filter.label"
                  size="small"
                  :style="{ width: filter.width || '10rem' }"
                  @update:model-value="updateFilter(filter.id, $event)"
                />

                <InputText
                  v-else-if="filter.type === 'input'"
                  :model-value="modelValue[filter.id]"
                  :placeholder="filter.placeholder || filter.label"
                  size="small"
                  :style="{ width: filter.width || '10rem' }"
                  @update:model-value="updateFilter(filter.id, $event)"
                />

                <Button
                  icon="pi pi-times"
                  size="small"
                  variant="text"
                  severity="secondary"
                  class="fb-extra-remove"
                  v-tooltip.top="`Remover '${filter.label}'`"
                  @click="hideFilter(filter.id)"
                />

              </div>
            </template>

          </div>

          <!-- Meta: registros -->
          <div class="fb-meta">
            <div class="fb-meta-item">
              <i class="pi pi-list" />
              <span>{{ totalCount }} registros</span>
            </div>
          </div>

        </div>

      </Transition>
    </div>

    <!-- ── Drawer: filtros + colunas ──────────────────────────────────────── -->
    <Drawer v-model:visible="addFiltersDrawerVisible" position="left" class="fb-add-drawer">
      <template #header>
        <SelectButton
          v-model="drawerTab"
          :options="drawerTabOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="fb-drawer-tabs"
        />
      </template>

      <!-- Aba: Filtros -->
      <div v-if="drawerTab === 'filters'" class="fb-drawer-body">
        <div v-for="filter in extraFilters" :key="filter.id" class="fb-drawer-field">
          <label class="fb-drawer-label">{{ filter.label }}</label>

          <MultiSelect
            v-if="filter.type === 'multiselect'"
            :model-value="modelValue[filter.id]"
            :options="filter.options"
            :option-label="filter.optionLabel"
            :option-value="filter.optionValue"
            :placeholder="filter.placeholder || filter.label"
            display="chip"
            @update:model-value="updateFilter(filter.id, $event)"
          />

          <Select
            v-else-if="filter.type === 'select'"
            :model-value="modelValue[filter.id]"
            :options="filter.options"
            :option-label="filter.optionLabel"
            :option-value="filter.optionValue"
            :placeholder="filter.placeholder || filter.label"
            @update:model-value="updateFilter(filter.id, $event)"
          />

          <InputText
            v-else-if="filter.type === 'input'"
            :model-value="modelValue[filter.id]"
            :placeholder="filter.placeholder || filter.label"
            @update:model-value="updateFilter(filter.id, $event)"
          />

          <DatePicker
            v-else-if="filter.type === 'daterange'"
            :model-value="modelValue[filter.id]"
            selection-mode="range"
            date-format="dd/mm/yy"
            show-icon
            icon-display="input"
            :placeholder="filter.placeholder"
            @update:model-value="updateFilter(filter.id, $event)"
          />
        </div>
      </div>

      <!-- Aba: Colunas -->
      <div v-else-if="drawerTab === 'columns'" class="fb-drawer-body">
        <p class="fb-col-hint">Selecione as colunas que deseja exibir na tabela.</p>
        <div
          v-for="col in columnDefs"
          :key="col.key"
          class="fb-col-row"
          @click="emit('toggle-column', col.key)"
        >
          <Checkbox
            :model-value="visibleColumns.includes(col.key)"
            :binary="true"
            :input-id="`col-${col.key}`"
            @click.stop
            @update:model-value="emit('toggle-column', col.key)"
          />
          <label :for="`col-${col.key}`" class="fb-col-label">{{ col.label }}</label>
        </div>
      </div>

      <template #footer>
        <Button
          v-if="drawerTab === 'filters' && visibleExtraFilters.length > 0"
          label="Limpar filtros"
          icon="pi pi-times"
          variant="text"
          severity="secondary"
          size="small"
          @click="clearExtraFilters"
        />
      </template>
    </Drawer>

  </div>
</template>

<style scoped>
/* ── Container ───────────────────────────────────────────────────────────── */
.fb {
  margin: 0.5rem 1.5rem;
  background: var(--car-infobox-bg);
  border: 1px solid var(--car-infobox-border);
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fb--selection {
  background: var(--car-infobox-bg-selection);
  border-color: var(--car-infobox-border-selection);
}

/* ── Slide swap (filtros ↔ seleção) ──────────────────────────────────────── */
.fb-swap-container {
  position: relative;
  overflow: hidden;
}

/* Em modo seleção, fb-swap-container e fb-main preenchem toda a altura,
   e align-items: center (já no fb-main) centra as ações verticalmente */
.fb--selection .fb-swap-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.fb--selection .fb-main {
  flex: 1;
}

/* O elemento que SAI fica absoluto (não empurra o layout) */
.fb-swap-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease;
}

/* O elemento que ENTRA fica no fluxo normal (define a altura do container) */
.fb-swap-enter-active {
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease;
}

/* Filtros saem pelo topo */
.fb-swap-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Ações entram vindo de baixo */
.fb-swap-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

/* ── Linha 1 ──────────────────────────────────────────────────────────────── */
.fb-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.375rem 0.75rem;
  min-height: 2.75rem;
}

.fb-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

/* ── Barra de seleção ────────────────────────────────────────────────────── */
.fb-sel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fb-sel-count {
  font-size: 0.875rem;
  color: var(--p-primary-600, #2563eb);
  white-space: nowrap;
}

/* ── Meta ────────────────────────────────────────────────────────────────── */
.fb-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  flex-shrink: 0;
  /* alinha com a primeira linha dos filtros (compensa o padding do .fb-main) */
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.fb-meta-total {
  font-weight: 600;
  color: var(--p-text-color);
  padding-right: 0.5rem;
  border-right: 1px solid var(--p-surface-border);
}

.fb-meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* ── Divisor vertical ────────────────────────────────────────────────────── */
.fb-divider {
  width: 1px;
  height: 1.5rem;
  background: var(--p-surface-border);
  flex-shrink: 0;
}

/* ── DatePicker: força altura consistente com size="small" ───────────────── */
.fb-datepicker {
  width: 14rem;
}

.fb-datepicker :deep(.p-datepicker-input),
.fb-datepicker :deep(.p-datepicker-dropdown) {
  padding-block: 0.25rem;
}

/* ── Filtros extras inline ────────────────────────────────────────────────── */
.fb-extra-item {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}

/* Altura fixa para MultiSelect não encolher ao exibir chips */
.fb-extra-item :deep(.p-multiselect) {
  height: 2rem;
}

.fb-extra-item :deep(.p-multiselect-label-container) {
  display: flex;
  align-items: center;
  overflow: hidden;
}

/* Chips em linha única, verticalmente centrados */
.fb-extra-item :deep(.p-multiselect-label:not(.p-placeholder)) {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: 0.25rem;
  padding-block: 0;
}

.fb-extra-item :deep(.p-chip) {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  height: 1.25rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.fb-extra-remove {
  width: 1.5rem !important;
  height: 1.5rem !important;
  padding: 0 !important;
  flex-shrink: 0;
}

/* ── Drawer: tabs ─────────────────────────────────────────────────────────── */
.fb-drawer-tabs {
  flex-shrink: 0;
}

/* ── Drawer: corpo ────────────────────────────────────────────────────────── */
.fb-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.fb-drawer-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-bottom: 0.375rem;
}

.fb-drawer-field :deep(.p-multiselect),
.fb-drawer-field :deep(.p-select),
.fb-drawer-field :deep(.p-inputtext),
.fb-drawer-field :deep(.p-datepicker) {
  width: 100%;
}

/* ── Drawer: aba Colunas ──────────────────────────────────────────────────── */
.fb-col-hint {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin: 0 0 0.25rem;
  line-height: 1.5;
}

.fb-col-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.12s;
}

.fb-col-row:hover {
  background: var(--p-surface-hover);
}

.fb-col-label {
  font-size: 0.9375rem;
  color: var(--p-text-color);
  cursor: pointer;
  flex: 1;
}

/* ── Responsivo ───────────────────────────────────────────────────────────── */
@media screen and (max-width: 860px) {
  .fb-datepicker {
    width: auto;
    min-width: 9rem;
    flex: 1;
  }
}

@media screen and (max-width: 600px) {
  .fb-main {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    gap: 0.375rem;
  }

  .fb-filters {
    width: 100%;
  }

  .fb-meta {
    width: 100%;
    padding-top: 0.375rem;
    border-top: 1px solid var(--p-surface-border);
  }

  .fb-divider {
    display: none;
  }

  .fb-datepicker {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
