<script setup>
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import Breadcrumb from 'primevue/breadcrumb'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'
import Card from 'primevue/card'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Popover from 'primevue/popover'
import Drawer from 'primevue/drawer'
import FilterBar from '@/components/FilterBar.vue'
import { PERIODO_OPTIONS_PAGAR, buildDateRange } from '@/composables/usePeriodFilter'

// ── Seletor de adquirente (chip) ──────────────────────────────────────────────
const TODAS_LABEL = 'Todas as adquirentes'
const adquirenteOptions = [
  { type: 'item', label: TODAS_LABEL, featured: true },
  { type: 'separator', label: 'Adquirentes' },
  { type: 'item', label: 'Cielo' },
  { type: 'item', label: 'Rede' },
  { type: 'item', label: 'Stone' },
  { type: 'item', label: 'GetNet' },
  { type: 'item', label: 'PagSeguro' },
]
const selectedAdquirenteLabel = ref(TODAS_LABEL)
const adquirentePopover = ref()
const adquirenteSearch = ref('')
const filteredAdquirenteOptions = computed(() => {
  const q = adquirenteSearch.value.toLowerCase()
  if (!q) return adquirenteOptions
  return adquirenteOptions.filter(o => o.type === 'item' && o.label.toLowerCase().includes(q))
})
const toggleAdquirentePopover = (e) => adquirentePopover.value.toggle(e)
const selectAdquirente = (option) => {
  selectedAdquirenteLabel.value = option.label
  filterValues.value = {
    ...filterValues.value,
    adquirente: option.label === TODAS_LABEL ? [] : [option.label],
  }
  adquirentePopover.value.hide()
  adquirenteSearch.value = ''
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [
  { label: 'Financeiro' },
  { label: 'Entradas' },
  { label: 'Carteiras de POS' },
]

// ── Menu de ações do header ───────────────────────────────────────────────────
const headerActionsMenu = ref()
const headerActionsItems = ref([
  { label: 'Importar registros', icon: 'pi pi-upload' },
  { label: 'Exportar',           icon: 'pi pi-download' },
  { label: 'Imprimir',           icon: 'pi pi-print' },
])
const toggleHeaderActionsMenu = (e) => headerActionsMenu.value.toggle(e)

// ── Filtros ───────────────────────────────────────────────────────────────────
const periodOptions = PERIODO_OPTIONS_PAGAR

const filterValues = ref({
  period:      'mes',
  dateRange:   null,
  adquirente:  [],
  bandeira:    [],
  tipo:        [],
  status:      [],
  antecipacao: [],
})

watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) return { from: dateRange[0], to: dateRange[1] ?? dateRange[0] }
  return buildDateRange(period)
})

const filterDefs = [
  {
    id: 'adquirente', type: 'multiselect', label: 'Adquirente', defaultVisible: true,
    options: ['Cielo', 'Rede', 'Stone', 'GetNet', 'PagSeguro'],
    width: '12rem',
  },
  {
    id: 'bandeira', type: 'multiselect', label: 'Bandeira', defaultVisible: true,
    options: ['Visa', 'Master', 'Elo', 'Hipercard'],
    width: '11rem',
  },
  {
    id: 'tipo', type: 'multiselect', label: 'Tipo', defaultVisible: true,
    options: ['Crédito', 'Débito', 'Voucher'],
    width: '10rem',
  },
  {
    id: 'status', type: 'multiselect', label: 'Status', defaultVisible: true,
    options: ['Pendente', 'Conciliado', 'Conferido', 'Divergente'],
    width: '12rem',
  },
  {
    id: 'antecipacao', type: 'multiselect', label: 'Antecipação',
    options: ['Antecipado', 'Parcial'],
    width: '11rem',
  },
]

const searchValue = ref('')

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = {
    period: 'mes', dateRange: null,
    adquirente: [], bandeira: [], tipo: [], status: [], antecipacao: [],
  }
}

const filtersDrawerVisible = ref(false)

