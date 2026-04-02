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
import InputNumber from 'primevue/inputnumber'
import Popover from 'primevue/popover'
import Drawer from 'primevue/drawer'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import FilterBar from '@/components/FilterBar.vue'
import { PERIODO_OPTIONS_PAGAR, buildDateRange } from '@/composables/usePeriodFilter'
import { useLancamentosStore } from '@/stores/lancamentos'
import * as lancamentosService from '@/services/lancamentosService'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

// ── Seletor de canal (chip) ───────────────────────────────────────────────────
const TODOS_LABEL = 'Todos os marketplaces'
const canalOptions = [
  { type: 'item', label: TODOS_LABEL, featured: true },
  { type: 'separator', label: 'Marketplaces' },
  { type: 'item', label: 'Mercado Livre' },
  { type: 'item', label: 'Shopee' },
  { type: 'item', label: 'Amazon' },
  { type: 'item', label: 'Magalu' },
  { type: 'item', label: 'Americanas' },
]
const selectedCanalLabel = ref(TODOS_LABEL)
const canalPopover = ref()
const canalSearch = ref('')
const filteredCanalOptions = computed(() => {
  const q = canalSearch.value.toLowerCase()
  if (!q) return canalOptions
  return canalOptions.filter(c => c.type === 'item' && c.label.toLowerCase().includes(q))
})
const toggleCanalPopover = (e) => canalPopover.value.toggle(e)
const selectCanal = (option) => {
  selectedCanalLabel.value = option.label
  filterValues.value = {
    ...filterValues.value,
    canal: option.label === TODOS_LABEL ? [] : [option.label],
  }
  canalPopover.value.hide()
  canalSearch.value = ''
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [
  { label: 'Financeiro' },
  { label: 'Entradas' },
  { label: 'Carteiras de Marketplace' },
]

// ── Menu de ações do header ───────────────────────────────────────────────────
const headerActionsMenu = ref()
const headerActionsItems = ref([
  { label: 'Importar registros', icon: 'pi pi-upload' },
  { label: 'Exportar',           icon: 'pi pi-download' },
  { label: 'Imprimir',           icon: 'pi pi-print' },
  { separator: true },
  { label: 'Ajustes das carteiras', icon: 'pi pi-cog', command: () => { openAjustesDrawer() } },
])
const toggleHeaderActionsMenu = (e) => headerActionsMenu.value.toggle(e)

// ── Configuração por marketplace ──────────────────────────────────────────────
const marketplaceConfig = ref({
  'Mercado Livre': { taxaComissao: 14, prazoLiberacao: 14, taxaAntecipacao: 3.5, taxaChargeback: 0 },
  'Shopee':        { taxaComissao: 12, prazoLiberacao: 7,  taxaAntecipacao: 2.8, taxaChargeback: 0 },
  'Amazon':        { taxaComissao: 15, prazoLiberacao: 14, taxaAntecipacao: 3.0, taxaChargeback: 0 },
  'Magalu':        { taxaComissao: 13, prazoLiberacao: 30, taxaAntecipacao: 2.5, taxaChargeback: 0 },
  'Americanas':    { taxaComissao: 13.5, prazoLiberacao: 30, taxaAntecipacao: 3.0, taxaChargeback: 0 },
})

// ── Drawer de ajustes ─────────────────────────────────────────────────────────
const ajustesDrawerVisible = ref(false)
const ajustesTemp = ref({})

const openAjustesDrawer = () => {
  ajustesTemp.value = JSON.parse(JSON.stringify(marketplaceConfig.value))
  ajustesDrawerVisible.value = true
}

const salvarAjustes = () => {
  marketplaceConfig.value = JSON.parse(JSON.stringify(ajustesTemp.value))
  ajustesDrawerVisible.value = false
  regenerateRepasses()
  toast.add({ severity: 'success', summary: 'Ajustes salvos', detail: 'Taxas atualizadas com sucesso.', life: 3000 })
}

// ── Lojas por canal ────────────────────────────────────────────────────────────
const _lojasPorCanal = {
  'Mercado Livre': ['ML Loja Oficial', 'ML Loja 2', 'ML Atacado'],
  'Shopee':        ['Shopee Store', 'Shopee Mall', 'Shopee Premium'],
  'Amazon':        ['Amazon FBA', 'Amazon Seller Direct'],
  'Magalu':        ['Magalu Loja 1', 'Magalu Atacado'],
  'Americanas':    ['Americanas Store'],
}

// ── Filtros ───────────────────────────────────────────────────────────────────
const periodOptions = PERIODO_OPTIONS_PAGAR

const filterValues = ref({
  period:    'mes',
  dateRange: null,
  canal:     [],
  loja:      [],
  status:    [],
})

watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

watch(() => filterValues.value.loja, (lojas) => {
  const canaisDasLojas = [...new Set(
    lojas.map(loja => Object.keys(_lojasPorCanal).find(c => _lojasPorCanal[c].includes(loja))).filter(Boolean)
  )]
  filterValues.value = { ...filterValues.value, canal: canaisDasLojas }
  selectedCanalLabel.value = canaisDasLojas.length === 1 ? canaisDasLojas[0] : TODOS_LABEL
})

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) return { from: dateRange[0], to: dateRange[1] ?? dateRange[0] }
  return buildDateRange(period)
})

