<script setup>
import { ref, watch, computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import * as service from '@/services/contasAReceberService'
import { useContasAReceberStore } from '@/stores/contasAReceber'

ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  rows:       { type: Array,   default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const toast  = useToast()
const store  = useContasAReceberStore()
const saving = ref(false)

// Map: id → { dbField: dbValue } — acumula patches por linha
const changedPatches = ref(new Map())
const changeCount    = computed(() => changedPatches.value.size)

// ── Opções ────────────────────────────────────────────────────────────────────
const formaPagamentoOptions = [
  'Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito',
  'Transferência Bancária', 'Dinheiro', 'Cheque',
]
const situacaoOptions = ['A receber', 'Atrasada', 'Recebida', 'Recebida parcialmente']

// ── Definição de colunas AG Grid ──────────────────────────────────────────────
const columnDefs = [
  {
    field: 'cliente',
    headerName: 'Cliente',
    editable: true,
    flex: 2,
    minWidth: 150,
  },
  {
    field: 'vencimento',
    headerName: 'Vencimento',
    editable: true,
    width: 130,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: { maxLength: 10 },
    headerTooltip: 'Formato dd/mm/aaaa',
  },
  {
    field: 'formaPagamento',
    headerName: 'Forma de pagamento',
    editable: true,
    flex: 1.5,
    minWidth: 160,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: formaPagamentoOptions },
  },
  {
    field: 'situacao',
    headerName: 'Situação',
    editable: true,
    flex: 1.2,
    minWidth: 120,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: situacaoOptions },
    cellClassRules: {
      'beg-cell--atrasada':  ({ value }) => value === 'Atrasada',
      'beg-cell--recebida':  ({ value }) => value === 'Recebida' || value === 'Recebida parcialmente',
      'beg-cell--a-receber': ({ value }) => value === 'A receber',
    },
  },
  {
    field: 'valor',
    headerName: 'Valor total',
    editable: false,
    width: 130,
    type: 'rightAligned',
    cellStyle: { fontWeight: '600' },
  },
]

const defaultColDef = {
  sortable:   true,
  resizable:  true,
  filter:     true,
  suppressMovable: false,
}

// ── Row data — clone local para edição não-destrutiva ─────────────────────────
const rowData = ref([])

watch(
  () => [props.modelValue, props.rows],
  ([visible]) => {
    if (visible) {
      rowData.value       = props.rows.map(r => ({ ...r }))
      changedPatches.value = new Map()
    }
  },
  { immediate: true, deep: false },
)

// ── Rastrear mudanças célula a célula ─────────────────────────────────────────
const onCellValueChanged = ({ data, colDef, newValue, oldValue }) => {
  if (newValue === oldValue) return
  const id       = data.id
  const existing = changedPatches.value.get(id) ?? {}
  let   dbField  = colDef.field
  let   dbValue  = newValue

  if (dbField === 'formaPagamento') {
    dbField = 'forma_pagamento'
  } else if (dbField === 'vencimento') {
    const parts = newValue?.split('/')
    if (parts?.length === 3 && parts.every(Boolean)) {
      dbValue = `${parts[2]}-${parts[1]}-${parts[0]}`
    } else {
      return // formato inválido — ignora
    }
  }

  changedPatches.value = new Map(changedPatches.value.set(id, { ...existing, [dbField]: dbValue }))
}

// ── Salvar todas as alterações ────────────────────────────────────────────────
const save = async () => {
  if (!changeCount.value) { close(); return }
  saving.value = true
  try {
    await Promise.all(
      [...changedPatches.value.entries()].map(([id, patch]) => service.update(id, patch)),
    )
    await store.fetchAll()
    toast.add({
      severity: 'success',
      summary:  'Salvo',
      detail:   `${changeCount.value} linha(s) atualizada(s).`,
      life:     3000,
    })
    emit('saved')
    close()
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar as alterações.', life: 4000 })
  } finally {
    saving.value = false
  }
}

const close  = () => emit('update:modelValue', false)
const getRowId = ({ data }) => String(data.id)
</script>