const activeExtraFilterCount = computed(() =>
  filterDefs.filter(f => !f.defaultVisible).filter(f => {
    const val = filterValues.value[f.id]
    if (val == null || val === '') return false
    if (Array.isArray(val)) return val.length > 0
    return true
  }).length,
)

// ── Mock data ─────────────────────────────────────────────────────────────────
const _adquirentes  = ['Cielo', 'Rede', 'Stone', 'GetNet', 'PagSeguro']
const _bandeiras    = ['Visa', 'Master', 'Elo', 'Hipercard']
const _tipos        = ['Crédito', 'Crédito', 'Débito', 'Voucher'] // crédito mais comum
const _statusList   = ['Pendente', 'Conciliado', 'Conferido', 'Divergente', 'Pendente', 'Conciliado'] // pendente/conciliado mais comuns
const _antecList    = ['Antecipado', 'Parcial', '', '', '', '', ''] // '' = sem antecipação

const _taxaPct = {
  'Cielo':     { 'Crédito': 0.025, 'Débito': 0.012, 'Voucher': 0.012 },
  'Rede':      { 'Crédito': 0.023, 'Débito': 0.011, 'Voucher': 0.011 },
  'Stone':     { 'Crédito': 0.020, 'Débito': 0.010, 'Voucher': 0.010 },
  'GetNet':    { 'Crédito': 0.024, 'Débito': 0.0115, 'Voucher': 0.0115 },
  'PagSeguro': { 'Crédito': 0.028, 'Débito': 0.013, 'Voucher': 0.013 },
}

const _fmtDate = (d) => {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

const _brutosBase = [
  89.90, 234.50, 412.00, 78.00, 560.00, 1200.00, 145.00, 345.00, 670.00,
  990.00, 123.50, 456.00, 788.00, 55.00, 2100.00, 310.00, 765.00, 499.90,
  1340.00, 87.50, 230.00, 890.00, 1650.00, 44.90, 620.00,
]

const _randomNsu = (i) => String(100000000 + i * 9871).slice(0, 9)
const _randomAuth = (i) => String(200000 + i * 37).slice(0, 6)
const _randomTerminal = (i) => `TID${String(1000 + (i % 50)).padStart(4, '0')}`

const transacoes = ref(
  Array.from({ length: 110 }, (_, i) => {
    // Data da transação: 80 no mês atual, 30 no mês anterior
    let dataTransacaoDate
    if (i < 80) {
      dataTransacaoDate = new Date(2026, 2, 1)
      dataTransacaoDate.setDate(dataTransacaoDate.getDate() + Math.round((i / 79) * 3))
    } else {
      dataTransacaoDate = new Date(2026, 1, 1)
      dataTransacaoDate.setDate(dataTransacaoDate.getDate() + Math.round(((i - 80) / 29) * 27))
    }

    const adquirente   = _adquirentes[i % _adquirentes.length]
    const bandeira     = _bandeiras[i % _bandeiras.length]
    const tipo         = _tipos[i % _tipos.length]
    const statusVal    = _statusList[i % _statusList.length]
    const antec        = _antecList[i % _antecList.length]
    const bruto        = _brutosBase[i % _brutosBase.length]
    const parcelas     = tipo === 'Crédito' ? `${(i % 12) + 1}x` : '—'

    const taxaPctVal   = _taxaPct[adquirente][tipo]
    const taxa         = Math.round(bruto * taxaPctVal * 100) / 100
    const liquido      = Math.round((bruto - taxa) * 100) / 100
    const margem       = Math.round((liquido / bruto) * 10000) / 100

    // Previsão de repasse: D+1 para débito, D+30 para crédito
    const diasRepasse  = tipo === 'Crédito' ? 30 : 1
    const previsaoDate = new Date(dataTransacaoDate)
    previsaoDate.setDate(previsaoDate.getDate() + diasRepasse)

    // Data efetiva: apenas se conciliado/conferido
    let dataRepasseStr = '—'
    if (statusVal === 'Conciliado' || statusVal === 'Conferido') {
      const dr = new Date(previsaoDate)
      dr.setDate(dr.getDate() + (i % 3 === 0 ? 1 : 0)) // pequena variação
      dataRepasseStr = _fmtDate(dr)
    }

    return {
      id:              i + 1,
      pedido:          `#POS${String(200000 + i * 137).slice(0, 6)}`,
      adquirente,
      bandeira,
      tipo,
      parcelas,
      nsu:             _randomNsu(i),
      autorizacao:     _randomAuth(i),
      terminalId:      _randomTerminal(i),
      dataTransacao:   _fmtDate(dataTransacaoDate),
      previsaoRepasse: _fmtDate(previsaoDate),
      dataRepasse:     dataRepasseStr,
      bruto,
      taxaPct:         Math.round(taxaPctVal * 10000) / 100,
      taxa,
      liquido,
      margem,
      status:          statusVal,
      antecipacao:     antec,
    }
  })
)

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  if (!str || str === '—') return null
  const [d, m, y] = str.split('/')
  return new Date(y, m - 1, d)
}