const lojaOptions = computed(() => {
  const canaisSelecionados = filterValues.value.canal
  const source = canaisSelecionados.length
    ? canaisSelecionados
    : Object.keys(_lojasPorCanal)
  return [...new Set(source.flatMap(c => _lojasPorCanal[c] ?? []))]
})

const filterDefs = computed(() => [
  {
    id: 'canal', type: 'multiselect', label: 'Canal', defaultVisible: true,
    options: ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu', 'Americanas'],
    width: '12rem',
  },
  {
    id: 'loja', type: 'multiselect', label: 'Loja', defaultVisible: true,
    options: lojaOptions.value,
    width: '14rem',
  },
  {
    id: 'status', type: 'multiselect', label: 'Status', defaultVisible: true,
    options: ['Retido', 'A Liberar', 'Liberado', 'Antecipado', 'Antecipado parcialmente', 'Conciliado', 'Divergente'],
    width: '15rem',
  },
])

const searchValue = ref('')

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = {
    period: 'mes', dateRange: null,
    canal: [], loja: [], status: [],
  }
}

const filtersDrawerVisible = ref(false)

const activeExtraFilterCount = computed(() =>
  filterDefs.value.filter(f => !f.pinned).filter(f => {
    const val = filterValues.value[f.id]
    if (val == null || val === '') return false
    if (Array.isArray(val)) return val.length > 0
    return true
  }).length,
)

// ── Mock data ─────────────────────────────────────────────────────────────────
const _canais       = ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu', 'Americanas']
const _statusList   = ['A Liberar', 'Liberado', 'Retido', 'Conciliado', 'Divergente']
const _confList     = ['Conferido', 'Diferença', 'Não conferido']
const _antecList    = ['Antecipado', 'Antecipado parcialmente', '', '', ''] // '' = sem antecipação (mais comum)

const _fmtDate = (d) => {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

const _brutosBase = [
  189.90, 234.50, 412.00, 78.00, 560.00, 1200.00, 89.90, 345.00, 670.00,
  990.00, 123.50, 456.00, 788.00, 55.00, 2100.00, 310.00, 765.00, 499.90,
  1340.00, 87.50, 230.00, 890.00, 1650.00, 44.90, 620.00,
]

const generateRepasses = () =>
  Array.from({ length: 110 }, (_, i) => {
    let start
    if (i < 80) {
      start = new Date(2026, 2, 1)
      start.setDate(start.getDate() + Math.round((i / 79) * 3))
    } else {
      start = new Date(2026, 1, 1)
      start.setDate(start.getDate() + Math.round(((i - 80) / 29) * 27))
    }
    const canal     = _canais[i % _canais.length]
    const status    = _statusList[i % _statusList.length]
    const conf      = _confList[i % _confList.length]
    const antec     = _antecList[i % _antecList.length]
    const bruto     = _brutosBase[i % _brutosBase.length]
    const taxaPct   = (marketplaceConfig.value[canal]?.taxaComissao ?? 14) / 100
    const taxa      = Math.round(bruto * taxaPct * 100) / 100
    const liquido   = Math.round((bruto - taxa) * 100) / 100

    // Recebido: conferido = igual ao líquido; diferença = um pouco diferente; não conferido = 0
    let recebido
    if (conf === 'Conferido')     recebido = liquido
    else if (conf === 'Diferença') recebido = Math.round((liquido * (0.94 + (i % 7) * 0.01)) * 100) / 100
    else                           recebido = 0

    const diferenca = Math.round((recebido - liquido) * 100) / 100

    const loja = _lojasPorCanal[canal][i % _lojasPorCanal[canal].length]

    return {
      id:         i + 1,
      pedido:     `#${100000 + i * 137}`,
      canal,
      loja,
      dataRepasse: _fmtDate(start),
      bruto,
      taxa,
      liquido,
      recebido,
      diferenca,
      conciliacaoBancaria: diferenca === 0 && i % 3 === 0 ? 'Conciliado' : null,
      status,
      antecipacao: antec,
      conferencia: conf,
    }
  })

const repasses = ref(generateRepasses())
const regenerateRepasses = () => { repasses.value = generateRepasses() }

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  const [d, m, y] = str.split('/')
  return new Date(y, m - 1, d)
}