<template>
  <Teleport to="body">
    <Transition name="beg-fade">
      <div v-if="modelValue" class="beg-page" role="dialog" aria-modal="true" aria-label="Edição em massa">

        <!-- ── Header ────────────────────────────────────────────────────── -->
        <header class="beg-header">
          <div class="beg-header-start">
            <i class="pi pi-table beg-header-icon" />
            <span class="beg-title">Edição em massa</span>
            <span class="beg-sep" />
            <span class="beg-subtitle">{{ rows.length }} linha(s) selecionada(s)</span>
            <Transition name="beg-badge-pop">
              <span v-if="changeCount > 0" class="beg-badge">
                <i class="pi pi-pencil" />
                {{ changeCount }} linha(s) alterada(s)
              </span>
            </Transition>
          </div>

          <span class="beg-tip">
            <i class="pi pi-info-circle" />
            Dê duplo clique para editar · <kbd>Enter</kbd> confirma · <kbd>Esc</kbd> cancela
          </span>

          <div class="beg-header-end">
            <Button
              label="Fechar sem salvar"
              severity="secondary"
              variant="outlined"
              @click="close"
            />
            <Button
              :label="changeCount > 0 ? `Salvar ${changeCount} linha(s)` : 'Nenhuma alteração'"
              icon="pi pi-check"
              :loading="saving"
              :disabled="changeCount === 0"
              @click="save"
            />
          </div>
        </header>

        <!-- ── Grid ──────────────────────────────────────────────────────── -->
        <div class="beg-grid-wrap ag-theme-quartz">
          <AgGridVue
            :columnDefs="columnDefs"
            :rowData="rowData"
            :defaultColDef="defaultColDef"
            :getRowId="getRowId"
            style="width: 100%; height: 100%"
            @cell-value-changed="onCellValueChanged"
          />
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Página (fullscreen) ─────────────────────────────────────────────────────── */
.beg-page {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-ground);
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.beg-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.75rem 1.5rem;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.beg-header-start {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.beg-header-icon {
  font-size: 1rem;
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.beg-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
}

.beg-sep {
  width: 1px;
  height: 1.25rem;
  background: var(--p-surface-border);
  flex-shrink: 0;
}

.beg-subtitle {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.beg-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.625rem;
  background: var(--p-amber-100, #fef3c7);
  color: var(--p-amber-700, #b45309);
  border: 1px solid var(--p-amber-300, #fcd34d);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.beg-badge .pi { font-size: 0.6875rem; }

.beg-tip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-right: auto;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.beg-tip .pi { font-size: 0.75rem; flex-shrink: 0; }

kbd {
  display: inline-flex;
  align-items: center;
  padding: 0 0.3rem;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 0.25rem;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--p-text-color);
}

.beg-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Grid wrapper ────────────────────────────────────────────────────────────── */
.beg-grid-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* ── Cores por situação ──────────────────────────────────────────────────────── */
:global(.beg-cell--atrasada)  { color: #dc2626; font-weight: 600; }
:global(.beg-cell--recebida)  { color: #16a34a; font-weight: 600; }
:global(.beg-cell--a-receber) { color: #2563eb; }

/* ── Célula alterada — realce sutil ──────────────────────────────────────────── */
:global(.ag-cell-inline-editing) {
  border-color: var(--p-primary-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-primary-color) 20%, transparent) !important;
}

/* ── Transição ───────────────────────────────────────────────────────────────── */
.beg-fade-enter-active,
.beg-fade-leave-active {
  transition: opacity 0.2s ease;
}
.beg-fade-enter-from,
.beg-fade-leave-to {
  opacity: 0;
}

/* ── Badge pop ───────────────────────────────────────────────────────────────── */
.beg-badge-pop-enter-active { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.beg-badge-pop-leave-active { transition: all 0.15s ease; }
.beg-badge-pop-enter-from,
.beg-badge-pop-leave-to { opacity: 0; transform: scale(0.75); }
</style>