const filteredTransacoes = computed(() => {
  const q = searchValue.value.toLowerCase()
  return transacoes.value.filter(r => {
    const matchAdq    = !filterValues.value.adquirente.length  || filterValues.value.adquirente.includes(r.adquirente)
    const matchBand   = !filterValues.value.bandeira.length    || filterValues.value.bandeira.includes(r.bandeira)
    const matchTipo   = !filterValues.value.tipo.length        || filterValues.value.tipo.includes(r.tipo)
    const matchStatus = !filterValues.value.status.length      || filterValues.value.status.includes(r.status)
    const matchAntec  = !filterValues.value.antecipacao.length || filterValues.value.antecipacao.includes(r.antecipacao)
    const matchSearch = !q || r.pedido.toLowerCase().includes(q) || r.adquirente.toLowerCase().includes(q) || r.nsu.includes(q)

    let matchDate = true
    if (activeDateRange.value) {
      const d = parseDate(r.dataTransacao)
      matchDate = d && d >= activeDateRange.value.from && d <= activeDateRange.value.to
    }

    return matchAdq && matchBand && matchTipo && matchStatus && matchAntec && matchSearch && matchDate
  })
})

// ── Totalizadores dos cards ───────────────────────────────────────────────────
const totais = computed(() => {
  let bruto = 0, taxas = 0, liquido = 0, pendentes = 0, antecipado = 0
  const adquirentesSet = new Set()

  filteredTransacoes.value.forEach(r => {
    bruto    += r.bruto
    taxas    += r.taxa
    liquido  += r.liquido
    if (r.status === 'Pendente')                                       pendentes  += r.liquido
    if (r.antecipacao === 'Antecipado' || r.antecipacao === 'Parcial') antecipado += r.bruto
    adquirentesSet.add(r.adquirente)
  })

  const taxaMedia = bruto > 0 ? Math.round((taxas / bruto) * 10000) / 100 : 0

  return {
    bruto:        Math.round(bruto * 100) / 100,
    taxas:        Math.round(taxas * 100) / 100,
    liquido:      Math.round(liquido * 100) / 100,
    pendentes:    Math.round(pendentes * 100) / 100,
    adquirentes:  adquirentesSet.size,
    antecipado:   Math.round(antecipado * 100) / 100,
    taxaMedia,
  }
})

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'
const showPct = (v) => overviewValuesVisible.value ? fmtPct(v) : '••••'

// ── Helpers visuais ───────────────────────────────────────────────────────────
const statusSeverity = (s) => ({
  'Pendente':    'warn',
  'Conciliado':  'success',
  'Conferido':   'success',
  'Divergente':  'danger',
  'Antecipado':  'info',
}[s] ?? 'secondary')

const antecSeverity = (a) => ({
  'Antecipado': 'info',
  'Parcial':    'warn',
}[a] ?? 'secondary')

const margemClass = (v) => {
  if (v >= 85) return 'cp-margem--high'
  if (v >= 70) return 'cp-margem--mid'
  return 'cp-margem--low'
}