const filteredRepasses = computed(() =>
  repasses.value.filter(r => {
    const matchCanal  = !filterValues.value.canal.length       || filterValues.value.canal.includes(r.canal)
    const matchLoja   = !filterValues.value.loja.length        || filterValues.value.loja.includes(r.loja)
    const antecStatuses = ['Antecipado', 'Antecipado parcialmente']
    const matchStatus = !filterValues.value.status.length || (
      antecStatuses.some(a => filterValues.value.status.includes(a))
        ? filterValues.value.status.includes(r.antecipacao) || filterValues.value.status.includes(r.status)
        : filterValues.value.status.includes(r.status)
    )

    let matchDate = true
    if (activeDateRange.value) {
      const d = parseDate(r.dataRepasse)
      matchDate = d >= activeDateRange.value.from && d <= activeDateRange.value.to
    }

    const q = searchValue.value.toLowerCase()
    const matchSearch = !q || r.pedido.toLowerCase().includes(q) || r.canal.toLowerCase().includes(q) || r.loja?.toLowerCase().includes(q)

    return matchCanal && matchLoja && matchStatus && matchDate && matchSearch
  })
)

// ── Totalizadores dos cards ───────────────────────────────────────────────────
const totais = computed(() => {
  let bruto = 0, taxas = 0, retido = 0, aLiberar = 0, liberado = 0, valorDiferencas = 0
  filteredRepasses.value.forEach(r => {
    bruto     += r.bruto
    taxas     += r.taxa
    if (r.status === 'Retido')      retido    += r.liquido
    if (r.status === 'A Liberar')   aLiberar  += r.liquido
    if (r.status === 'Liberado' || r.status === 'Conciliado') liberado += r.liquido
    if (r.conferencia === 'Diferença') valorDiferencas += Math.abs(r.diferenca)
  })
  return {
    bruto:           Math.round(bruto * 100) / 100,
    taxas:           Math.round(taxas * 100) / 100,
    retido:          Math.round(retido * 100) / 100,
    aLiberar:        Math.round(aLiberar * 100) / 100,
    liberado:        Math.round(liberado * 100) / 100,
    valorDiferencas: Math.round(valorDiferencas * 100) / 100,
  }
})

const diferencas = computed(() =>
  filteredRepasses.value.filter(r => r.conferencia === 'Diferença').length
)


// ── Formatação ────────────────────────────────────────────────────────────────
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'

// ── Helpers visuais ───────────────────────────────────────────────────────────
const statusEfetivo = (data) => {
  if (data.antecipacao) return data.antecipacao
  return data.status
}

const statusSeverity = (s) => ({
  'A Liberar':              'warn',
  'Liberado':               'success',
  'Retido':                 'danger',
  'Conciliado':             'success',
  'Divergente':             'danger',
  'Antecipado':             'info',
  'Antecipado parcialmente':'warn',
}[s] ?? 'secondary')

const statusTooltip = (s) => ({
  'A Liberar':              'Pendente de liberação pelo marketplace',
  'Liberado':               'Valor liberado e disponível para saque',
  'Retido':                 'Retido por disputa, chargeback ou análise de risco',
  'Conciliado':             'Conferido e conciliado com o extrato bancário',
  'Divergente':             'Valor recebido difere do esperado pelo marketplace',
  'Antecipado':             'Valor antecipado integralmente',
  'Antecipado parcialmente':'Parte do valor foi antecipado; restante segue prazo normal',
}[s] ?? '')

const confSeverity = (c) => ({
  'Conferido':     'success',
  'Diferença':     'warn',
  'Não conferido': 'secondary',
}[c] ?? 'secondary')


const diferencaClass = (v) => {
  if (v === 0)  return 'cm-diff--zero'
  if (v < 0)    return 'cm-diff--neg'
  return 'cm-diff--pos'
}

// ── Menu de ações por linha ───────────────────────────────────────────────────
const actionMenu    = ref()
const actionRow     = ref(null)

const openActionMenu = (event, row) => {
  actionRow.value = row
  actionMenu.value.toggle(event)
}

const rowMenuItems = computed(() => {
  const row = actionRow.value
  if (!row) return []
  const items = []
  if (row.diferenca !== 0) {
    items.push({ label: 'Lançar diferença', icon: 'pi pi-wallet', command: () => openDiferencaModal(row) })
  }
  if (row.canal === 'Mercado Livre') {
    if (items.length) items.push({ separator: true })
    items.push({ label: 'Abrir Chamado no Mercado Livre', icon: 'pi pi-external-link' })
  }
  return items
})

// ── Drawer Lançar Diferença ─────────────────────────────────────────────────
const diferencaDrawerVisible = ref(false)
const diferencaRow = ref(null)
const diferencaCategoria = ref(null)
const diferencaCategorias = [
  { label: 'Perda',             icon: 'pi pi-times-circle', value: 'Perda' },
  { label: 'Recuperado',        icon: 'pi pi-check-circle', value: 'Recuperado' },
  { label: 'Custo Operacional', icon: 'pi pi-cog',          value: 'Custo Operacional' },
  { label: 'Custo Contábil',    icon: 'pi pi-book',         value: 'Custo Contábil' },
]

const openDiferencaModal = (row) => {
  diferencaRow.value = row
  diferencaCategoria.value = null
  diferencaDrawerVisible.value = true
}

