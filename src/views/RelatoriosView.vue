<script setup>
import { ref, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { agGridTheme } from '../assets/ag-grid-theme.js'
import { useDreData, getLancamentosDreId, dreChildrenMap, dreStructure, toYearMonth, formatBRL } from '../composables/useDreData.js'
import { useLancamentosStore } from '@/stores/lancamentos'
import Breadcrumb from 'primevue/breadcrumb'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'

ModuleRegistry.registerModules([AllCommunityModule])

const emit = defineEmits(['navigate'])
const toast = useToast()
const lancamentosStore = useLancamentosStore()

// ── Breadcrumb ───────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Relatórios' }, { label: 'DRE' }]

// ── Grid / Filtros ───────────────────────────────────────────────────────────
const gridApi = ref(null)
const modo = ref('Vertical')
const modoOptions = ['Vertical', 'Horizontal']
const baseDate = ref(new Date())
const spanOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]
const selectedSpan = ref(spanOptions[0])
const span = computed(() => selectedSpan.value.value)
const modoValue = computed(() => modo.value === 'Vertical' ? 'vertical' : 'horizontal')

const { dreRows, dreColumns, getRowClass } = useDreData(modoValue, baseDate, span)

// Key que força re-render do grid quando colunas mudam (mudança de modo/data/span)
const gridKey = computed(() => `${modoValue.value}-${baseDate.value?.getTime()}-${span.value}`)

const onGridReady = (params) => {
  gridApi.value = params.api
}

onMounted(async () => {
  if (!lancamentosStore.items.length) {
    try {
      await lancamentosStore.fetchAll()
    } catch {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar lançamentos', life: 3000 })
    }
  }
})