// ── Seleção ───────────────────────────────────────────────────────────────────
const selectedTransacoes = ref([])

const selectionActionsItems = computed(() => [
  { label: 'Exportar selecionados', icon: 'pi pi-download' },
  { separator: true },
  {
    label: 'Excluir selecionados',
    icon: 'pi pi-trash',
    command: () => { selectedTransacoes.value = [] },
  },
])
const clearSelection = () => { selectedTransacoes.value = [] }

// ── Drawer de transação ───────────────────────────────────────────────────────
const drawerVisible     = ref(false)
const selectedTransacao = ref(null)

const openTransacaoDrawer = (rowData) => {
  selectedTransacao.value = rowData
  drawerVisible.value     = true
}

// ── Tamanho da tabela ─────────────────────────────────────────────────────────
const tableSizeOptions = [
  { label: 'Pequeno', value: 'small' },
  { label: 'Normal',  value: 'normal' },
  { label: 'Grande',  value: 'large' },
]
const tableSize = ref('small')
const settingsPopover = ref()
const toggleSettingsPopover = (e) => settingsPopover.value.toggle(e)
</script>

<template>
  <div class="cp-page">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <div class="cp-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="cp-breadcrumb"
      />
      <div class="cp-title-row">
        <span class="cp-title">Carteiras de POS</span>
        <button class="cp-adq-chip" @click="toggleAdquirentePopover">
          <span>{{ selectedAdquirenteLabel }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="cp-actions-btn"
          @click="toggleHeaderActionsMenu"
        />
        <Menu ref="headerActionsMenu" :model="headerActionsItems" popup />
      </div>
    </div>

    <div class="cp-body">

      <!-- ── Cards KPI ──────────────────────────────────────────────────── -->
      <div class="cp-overview-card">
        <div class="cp-overview-title">
          <span>Visão Geral</span>
          <div class="cp-overview-actions">
            <Button
              :icon="overviewValuesVisible ? 'pi pi-eye' : 'pi pi-eye-slash'"
              variant="text"
              severity="secondary"
              size="small"
              rounded
              v-tooltip.bottom="overviewValuesVisible ? 'Ocultar valores' : 'Exibir valores'"
              @click="overviewValuesVisible = !overviewValuesVisible"
            />
            <Button
              :icon="overviewCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
              variant="text"
              severity="secondary"
              size="small"
              rounded
              v-tooltip.bottom="overviewCollapsed ? 'Expandir' : 'Recolher'"
              @click="overviewCollapsed = !overviewCollapsed"
            />
          </div>
        </div>
        <div v-show="!overviewCollapsed" class="cp-cards-wrap">
          <div class="cp-cards">

            <!-- Total Bruto -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500, #3b82f6)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-dollar cp-kpi-icon cp-kpi-icon--bruto" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Total Bruto</span>
                    <span class="cp-kpi-value">{{ showVal(totais.bruto) }}</span>
                    <span class="cp-kpi-sub">Volume total de vendas</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Taxas -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-orange-500, #f97316)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-percentage cp-kpi-icon cp-kpi-icon--taxas" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Taxas</span>
                    <span class="cp-kpi-value">{{ showVal(totais.taxas) }}</span>
                    <span class="cp-kpi-sub">Cobradas pela adquirente</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Total Líquido -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500, #22c55e)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-check-circle cp-kpi-icon cp-kpi-icon--liquido" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Total Líquido</span>
                    <span class="cp-kpi-value">{{ showVal(totais.liquido) }}</span>
                    <span class="cp-kpi-sub">Após desconto de taxas</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Pendentes -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-yellow-500, #eab308)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-clock cp-kpi-icon cp-kpi-icon--pendentes" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Pendentes</span>
                    <span class="cp-kpi-value">{{ showVal(totais.pendentes) }}</span>
                    <span class="cp-kpi-sub">Aguardando repasse</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Adquirentes -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-purple-500, #a855f7)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-credit-card cp-kpi-icon cp-kpi-icon--adquirentes" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Adquirentes</span>
                    <span class="cp-kpi-value">{{ totais.adquirentes }}</span>
                    <span class="cp-kpi-sub">Ativas no período</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Antecipado -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-cyan-500, #06b6d4)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-bolt cp-kpi-icon cp-kpi-icon--antecipado" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Antecipado</span>
                    <span class="cp-kpi-value">{{ showVal(totais.antecipado) }}</span>
                    <span class="cp-kpi-sub">Adiantamento solicitado</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Taxa Média -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500, #ef4444)' } }">
              <template #content>
                <div class="cp-kpi">
                  <i class="pi pi-chart-line cp-kpi-icon cp-kpi-icon--taxamedia" />
                  <div class="cp-kpi-body">
                    <span class="cp-kpi-label">Taxa Média</span>
                    <span class="cp-kpi-value">{{ showPct(totais.taxaMedia) }}</span>
                    <span class="cp-kpi-sub">Média do período</span>
                  </div>
                </div>
              </template>
            </Card>

          </div>
        </div>
      </div>

      <!-- ── Transações ──────────────────────────────────────────────────── -->
      <div class="cp-transacoes">

        <div class="cp-toolbar-wrap">
          <div class="cp-toolbar">
            <Button
              v-if="filterDefs.some(f => !f.defaultVisible)"
              icon="pi pi-sliders-v"
              variant="text"
              severity="secondary"
              :badge="activeExtraFilterCount > 0 ? String(activeExtraFilterCount) : undefined"
              badge-severity="contrast"
              v-tooltip.bottom="'Filtros'"
              @click="filtersDrawerVisible = true"
            />
            <IconField class="cp-search">
              <InputIcon class="pi pi-search" />
              <InputText v-model="searchValue" placeholder="Buscar" />
            </IconField>
            <SelectButton
              v-model="filterValues.period"
              :options="periodOptions"
              option-label="label"
              option-value="value"
            />
            <DatePicker
              v-model="filterValues.dateRange"
              class="cp-datepicker"
              selection-mode="range"
              date-format="dd/mm/yy"
              show-icon
              icon-display="input"
              placeholder="Período personalizado"
            />
          </div>

          <FilterBar
            v-model="filterValues"
            v-model:filtersDrawerVisible="filtersDrawerVisible"
            :filters="filterDefs"
            :selection-count="selectedTransacoes.length"
            :total-count="filteredTransacoes.length"
            :selection-actions="selectionActionsItems"
            @clear="handleClearFilters"
            @clear-selection="clearSelection"
            @lower-selected="clearSelection"
          />
        </div>

        <DataTable
          v-model:selection="selectedTransacoes"
          :value="filteredTransacoes"
          dataKey="id"
          :size="tableSize === 'normal' ? undefined : tableSize"
          stripedRows
          paginator
          :rows="50"
          :rowsPerPageOptions="[25, 50, 100]"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          :pt="{ table: { style: 'table-layout: fixed; width: 100%' } }"
          @rowClick="openTransacaoDrawer($event.data)"
          class="cp-table"
        >
          <template #empty>
            <div class="cp-empty">
              <i class="pi pi-filter-slash" />
              <span>Nenhum resultado para os filtros aplicados.</span>
              <Button
                label="Limpar filtros"
                icon="pi pi-times"
                size="small"
                severity="secondary"
                @click="handleClearFilters"
              />
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" style="width: 3rem" />

          <Column field="pedido" header="Pedido" style="width: 8rem">
            <template #body="{ data }">
              <span class="cp-pedido-link">{{ data.pedido }}</span>
            </template>
          </Column>

          <Column field="adquirente" header="Adquirente" style="width: 9rem" />

          <Column field="bandeira" header="Bandeira" style="width: 9rem" />

          <Column field="tipo" header="Tipo" style="width: 8rem">
            <template #body="{ data }">
              <Tag
                :value="data.tipo"
                :severity="data.tipo === 'Crédito' ? 'info' : data.tipo === 'Débito' ? 'secondary' : 'warn'"
              />
            </template>
          </Column>

          <Column field="parcelas" header="Parcelas" style="width: 5rem" bodyStyle="text-align: center" />

          <Column
            field="bruto"
            header="Valor Bruto"
            style="width: 9rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">{{ fmtBRL(data.bruto) }}</template>
          </Column>

          <Column
            field="taxaPct"
            header="Taxa (%)"
            style="width: 7rem"
            bodyStyle="text-align: right"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span class="cp-taxa">{{ fmtPct(data.taxaPct) }}</span>
            </template>
          </Column>

          <Column
            field="liquido"
            header="Valor Líquido"
            style="width: 9rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">{{ fmtBRL(data.liquido) }}</template>
          </Column>

          <Column
            field="margem"
            header="Margem (%)"
            style="width: 7rem"
            bodyStyle="text-align: right"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span :class="['cp-margem', margemClass(data.margem)]">{{ fmtPct(data.margem) }}</span>
            </template>
          </Column>

          <Column field="previsaoRepasse" header="Prev. Repasse" style="width: 10rem" />

          <Column field="dataRepasse" header="Data Repasse" style="width: 9rem">
            <template #body="{ data }">
              <span v-if="data.dataRepasse !== '—'">{{ data.dataRepasse }}</span>
              <span v-else class="cp-empty-cell">—</span>
            </template>
          </Column>

          <Column field="status" header="Status" style="width: 9rem">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="statusSeverity(data.status)" />
            </template>
          </Column>

        </DataTable>

      </div>

    </div>

    <!-- ── Drawer de Transação ────────────────────────────────────────────── -->
    <Drawer
      v-model:visible="drawerVisible"
      position="right"
      :header="selectedTransacao?.pedido ?? 'Transação'"
      style="width: 28rem"
    >
      <div v-if="selectedTransacao" class="cp-drawer-body">

        <div class="cp-drawer-section">
          <span class="cp-drawer-section-label">Informações da Transação</span>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">NSU</span>
            <span class="cp-drawer-val cp-drawer-val--mono">{{ selectedTransacao.nsu }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Cód. Autorização</span>
            <span class="cp-drawer-val cp-drawer-val--mono">{{ selectedTransacao.autorizacao }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Terminal ID</span>
            <span class="cp-drawer-val cp-drawer-val--mono">{{ selectedTransacao.terminalId }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Data Transação</span>
            <span class="cp-drawer-val">{{ selectedTransacao.dataTransacao }}</span>
          </div>
        </div>

        <div class="cp-drawer-section">
          <span class="cp-drawer-section-label">Pagamento</span>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Adquirente</span>
            <span class="cp-drawer-val">{{ selectedTransacao.adquirente }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Bandeira</span>
            <span class="cp-drawer-val">{{ selectedTransacao.bandeira }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Tipo</span>
            <Tag
              :value="selectedTransacao.tipo"
              :severity="selectedTransacao.tipo === 'Crédito' ? 'info' : selectedTransacao.tipo === 'Débito' ? 'secondary' : 'warn'"
            />
          </div>
          <div class="cp-drawer-row" v-if="selectedTransacao.tipo === 'Crédito'">
            <span class="cp-drawer-key">Parcelas</span>
            <span class="cp-drawer-val">{{ selectedTransacao.parcelas }}</span>
          </div>
        </div>

        <div class="cp-drawer-section">
          <span class="cp-drawer-section-label">Datas</span>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Prev. Repasse</span>
            <span class="cp-drawer-val">{{ selectedTransacao.previsaoRepasse }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Data Repasse</span>
            <span class="cp-drawer-val">{{ selectedTransacao.dataRepasse }}</span>
          </div>
        </div>

        <div class="cp-drawer-section">
          <span class="cp-drawer-section-label">Status</span>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Status</span>
            <Tag :value="selectedTransacao.status" :severity="statusSeverity(selectedTransacao.status)" />
          </div>
          <div class="cp-drawer-row" v-if="selectedTransacao.antecipacao">
            <span class="cp-drawer-key">Antecipação</span>
            <Tag :value="selectedTransacao.antecipacao" :severity="antecSeverity(selectedTransacao.antecipacao)" />
          </div>
        </div>

        <div class="cp-drawer-section">
          <span class="cp-drawer-section-label">Valores</span>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Valor Bruto</span>
            <span class="cp-drawer-val cp-drawer-val--bold">{{ fmtBRL(selectedTransacao.bruto) }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Taxa ({{ fmtPct(selectedTransacao.taxaPct) }})</span>
            <span class="cp-drawer-val cp-taxa">−{{ fmtBRL(selectedTransacao.taxa) }}</span>
          </div>
          <div class="cp-drawer-divider" />
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Valor Líquido</span>
            <span class="cp-drawer-val cp-drawer-val--bold">{{ fmtBRL(selectedTransacao.liquido) }}</span>
          </div>
          <div class="cp-drawer-row">
            <span class="cp-drawer-key">Margem</span>
            <span :class="['cp-drawer-val', 'cp-margem', margemClass(selectedTransacao.margem)]">
              {{ fmtPct(selectedTransacao.margem) }}
            </span>
          </div>
        </div>

      </div>

      <template #footer>
        <Button
          label="Ver transação completa"
          icon="pi pi-external-link"
          size="small"
          variant="outlined"
          fluid
        />
      </template>
    </Drawer>

    <!-- ── Popover de seleção de adquirente ─────────────────────────────── -->
    <Popover ref="adquirentePopover" class="cp-adq-popover">
      <div class="cp-adq-search">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="adquirenteSearch"
            placeholder="Buscar adquirente..."
            size="small"
            autofocus
          />
        </IconField>
      </div>
      <ul class="cp-adq-list">
        <template v-for="option in filteredAdquirenteOptions" :key="option.label">
          <li v-if="option.type === 'separator'" class="cp-adq-separator">
            {{ option.label }}
          </li>
          <li
            v-else
            class="cp-adq-item"
            :class="{ 'is-selected': option.label === selectedAdquirenteLabel, 'is-featured': option.featured }"
            @click="selectAdquirente(option)"
          >
            <i v-if="option.label === selectedAdquirenteLabel" class="pi pi-check cp-adq-check" />
            <span v-else class="cp-adq-check-placeholder" />
            <i v-if="option.featured" class="pi pi-credit-card cp-adq-featured-icon" />
            <span>{{ option.label }}</span>
          </li>
        </template>
        <li v-if="!filteredAdquirenteOptions.length" class="cp-adq-empty">
          Nenhuma adquirente encontrada
        </li>
      </ul>
    </Popover>

    <!-- ── FAB Configurações ─────────────────────────────────────────────── -->
    <Button
      icon="pi pi-sliders-h"
      rounded
      severity="secondary"
      class="cp-fab"
      @click="toggleSettingsPopover"
      v-tooltip.left="'Configurações da tabela'"
    />

    <Popover ref="settingsPopover" class="cp-settings-popover">
      <div class="cp-settings-content">
        <span class="cp-settings-label">Densidade da tabela</span>
        <SelectButton
          v-model="tableSize"
          :options="tableSizeOptions"
          optionLabel="label"
          optionValue="value"
          size="small"
        />
      </div>
    </Popover>

  </div>
</template>

<style scoped>
.cp-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ───────────────────────────────────────────────────────────────── */
.cp-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cp-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.cp-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cp-title-row .cp-actions-btn {
  margin-left: auto;
}

.cp-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

/* ── Corpo ───────────────────────────────────────────────────────────────────── */
.cp-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Overview card ───────────────────────────────────────────────────────────── */
.cp-overview-card {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.cp-overview-title {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cp-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.cp-cards-wrap {
  padding: 1rem;
}

.cp-cards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.75rem;
}

@media (max-width: 1400px) {
  .cp-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .cp-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── KPI card interno ────────────────────────────────────────────────────────── */
.cp-kpi {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cp-kpi-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.cp-kpi-icon--bruto       { color: var(--p-blue-500,   #3b82f6); }
.cp-kpi-icon--taxas       { color: var(--p-orange-500, #f97316); }
.cp-kpi-icon--liquido     { color: var(--p-green-500,  #22c55e); }
.cp-kpi-icon--pendentes   { color: var(--p-yellow-500, #eab308); }
.cp-kpi-icon--adquirentes { color: var(--p-purple-500, #a855f7); }
.cp-kpi-icon--antecipado  { color: var(--p-cyan-500,   #06b6d4); }
.cp-kpi-icon--taxamedia   { color: var(--p-red-500,    #ef4444); }

.cp-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cp-kpi-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.cp-kpi-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
  white-space: nowrap;
}

.cp-kpi-sub {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Seção Transações ────────────────────────────────────────────────────────── */
.cp-transacoes {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  overflow: hidden;
}

/* ── Toolbar da tabela ───────────────────────────────────────────────────────── */
.cp-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cp-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.cp-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.cp-search :deep(.p-inputtext) { width: 100%; }

.cp-datepicker {
  width: 13rem;
  flex-shrink: 0;
}

/* ── Tabela ──────────────────────────────────────────────────────────────────── */
.cp-table {
  font-size: 0.8125rem;
}

.cp-table :deep(tr) {
  cursor: pointer;
}

.cp-table :deep(th) {
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cp-table :deep(td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Elementos da tabela ─────────────────────────────────────────────────────── */
.cp-pedido-link {
  color: var(--p-primary-color);
  font-weight: 600;
  cursor: pointer;
}

.cp-pedido-link:hover {
  text-decoration: underline;
}

.cp-taxa {
  color: var(--p-orange-500, #f97316);
  font-weight: 500;
}

.cp-margem {
  font-weight: 600;
}

.cp-margem--high { color: var(--p-green-600,  #16a34a); }
.cp-margem--mid  { color: var(--p-yellow-600, #ca8a04); }
.cp-margem--low  { color: var(--p-red-500,    #ef4444); }

.cp-empty-cell {
  color: var(--p-text-muted-color);
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.cp-empty .pi {
  font-size: 2rem;
  opacity: 0.5;
}

/* ── Drawer ──────────────────────────────────────────────────────────────────── */
.cp-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.25rem 0;
}

.cp-drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cp-drawer-section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cp-drawer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 1.75rem;
}

.cp-drawer-key {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.cp-drawer-val {
  font-size: 0.8125rem;
  color: var(--p-text-color);
  text-align: right;
}

.cp-drawer-val--bold {
  font-weight: 700;
}

.cp-drawer-val--mono {
  font-family: 'Courier New', monospace;
  font-size: 0.8125rem;
  letter-spacing: 0.03em;
}

.cp-drawer-divider {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

/* ── FAB ─────────────────────────────────────────────────────────────────────── */
.cp-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 50;
}

/* ── Settings popover ────────────────────────────────────────────────────────── */
.cp-settings-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem;
}

.cp-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

/* ── Chip de adquirente ──────────────────────────────────────────────────────── */
.cp-adq-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
  transition: background 0.15s, border-color 0.15s;
  line-height: 1.5;
}

.cp-adq-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.cp-adq-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Popover de adquirente ───────────────────────────────────────────────────── */
.cp-adq-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 16rem;
}

.cp-adq-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cp-adq-search :deep(.p-inputtext) {
  width: 100%;
}

.cp-adq-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.cp-adq-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--p-text-color);
  transition: background 0.1s;
  user-select: none;
}

.cp-adq-item:hover {
  background: var(--p-surface-hover);
}

.cp-adq-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.cp-adq-item.is-featured {
  font-weight: 600;
  color: var(--p-primary-700, #1d4ed8);
}

.cp-adq-item.is-featured.is-selected {
  color: var(--p-primary-600, #2563eb);
}

.cp-adq-featured-icon {
  font-size: 0.625rem;
  color: var(--p-primary-400, #60a5fa);
  margin-right: 0.125rem;
}

.cp-adq-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.cp-adq-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.cp-adq-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.cp-adq-empty {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  text-align: center;
}
</style>