const diferencaSaving = ref(false)

const confirmarDiferenca = async () => {
  if (!diferencaRow.value || !diferencaCategoria.value) return
  diferencaSaving.value = true
  try {
    const row = diferencaRow.value
    const [d, m, y] = row.dataRepasse.split('/')
    const dataISO = `${y}-${m}-${d}`
    const raw = await lancamentosService.create({
      tipo: 'Saída',
      valor: lancamentosService.toCents(Math.abs(row.diferenca)),
      data: dataISO,
      situacao: 'Paga',
      categoria: diferencaCategoria.value,
      descricao: `Diferença ${row.canal} - Pedido ${row.pedido}`,
      canal_venda: row.canal,
    })
    const lancamentosStore = useLancamentosStore()
    lancamentosStore.items.unshift({
      id: raw.id,
      tipo: raw.tipo,
      valor: lancamentosService.fromCents(raw.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      data: row.dataRepasse,
      situacao: raw.situacao,
      categoria: raw.categoria,
      descricao: raw.descricao,
      canalVenda: raw.canal_venda,
    })
    diferencaDrawerVisible.value = false
    toast.add({ severity: 'success', summary: 'Lançamento criado', detail: `${diferencaCategoria.value} — ${fmtBRL(Math.abs(row.diferenca))}`, life: 3000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível criar o lançamento.', life: 4000 })
  } finally {
    diferencaSaving.value = false
  }
}

// ── Seleção ───────────────────────────────────────────────────────────────────
const selectedRepasses = ref([])

const selectionActionsItems = computed(() => {
  const single = selectedRepasses.value.length === 1 ? selectedRepasses.value[0] : null
  const items = [
    { label: 'Exportar selecionados', icon: 'pi pi-download' },
    { separator: true },
    { label: 'Excluir selecionados', icon: 'pi pi-trash', command: () => { selectedRepasses.value = [] } },
  ]
  if (single) {
    items.unshift(
      { label: 'Lançar diferença', icon: 'pi pi-wallet', command: () => openDiferencaModal(single) },
      ...(single.canal === 'Mercado Livre'
        ? [{ separator: true }, { label: 'Abrir Chamado no Mercado Livre', icon: 'pi pi-external-link' }]
        : []),
      { separator: true },
    )
  }
  return items
})
const clearSelection = () => { selectedRepasses.value = [] }

// ── Drawer de pedido ──────────────────────────────────────────────────────────
const drawerVisible  = ref(false)
const selectedPedido = ref(null)

const openPedidoDrawer = (rowData) => {
  selectedPedido.value = rowData
  drawerVisible.value  = true
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
  <div class="cm-page">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <div class="cm-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="cm-breadcrumb"
      />
      <div class="cm-title-row">
        <span class="cm-title">Carteiras de Marketplace</span>
        <button class="cm-canal-chip" @click="toggleCanalPopover">
          <span>{{ selectedCanalLabel }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="cm-actions-btn"
          @click="toggleHeaderActionsMenu"
        />
        <Menu ref="headerActionsMenu" :model="headerActionsItems" popup />
      </div>
    </div>

    <div class="cm-body">

      <!-- ── Cards overview ─────────────────────────────────────────────── -->
      <div class="cm-overview-card">
        <div class="cm-overview-title">
          <span>Visão Geral</span>
          <div class="cm-overview-actions">
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
        <div v-show="!overviewCollapsed" class="cm-cards-wrap">
          <div class="cm-cards">

            <!-- Valor Bruto -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500, #3b82f6)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-dollar cm-kpi-icon cm-kpi-icon--bruto" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">Valor Bruto</span>
                    <span class="cm-kpi-value">{{ showVal(totais.bruto) }}</span>
                    <span class="cm-kpi-sub">Total de vendas</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Taxas -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-orange-500, #f97316)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-percentage cm-kpi-icon cm-kpi-icon--taxas" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">Taxas</span>
                    <span class="cm-kpi-value">{{ showVal(totais.taxas) }}</span>
                    <span class="cm-kpi-sub">Cobradas pelo marketplace</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Retido -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500, #ef4444)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-lock cm-kpi-icon cm-kpi-icon--retido" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">Retido</span>
                    <span class="cm-kpi-value">{{ showVal(totais.retido) }}</span>
                    <span class="cm-kpi-sub">Aguardando liberação</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- A Liberar -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-yellow-500, #eab308)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-clock cm-kpi-icon cm-kpi-icon--aliberar" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">A Liberar</span>
                    <span class="cm-kpi-value">{{ showVal(totais.aLiberar) }}</span>
                    <span class="cm-kpi-sub">Previsto para repasse</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Liberado -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500, #22c55e)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-check-circle cm-kpi-icon cm-kpi-icon--liberado" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">Liberado</span>
                    <span class="cm-kpi-value">{{ showVal(totais.liberado) }}</span>
                    <span class="cm-kpi-sub">Já repassado</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Diferenças -->
            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-yellow-400, #facc15)' } }">
              <template #content>
                <div class="cm-kpi">
                  <i class="pi pi-exclamation-triangle cm-kpi-icon cm-kpi-icon--diferencas" />
                  <div class="cm-kpi-body">
                    <span class="cm-kpi-label">Diferenças</span>
                    <span class="cm-kpi-value">{{ showVal(totais.valorDiferencas) }}</span>
                    <span class="cm-kpi-sub">{{ diferencas }} repasse{{ diferencas !== 1 ? 's' : '' }} com divergência</span>
                  </div>
                </div>
              </template>
            </Card>

          </div>
        </div>


      </div>

      <!-- ── Repasses ────────────────────────────────────────────────────── -->
      <div class="cm-repasses">

        <div class="cm-toolbar-wrap">
          <div class="cm-toolbar">
            <Button
              v-if="filterDefs.some(f => !f.pinned)"
              icon="pi pi-sliders-v"
              variant="text"
              severity="secondary"
              :badge="activeExtraFilterCount > 0 ? String(activeExtraFilterCount) : undefined"
              badge-severity="contrast"
              v-tooltip.bottom="'Filtros'"
              @click="filtersDrawerVisible = true"
            />
            <IconField class="cm-search">
              <InputIcon class="pi pi-search" />
              <InputText v-model="searchValue" placeholder="Pesquise por pedido ou canal..." />
            </IconField>
            <SelectButton
              v-model="filterValues.period"
              :options="periodOptions"
              option-label="label"
              option-value="value"
            />
            <DatePicker
              v-model="filterValues.dateRange"
              class="cm-datepicker"
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
            :selection-count="selectedRepasses.length"
            :total-count="filteredRepasses.length"
            :selection-actions="selectionActionsItems"
            @clear="handleClearFilters"
            @clear-selection="clearSelection"
            @lower-selected="clearSelection"
          />
        </div>

        <DataTable
          v-model:selection="selectedRepasses"
          :value="filteredRepasses"
          dataKey="id"
          :size="tableSize === 'normal' ? undefined : tableSize"
          stripedRows
          paginator
          :rows="50"
          :rowsPerPageOptions="[25, 50, 100]"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          :pt="{ table: { style: 'table-layout: fixed; width: 100%' } }"
          @rowClick="openPedidoDrawer($event.data)"
          class="cm-table"
        >
          <template #empty>
            <div class="cm-empty">
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
              <span class="cm-pedido-link">{{ data.pedido }}</span>
            </template>
          </Column>
          <Column field="canal" header="Canal" style="width: 10rem" />
          <Column field="dataRepasse" header="Data Repasse" style="width: 9rem" />
          <Column field="status" header="Status" style="width: 12rem">
            <template #body="{ data }">
              <Tag
                v-tooltip.right="statusTooltip(statusEfetivo(data))"
                :value="statusEfetivo(data)"
                :severity="statusSeverity(statusEfetivo(data))"
                :pt="{ root: { style: { whiteSpace: 'nowrap', cursor: 'help' } } }"
              />
            </template>
          </Column>
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
            field="taxa"
            header="Taxas"
            style="width: 8rem"
            bodyStyle="text-align: right"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span class="cm-taxa">{{ fmtBRL(data.taxa) }}</span>
            </template>
          </Column>
          <Column
            field="liquido"
            header="Líquido Esperado"
            style="width: 10rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">{{ fmtBRL(data.liquido) }}</template>
          </Column>
          <Column
            field="recebido"
            header="Recebido"
            style="width: 9rem"
            bodyStyle="text-align: right"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span v-if="data.recebido > 0">{{ fmtBRL(data.recebido) }}</span>
              <span v-else class="cm-recebido-nao">—</span>
            </template>
          </Column>
          <Column
            field="diferenca"
            header="Diferença"
            style="width: 9rem"
            bodyStyle="text-align: right"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span :class="['cm-diff', diferencaClass(data.diferenca)]">
                {{ data.recebido > 0 ? fmtBRL(data.diferenca) : '—' }}
              </span>
            </template>
          </Column>
          <Column style="width: 3rem" bodyStyle="text-align: center">
            <template #body="{ data }">
              <Button
                icon="pi pi-ellipsis-v"
                variant="text"
                severity="secondary"
                size="small"
                rounded
                @click.stop="openActionMenu($event, data)"
              />
            </template>
          </Column>
        </DataTable>

        <Menu ref="actionMenu" :model="rowMenuItems" popup />

      </div>

    </div>

    <!-- ── Drawer de Pedido ───────────────────────────────────────────────── -->
    <Drawer
      v-model:visible="drawerVisible"
      position="right"
      :header="selectedPedido?.pedido ?? 'Pedido'"
      style="width: 28rem"
    >
      <div v-if="selectedPedido" class="cm-drawer-body">
        <div class="cm-drawer-section">
          <span class="cm-drawer-section-label">Informações do Repasse</span>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Canal</span>
            <span class="cm-drawer-val">{{ selectedPedido.canal }}</span>
          </div>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Data do Repasse</span>
            <span class="cm-drawer-val">{{ selectedPedido.dataRepasse }}</span>
          </div>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Status</span>
            <Tag :value="statusEfetivo(selectedPedido)" :severity="statusSeverity(statusEfetivo(selectedPedido))" />
          </div>
        </div>

        <div class="cm-drawer-section">
          <span class="cm-drawer-section-label">Valores</span>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Valor Bruto</span>
            <span class="cm-drawer-val cm-drawer-val--bold">{{ fmtBRL(selectedPedido.bruto) }}</span>
          </div>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Taxas</span>
            <span class="cm-drawer-val cm-taxa">−{{ fmtBRL(selectedPedido.taxa) }}</span>
          </div>
          <div class="cm-drawer-divider" />
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Líquido Esperado</span>
            <span class="cm-drawer-val cm-drawer-val--bold">{{ fmtBRL(selectedPedido.liquido) }}</span>
          </div>
          <div class="cm-drawer-row">
            <span class="cm-drawer-key">Recebido</span>
            <span class="cm-drawer-val cm-drawer-val--bold">
              {{ selectedPedido.recebido > 0 ? fmtBRL(selectedPedido.recebido) : '—' }}
            </span>
          </div>
          <div v-if="selectedPedido.recebido > 0" class="cm-drawer-row">
            <span class="cm-drawer-key">Diferença</span>
            <span :class="['cm-drawer-val', 'cm-diff', diferencaClass(selectedPedido.diferenca)]">
              {{ fmtBRL(selectedPedido.diferenca) }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Ver pedido completo"
          icon="pi pi-external-link"
          size="small"
          variant="outlined"
          fluid
        />
      </template>
    </Drawer>

    <!-- ── Popover de seleção de canal ──────────────────────────────────── -->
    <Popover ref="canalPopover" class="cm-canal-popover">
      <div class="cm-canal-search">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="canalSearch"
            placeholder="Buscar marketplace..."
            size="small"
            autofocus
          />
        </IconField>
      </div>
      <ul class="cm-canal-list">
        <template v-for="option in filteredCanalOptions" :key="option.label">
          <li v-if="option.type === 'separator'" class="cm-canal-separator">
            {{ option.label }}
          </li>
          <li
            v-else
            class="cm-canal-item"
            :class="{ 'is-selected': option.label === selectedCanalLabel, 'is-featured': option.featured }"
            @click="selectCanal(option)"
          >
            <i v-if="option.label === selectedCanalLabel" class="pi pi-check cm-canal-check" />
            <span v-else class="cm-canal-check-placeholder" />
            <i v-if="option.featured" class="pi pi-shopping-bag cm-canal-featured-icon" />
            <span>{{ option.label }}</span>
          </li>
        </template>
        <li v-if="!filteredCanalOptions.length" class="cm-canal-empty">
          Nenhum marketplace encontrado
        </li>
      </ul>
    </Popover>

    <!-- ── FAB Configurações ─────────────────────────────────────────────── -->
    <Button
      icon="pi pi-sliders-h"
      rounded
      severity="secondary"
      class="cm-fab"
      @click="toggleSettingsPopover"
      v-tooltip.left="'Configurações da tabela'"
    />

    <Popover ref="settingsPopover" class="cm-settings-popover">
      <div class="cm-settings-content">
        <span class="cm-settings-label">Densidade da tabela</span>
        <SelectButton
          v-model="tableSize"
          :options="tableSizeOptions"
          optionLabel="label"
          optionValue="value"
          size="small"
        />
      </div>
    </Popover>

    <!-- Modal Lançar Diferença -->
    <Dialog v-model:visible="diferencaDrawerVisible" header="Lançar diferença" modal :style="{ width: '26rem' }">
      <div v-if="diferencaRow" class="cm-diferenca-modal">
        <div class="cm-diferenca-info-row">
          <span class="cm-diferenca-info-label">Pedido</span>
          <span class="cm-diferenca-info-value">{{ diferencaRow.pedido }}</span>
        </div>
        <div class="cm-diferenca-info-row">
          <span class="cm-diferenca-info-label">Canal</span>
          <span class="cm-diferenca-info-value">{{ diferencaRow.canal }}</span>
        </div>
        <div class="cm-diferenca-info-row">
          <span class="cm-diferenca-info-label">Diferença</span>
          <span class="cm-diferenca-info-value" :class="diferencaClass(diferencaRow.diferenca)">
            {{ fmtBRL(Math.abs(diferencaRow.diferenca)) }}
          </span>
        </div>

        <div class="cm-diferenca-field">
          <label class="cm-diferenca-field-label">Categoria do lançamento</label>
          <Select
            v-model="diferencaCategoria"
            :options="diferencaCategorias"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecione a categoria"
            class="cm-diferenca-select"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" variant="text" @click="diferencaDrawerVisible = false" />
        <Button
          label="Confirmar"
          icon="pi pi-check"
          :disabled="!diferencaCategoria"
          :loading="diferencaSaving"
          @click="confirmarDiferenca"
        />
      </template>
    </Dialog>

    <!-- ── Drawer de Ajustes das Carteiras ──────────────────────────────── -->
    <Drawer
      v-model:visible="ajustesDrawerVisible"
      position="right"
      header="Ajustes das Carteiras"
      style="width: 28rem"
    >
      <div class="cm-ajustes-body">
        <div
          v-for="(config, canal) in ajustesTemp"
          :key="canal"
          class="cm-ajustes-marketplace"
        >
          <div class="cm-ajustes-marketplace-header">
            <i v-if="canal === 'Mercado Livre'" class="pi pi-lock cm-ajustes-lock-icon" />
            <span class="cm-ajustes-marketplace-name">{{ canal }}</span>
            <Tag
              v-if="canal === 'Mercado Livre'"
              value="Somente leitura"
              severity="secondary"
              :pt="{ root: { style: 'font-size: 0.625rem' } }"
            />
          </div>

          <div class="cm-ajustes-fields">
            <div class="cm-ajustes-field">
              <label>Comissão</label>
              <InputNumber
                v-model="config.taxaComissao"
                :disabled="canal === 'Mercado Livre'"
                :min-fraction-digits="1"
                :max-fraction-digits="2"
                :step="0.1"
                suffix=" %"
                size="small"
                fluid
                v-tooltip.top="canal === 'Mercado Livre' ? 'Valores definidos pelo Mercado Livre' : ''"
              />
            </div>
            <div class="cm-ajustes-field">
              <label>Prazo liberação</label>
              <InputNumber
                v-model="config.prazoLiberacao"
                :disabled="canal === 'Mercado Livre'"
                suffix=" dias"
                size="small"
                fluid
                v-tooltip.top="canal === 'Mercado Livre' ? 'Valores definidos pelo Mercado Livre' : ''"
              />
            </div>
            <div class="cm-ajustes-field">
              <label>Antecipação</label>
              <InputNumber
                v-model="config.taxaAntecipacao"
                :disabled="canal === 'Mercado Livre'"
                :min-fraction-digits="1"
                :max-fraction-digits="2"
                :step="0.1"
                suffix=" %"
                size="small"
                fluid
                v-tooltip.top="canal === 'Mercado Livre' ? 'Valores definidos pelo Mercado Livre' : ''"
              />
            </div>
            <div class="cm-ajustes-field">
              <label>Chargeback</label>
              <InputNumber
                v-model="config.taxaChargeback"
                :disabled="canal === 'Mercado Livre'"
                :min-fraction-digits="1"
                :max-fraction-digits="2"
                :step="0.1"
                suffix=" %"
                size="small"
                fluid
                v-tooltip.top="canal === 'Mercado Livre' ? 'Valores definidos pelo Mercado Livre' : ''"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Salvar ajustes"
          icon="pi pi-check"
          @click="salvarAjustes"
          fluid
        />
      </template>
    </Drawer>

  </div>
</template>

<style scoped>
.cm-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ───────────────────────────────────────────────────────────────── */
.cm-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cm-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.cm-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cm-title-row .cm-actions-btn {
  margin-left: auto;
}

.cm-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

/* ── Corpo ───────────────────────────────────────────────────────────────────── */
.cm-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Overview card ───────────────────────────────────────────────────────────── */
.cm-overview-card {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.cm-overview-title {
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

.cm-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.cm-cards-wrap {
  padding: 1rem;
}

.cm-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

@media (max-width: 1200px) {
  .cm-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .cm-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── KPI card interno ────────────────────────────────────────────────────────── */
.cm-kpi {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cm-kpi-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.cm-kpi-icon--bruto      { color: var(--p-blue-500,   #3b82f6); }
.cm-kpi-icon--taxas      { color: var(--p-orange-500, #f97316); }
.cm-kpi-icon--retido     { color: var(--p-red-500,    #ef4444); }
.cm-kpi-icon--aliberar   { color: var(--p-yellow-500, #eab308); }
.cm-kpi-icon--liberado   { color: var(--p-green-500,  #22c55e); }
.cm-kpi-icon--diferencas { color: var(--p-yellow-400, #facc15); }

.cm-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cm-kpi-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.cm-kpi-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
  white-space: nowrap;
}

.cm-kpi-sub {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* ── Conciliação (dentro do overview card) ───────────────────────────────────── */
.cm-conc-header {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--p-surface-border);
  border-bottom: 1px solid var(--p-surface-border);
}

.cm-conc-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.cm-conc-subtitle {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.cm-conc-body {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1rem;
  flex-wrap: wrap;
}

/* Itens clicáveis de conciliação */
.cm-conc-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.cm-conc-item:hover {
  background: var(--p-surface-hover);
}

.cm-conc-item.is-active {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-border);
}

.cm-conc-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.cm-conc-dot--conf { background: var(--p-green-500,  #22c55e); }
.cm-conc-dot--diff { background: var(--p-orange-500, #f97316); }
.cm-conc-dot--nao  { background: var(--p-surface-400, #94a3b8); }

.cm-conc-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  text-align: left;
}

.cm-conc-item-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.cm-conc-item-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.cm-conc-item-value--conf { color: var(--p-green-600,  #16a34a); }
.cm-conc-item-value--diff { color: var(--p-orange-500, #f97316); }
.cm-conc-item-value--nao  { color: var(--p-text-muted-color); }

/* Barra de progresso */
.cm-conc-progress-wrap {
  flex: 1;
  min-width: 10rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.cm-conc-progress-bar {
  height: 0.5rem;
  background: var(--p-surface-200, #e2e8f0);
  border-radius: 99px;
  display: flex;
  overflow: hidden;
}

.cm-conc-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.cm-conc-progress-fill--conf { background: var(--p-green-500,  #22c55e); }
.cm-conc-progress-fill--diff { background: var(--p-orange-500, #f97316); }

.cm-conc-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

/* ── Seção Repasses ──────────────────────────────────────────────────────────── */
.cm-repasses {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  overflow: hidden;
}

/* ── Toolbar da tabela ───────────────────────────────────────────────────────── */
.cm-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cm-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.cm-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.cm-search :deep(.p-inputtext) {
  width: 100%;
}


.cm-datepicker {
  width: 13rem;
  flex-shrink: 0;
}

.cm-toolbar-wrap :deep(.fb) {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: 1px solid var(--p-surface-border);
}

/* ── Tabela: estilos especiais ───────────────────────────────────────────────── */
.cm-table :deep(tr) {
  cursor: pointer;
}

.cm-pedido-link {
  color: var(--p-primary-color);
  font-weight: 600;
  text-decoration: none;
}

.cm-pedido-link:hover {
  text-decoration: underline;
}

.cm-taxa {
  color: var(--p-orange-500, #f97316);
}

.cm-recebido-nao {
  color: var(--p-text-muted-color);
}

.cm-diff {
  font-weight: 600;
}

.cm-diff--zero { color: var(--p-green-600,  #16a34a); }
.cm-diff--neg  { color: var(--p-red-600,    #dc2626); }
.cm-diff--pos  { color: var(--p-green-600,  #16a34a); }

.cm-empty-cell {
  color: var(--p-text-muted-color);
}

/* ── Estado vazio ────────────────────────────────────────────────────────────── */
.cm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.cm-empty .pi {
  font-size: 1.5rem;
}

/* ── Drawer ──────────────────────────────────────────────────────────────────── */
.cm-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.cm-drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.cm-drawer-section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cm-drawer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.cm-drawer-key {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.cm-drawer-val {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.cm-drawer-val--bold {
  font-weight: 700;
}

.cm-drawer-divider {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

/* ── FAB ─────────────────────────────────────────────────────────────────────── */
.cm-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.cm-settings-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.cm-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Chip de canal ───────────────────────────────────────────────────────────── */
.cm-canal-chip {
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

.cm-canal-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.cm-canal-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Popover de canal ────────────────────────────────────────────────────────── */
.cm-canal-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 16rem;
}

.cm-canal-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cm-canal-search :deep(.p-inputtext) {
  width: 100%;
}

.cm-canal-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.cm-canal-item {
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

.cm-canal-item:hover {
  background: var(--p-surface-hover);
}

.cm-canal-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.cm-canal-item.is-featured {
  font-weight: 600;
  color: var(--p-primary-700, #1d4ed8);
}

.cm-canal-item.is-featured.is-selected {
  color: var(--p-primary-600, #2563eb);
}

.cm-canal-featured-icon {
  font-size: 0.625rem;
  color: var(--p-primary-400, #60a5fa);
  margin-right: 0.125rem;
}

.cm-canal-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.cm-canal-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.cm-canal-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.cm-canal-empty {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  text-align: center;
}

/* ── Modal Lançar Diferença ───────────────────────────────────────────────── */
.cm-diferenca-modal {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cm-diferenca-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
}
.cm-diferenca-info-label {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
.cm-diferenca-info-value {
  font-weight: 600;
}
.cm-diferenca-field {
  margin-top: 1rem;
}
.cm-diferenca-field-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-bottom: 0.5rem;
}
.cm-diferenca-select {
  width: 100%;
}

/* ── Drawer Ajustes ─────────────────────────────────────────────────────────── */
.cm-ajustes-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cm-ajustes-marketplace {
  background: var(--p-surface-ground);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  padding: 0.875rem 1rem;
}

.cm-ajustes-marketplace-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.cm-ajustes-lock-icon {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.cm-ajustes-marketplace-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.cm-ajustes-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.cm-ajustes-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cm-ajustes-field label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