const exportCsv = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: `DRE_${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }
}

// ── Drawer de detalhamento ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerDreId = ref(null)
const drawerPeriodKey = ref(null)
const drawerLabel = ref('')

// Mapa dreId → label para o header do drawer
const dreLabelMap = Object.fromEntries(dreStructure.map(r => [r.id, r.label]))

function formatPeriodLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
}

const onCellClicked = (params) => {
  const field = params.colDef.field
  // Ignorar cliques na coluna descricao e AV%
  if (field === 'descricao' || field === '_av') return

  const rowId = params.data._id
  drawerDreId.value = rowId
  drawerPeriodKey.value = field
  drawerLabel.value = `${dreLabelMap[rowId] || rowId} — ${formatPeriodLabel(field)}`
  drawerVisible.value = true
}

const drawerLancamentos = computed(() => {
  if (!drawerDreId.value || !drawerPeriodKey.value) return []

  const rowId = drawerDreId.value
  // Determinar quais dreIds filtrar (item direto ou filhos de grupo/subtotal/total)
  const targetIds = dreChildrenMap[rowId]
    ? new Set(dreChildrenMap[rowId])
    : new Set([rowId])

  return lancamentosStore.items.filter(l => {
    const dreId = getLancamentosDreId(l)
    if (!dreId || !targetIds.has(dreId)) return false
    return toYearMonth(l.data) === drawerPeriodKey.value
  })
})

const drawerTotal = computed(() => {
  let sum = 0
  for (const l of drawerLancamentos.value) {
    const v = parseFloat((l.valor || '0').replace(/\./g, '').replace(',', '.')) || 0
    sum += v
  }
  return formatBRL(sum)
})

function getOrigemIcon(lancamento) {
  if (lancamento.conta_a_receber_id) return 'pi pi-arrow-circle-down'
  if (lancamento.conta_a_pagar_id) return 'pi pi-arrow-circle-up'
  return 'pi pi-calendar'
}

function getOrigemTooltip(lancamento) {
  if (lancamento.conta_a_receber_id) return 'Ver em Contas a Receber'
  if (lancamento.conta_a_pagar_id) return 'Ver em Contas a Pagar'
  return 'Ver na Agenda'
}

function navigateToOrigem(lancamento) {
  drawerVisible.value = false
  if (lancamento.conta_a_receber_id) {
    emit('navigate', 'contas')
  } else if (lancamento.conta_a_pagar_id) {
    emit('navigate', 'contas-pagar')
  } else {
    emit('navigate', 'agenda')
  }
}
</script>

<template>
  <div class="dre-page">

    <!-- ── Cabeçalho ───────────────────────────────────────────────────── -->
    <div class="dre-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="dre-breadcrumb"
      />

      <div class="dre-title-row">
        <span class="dre-title">Demonstração do Resultado do Exercício</span>
        <Button
          label="Exportar CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          size="small"
          @click="exportCsv"
        />
      </div>
    </div>

    <div class="dre-body">
      <div class="dre-panel">

        <!-- ── Toolbar ───────────────────────────────────────────────────── -->
        <div class="dre-toolbar">
          <SelectButton v-model="modo" :options="modoOptions" :allowEmpty="false" />

          <template v-if="modoValue === 'vertical'">
            <DatePicker
              v-model="baseDate"
              view="month"
              dateFormat="mm/yy"
              showIcon
              iconDisplay="input"
              class="dre-date-picker"
            />
          </template>
          <template v-else>
            <Select
              v-model="selectedSpan"
              :options="spanOptions"
              optionLabel="label"
              class="dre-span-select"
            />
            <DatePicker
              v-model="baseDate"
              view="month"
              dateFormat="mm/yy"
              showIcon
              iconDisplay="input"
              class="dre-date-picker"
              placeholder="Mês base"
            />
          </template>
        </div>

        <!-- ── AG Grid ─────────────────────────────────────────────────── -->
        <div class="dre-grid-wrapper">
          <AgGridVue
            :key="gridKey"
            :theme="agGridTheme"
            :rowData="dreRows"
            :columnDefs="dreColumns"
            :getRowClass="getRowClass"
            :rowHeight="32"
            :headerHeight="36"
            :suppressMovableColumns="true"
            :suppressColumnReorder="true"
            :domLayout="'autoHeight'"
            @grid-ready="onGridReady"
            @cell-clicked="onCellClicked"
          />
        </div>

      </div>
    </div>

    <!-- ── Drawer de detalhamento ──────────────────────────────────────── -->
    <Drawer
      v-model:visible="drawerVisible"
      position="right"
      :header="drawerLabel"
      style="width: 36rem"
    >
      <DataTable
        :value="drawerLancamentos"
        scrollable
        scrollHeight="calc(100vh - 12rem)"
        size="small"
        stripedRows
      >
        <Column field="data" header="Data" style="width: 6rem" />
        <Column field="descricao" header="Descrição" style="min-width: 10rem" />
        <Column field="categoria" header="Categoria" style="min-width: 8rem" />
        <Column field="valor" header="Valor" style="width: 7rem">
          <template #body="{ data }">
            <span style="display: block; text-align: right">{{ data.valor }}</span>
          </template>
        </Column>
        <Column header="" style="width: 3rem">
          <template #body="{ data }">
            <Button
              :icon="getOrigemIcon(data)"
              variant="text"
              size="small"
              rounded
              v-tooltip.left="getOrigemTooltip(data)"
              @click="navigateToOrigem(data)"
            />
          </template>
        </Column>
        <template #empty>
          <div style="text-align: center; padding: 2rem; color: var(--p-text-muted-color)">
            Nenhum lançamento encontrado para esta linha.
          </div>
        </template>
      </DataTable>

      <div class="drawer-total">
        <span>Total</span>
        <span class="drawer-total-value">{{ drawerTotal }}</span>
      </div>
    </Drawer>

  </div>
</template>

<style scoped>
.dre-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.dre-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.dre-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.dre-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.dre-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
  flex: 1;
}

/* ── Body ───────────────────────────────────────────────────────────────────── */
.dre-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */
.dre-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.dre-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.dre-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.dre-date-picker {
  width: 10rem;
}

.dre-span-select {
  width: 8rem;
}

/* ── Grid ───────────────────────────────────────────────────────────────────── */
.dre-grid-wrapper {
  flex: 1;
}

/* ── Drawer total ──────────────────────────────────────────────────────────── */
.drawer-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
  border-top: 2px solid var(--p-surface-border);
  font-weight: 700;
  font-size: 0.95rem;
}

.drawer-total-value {
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* DRE row styles (unscoped for AG Grid) */
.dre-row-grupo {
  background-color: var(--p-surface-ground) !important;
  font-weight: 700;
}

.dre-row-subtotal {
  font-weight: 600;
  border-top: 1px solid var(--p-surface-border) !important;
}

.dre-row-total {
  font-weight: 700;
  background-color: var(--p-primary-50) !important;
}

.dark-mode .dre-row-total {
  background-color: var(--p-primary-950) !important;
}

.dre-negative {
  color: var(--p-red-500) !important;
}

/* Cursor pointer nas células de valor (exceto descricao e _av) */
.ag-cell[col-id]:not([col-id="descricao"]):not([col-id="_av"]) {
  cursor: pointer;
}
.ag-cell[col-id]:not([col-id="descricao"]):not([col-id="_av"]):hover {
  background-color: var(--p-surface-hover) !important;
}
</style>
