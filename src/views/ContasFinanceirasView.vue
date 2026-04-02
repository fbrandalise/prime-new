<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import Card from 'primevue/card'
import Chart from 'primevue/chart'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Menu from 'primevue/menu'
import Checkbox from 'primevue/checkbox'
import Popover from 'primevue/popover'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'
import FilterBar from '@/components/FilterBar.vue'
import NovaContaFinanceiraPanel from '@/components/NovaContaFinanceiraPanel.vue'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useLancamentosStore } from '@/stores/lancamentos'
import { PERIODO_OPTIONS_PAGAR, buildDateRange } from '@/composables/usePeriodFilter'

// ── Store ─────────────────────────────────────────────────────────────────────
const contasFinanceirasStore = useContasFinanceirasStore()
const lancamentosStore = useLancamentosStore()
const toast = useToast()
const confirm = useConfirm()

// ── Panel ─────────────────────────────────────────────────────────────────────
const showNovaContaPanel = ref(false)

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Bancos' }]

// ── Menu de ações ─────────────────────────────────────────────────────────────
const actionsMenu = ref()
const actionsMenuItems = ref([
  { label: 'Exportar contas', icon: 'pi pi-download' },
  { label: 'Imprimir',        icon: 'pi pi-print' },
])
const toggleActionsMenu = (e) => actionsMenu.value.toggle(e)

// ── Seletor de conta financeira ──────────────────────────────────────────────
const TODAS_LABEL = 'Todos os bancos'
const contaOptions = computed(() => {
  const grupos = { banco: [], carteira: [], caixa: [] }
  contas.value.forEach(c => grupos[c.tipo]?.push(c))
  const items = [{ type: 'item', label: TODAS_LABEL, featured: true }]
  if (grupos.banco.length) {
    items.push({ type: 'separator', label: 'Bancos' })
    grupos.banco.forEach(c => items.push({ type: 'item', label: c.nome }))
  }
  if (grupos.carteira.length) {
    items.push({ type: 'separator', label: 'Carteiras digitais' })
    grupos.carteira.forEach(c => items.push({ type: 'item', label: c.nome }))
  }
  if (grupos.caixa.length) {
    items.push({ type: 'separator', label: 'Caixa' })
    grupos.caixa.forEach(c => items.push({ type: 'item', label: c.nome }))
  }
  return items
})
const selectedConta = ref(TODAS_LABEL)
const accountPopover = ref()
const accountSearch = ref('')
const filteredContaOptions = computed(() => {
  const q = accountSearch.value.toLowerCase()
  if (!q) return contaOptions.value
  return contaOptions.value.filter(c => c.type === 'item' && c.label.toLowerCase().includes(q))
})
const toggleAccountPopover = (e) => accountPopover.value.toggle(e)
const selectConta = (item) => {
  selectedConta.value = item.label
  accountPopover.value.hide()
  accountSearch.value = ''
}

// ── Modal de detalhes da conta ────────────────────────────────────────────────
const detalheConta = ref(null)
const openDetalhe = (conta) => { detalheConta.value = conta }

// ── Banco config ──────────────────────────────────────────────────────────────
const _favicon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

const bancoConfig = {
  'Banco do Brasil':         { initials: 'BB', color: '#F5A623', logoUrl: _favicon('bb.com.br') },
  'Bradesco':                { initials: 'BR', color: '#CC0000', logoUrl: _favicon('bradesco.com.br') },
  'Nubank':                  { initials: 'NU', color: '#820AD1', logoUrl: _favicon('nubank.com.br') },
  'Caixa Econômica Federal': { initials: 'CF', color: '#F5821F', logoUrl: _favicon('caixa.gov.br') },
  'Itaú':                    { initials: 'IU', color: '#EC7000', logoUrl: _favicon('itau.com.br') },
  'Santander':               { initials: 'SA', color: '#EC0000', logoUrl: _favicon('santander.com.br') },
  'Sicoob':                  { initials: 'SC', color: '#007A4D', logoUrl: _favicon('sicoob.com.br') },
  'Inter':                   { initials: 'IN', color: '#FF7A00', logoUrl: _favicon('inter.co') },
  'tipo_carteira':           { initials: 'CA', color: '#8b5cf6', logoUrl: null },
  'tipo_caixa':              { initials: 'CX', color: '#f97316', logoUrl: null },
}

const bancoLogo = (conta) => {
  if (conta.banco && bancoConfig[conta.banco]) return bancoConfig[conta.banco]
  return bancoConfig['tipo_' + conta.tipo] ?? { initials: conta.nome.slice(0, 2).toUpperCase(), color: '#64748b' }
}

// ── Dados (via store) ─────────────────────────────────────────────────────────
const contas = computed(() => contasFinanceirasStore.enrichedItems)

const SITUACOES_LIQUIDADAS = new Set(['Recebida', 'Paga', 'Antecipada'])
const movimentacoes = computed(() =>
  lancamentosStore.items.filter(l => SITUACOES_LIQUIDADAS.has(l.situacao))
)

const parseValor = (str) => {
  if (typeof str === 'number') return str
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

// ── Consolidado ───────────────────────────────────────────────────────────────
const contaFiltrada = computed(() =>
  selectedConta.value === TODAS_LABEL
    ? null
    : contas.value.find(c => c.nome === selectedConta.value) ?? null
)

const consolidado = computed(() => {
  if (contaFiltrada.value) {
    const c = contaFiltrada.value
    return { saldo: c.saldo, entradasPrevistas: c.entradasPrevistas, saidasPrevistas: c.saidasPrevistas }
  }
  return {
    saldo:             contas.value.reduce((s, c) => s + c.saldo, 0),
    entradasPrevistas: contas.value.reduce((s, c) => s + c.entradasPrevistas, 0),
    saidasPrevistas:   contas.value.reduce((s, c) => s + c.saidasPrevistas, 0),
  }
})

const saldoPrevisto = computed(() =>
  consolidado.value.saldo + consolidado.value.entradasPrevistas - consolidado.value.saidasPrevistas
)

// ── Filtros ───────────────────────────────────────────────────────────────────
const searchValue = ref('')

const periodOptions = PERIODO_OPTIONS_PAGAR

const filterValues = ref({
  period:    'mes',
  dateRange: null,
  tipo:      [],
})

watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) return { from: dateRange[0], to: dateRange[1] ?? dateRange[0] }
  return buildDateRange(period)
})

const filterDefs = computed(() => [
  { id: 'tipo', type: 'multiselect', label: 'Tipo', defaultVisible: true, options: ['Entrada', 'Saída'], width: '9rem' },
])

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = { period: 'mes', dateRange: null, tipo: [] }
}

// ── Drawer de filtros ─────────────────────────────────────────────────────────
const filtersDrawerVisible = ref(false)

const activeExtraFilterCount = computed(() =>
  filterDefs.value.filter(f => !f.pinned).filter(f => {
    const val = filterValues.value[f.id]
    if (val == null || val === '') return false
    if (Array.isArray(val)) return val.length > 0
    return true
  }).length,
)

// ── Seleção de linhas ─────────────────────────────────────────────────────────
const selectedMovimentacoes = ref([])

const selectionActionsItems = computed(() => [
  { label: 'Exportar selecionados', icon: 'pi pi-download' },
  { separator: true },
  {
    label: 'Excluir selecionados',
    icon: 'pi pi-trash',
    command: () => { selectedMovimentacoes.value = [] },
  },
])

const clearSelection = () => { selectedMovimentacoes.value = [] }

// ── Menu de ações da linha ────────────────────────────────────────────────────
const rowMenu = ref()
const currentRowData = ref(null)
const rowMenuItems = computed(() => [
  { label: 'Editar',   icon: 'pi pi-pencil' },
  { separator: true },
  {
    label: 'Estornar',
    icon: 'pi pi-replay',
    command: () => {
      const row = currentRowData.value
      if (!row) return
      confirm.require({
        header: 'Estornar lançamento?',
        message: `O lançamento "${row.descricao}" (R$ ${row.valor}) será estornado. A conta vinculada voltará ao status pendente.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sim, estornar',
        rejectLabel: 'Cancelar',
        acceptProps: { severity: 'warn' },
        accept: async () => {
          try {
            await lancamentosStore.estornar(row.id)
            toast.add({ severity: 'success', summary: 'Estornado', detail: 'Lançamento estornado e conta revertida.', life: 3000 })
          } catch (err) {
            toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível estornar o lançamento.', life: 4000 })
          }
        },
      })
    },
  },
])
const toggleRowMenu = (e, data) => {
  currentRowData.value = data
  rowMenu.value.toggle(e)
}

// ── Modo de visão geral ───────────────────────────────────────────────────────
const overviewMode = ref('cards')
const overviewOptions = [
  { label: 'Totalizadores',  value: 'cards',   icon: 'pi pi-th-large'  },
  { label: 'Fluxo de caixa', value: 'grafico', icon: 'pi pi-chart-bar' },
]

// ── Visualização dos bancos (A/B) ─────────────────────────────────────────────
const banksView = ref('list')
const banksViewOptions = [
  { value: 'cards', icon: 'pi pi-th-large' },
  { value: 'list',  icon: 'pi pi-list' },
]

// ── Dark mode (para o gráfico) ────────────────────────────────────────────────
const isDarkMode = ref(document.documentElement.classList.contains('dark-mode'))
let _observer = null

onMounted(async () => {
  _observer = new MutationObserver(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark-mode')
  })
  _observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  try {
    await Promise.all([contasFinanceirasStore.fetchAll(), lancamentosStore.fetchAll()])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os dados.', life: 4000 })
  }
})
onUnmounted(() => { _observer?.disconnect() })

// ── Gráfico de fluxo de caixa ─────────────────────────────────────────────────
const weekStart = (d) => {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

const chartData = computed(() => {
  const map = new Map()

  movimentacoesFiltradas.value.forEach(m => {
    const d = parseDate(m.data)
    const ws = weekStart(d)
    const key = ws.toISOString()
    if (!map.has(key)) map.set(key, { date: ws, entrada: 0, saida: 0 })
    const v = parseValor(m.valor)
    if (m.tipo === 'Entrada') map.get(key).entrada += v
    else                      map.get(key).saida   += v
  })

  const weeks = [...map.values()].sort((a, b) => a.date - b.date)

  const labels = weeks.map(w => {
    const dd = String(w.date.getDate()).padStart(2, '0')
    const mm = String(w.date.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}`
  })

  let saldoAcum = contaFiltrada.value
    ? contaFiltrada.value.saldoInicial
    : contas.value.reduce((s, c) => s + c.saldoInicial, 0)
  const saldoData = weeks.map(w => {
    saldoAcum += w.entrada - w.saida
    return Math.round(saldoAcum * 100) / 100
  })

  const lastSaldo = saldoData[saldoData.length - 1] ?? 0
  const saldoColor = lastSaldo >= 0 ? 'rgba(74, 222, 128, 1)' : 'rgba(248, 113, 113, 1)'

  return {
    labels,
    datasets: [
      {
        type: 'bar', label: 'Entradas',
        data: weeks.map(w => Math.round(w.entrada * 100) / 100),
        backgroundColor: 'rgba(96, 165, 250, 0.85)',
        borderColor: 'rgba(96, 165, 250, 1)',
        borderWidth: 1, borderRadius: 4, order: 2,
      },
      {
        type: 'bar', label: 'Saídas',
        data: weeks.map(w => Math.round(w.saida * 100) / 100),
        backgroundColor: 'rgba(251, 146, 60, 0.85)',
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 1, borderRadius: 4, order: 2,
      },
      {
        type: 'line', label: 'Saldo acumulado',
        data: saldoData,
        borderColor: saldoColor, backgroundColor: 'transparent',
        pointBackgroundColor: saldoColor,
        pointRadius: 3, tension: 0.3, borderWidth: 2.5, order: 1,
      },
    ],
  }
})

const chartOptions = computed(() => {
  const dark = isDarkMode.value
  const textColor   = dark ? '#e2e8f0' : '#1e293b'
  const mutedColor  = dark ? '#94a3b8' : '#64748b'
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 12, padding: 16, font: { size: 12 } } },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        titleColor: dark ? '#e2e8f0' : '#0f172a',
        bodyColor:  dark ? '#94a3b8' : '#475569',
        borderColor: dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { ticks: { color: mutedColor, font: { size: 11 } }, grid: { color: borderColor } },
      y: {
        position: 'left',
        ticks: { color: mutedColor, font: { size: 11 }, callback: (v) => fmtBRL(v) },
        grid: { color: borderColor },
      },
    },
  }
})

// ── Tamanho da tabela ─────────────────────────────────────────────────────────
const tableSizeOptions = [
  { label: 'Pequeno', value: 'small' },
  { label: 'Normal',  value: 'normal' },
  { label: 'Grande',  value: 'large' },
]
const tableSize = ref('small')
const settingsPopover = ref()
const toggleSettingsPopover = (e) => settingsPopover.value.toggle(e)

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  const [d, m, y] = str.split('/')
  return new Date(+y, +m - 1, +d)
}

const movimentacoesFiltradas = computed(() => {
  let list = movimentacoes.value

  if (contaFiltrada.value) {
    list = list.filter(m => m.conta_financeira_id === contaFiltrada.value.id)
  }

  const q = searchValue.value.toLowerCase()
  if (q) list = list.filter(m =>
    (m.descricao ?? '').toLowerCase().includes(q) || (m.valor ?? '').toLowerCase().includes(q)
  )

  if (filterValues.value.tipo?.length) {
    list = list.filter(m => {
      const label = m.tipo === 'Entrada' ? 'Entrada' : 'Saída'
      return filterValues.value.tipo.includes(label)
    })
  }

  if (activeDateRange.value) {
    list = list.filter(m => {
      const d = parseDate(m.data)
      return d >= activeDateRange.value.from && d <= activeDateRange.value.to
    })
  }

  return list
})

// ── Helpers ───────────────────────────────────────────────────────────────────
// ── Movimentações com subtotal diário ────────────────────────────────────
const movimentacoesComSaldo = computed(() => {
  const list = movimentacoesFiltradas.value
  if (!list.length) return []

  const grouped = new Map()
  list.forEach(m => {
    if (!grouped.has(m.data)) grouped.set(m.data, [])
    grouped.get(m.data).push(m)
  })

  // Saldo base: saldoInicial das contas + liquidações anteriores ao período visível
  const dates = [...grouped.keys()].sort((a, b) => parseDate(a) - parseDate(b))
  const firstVisibleDate = parseDate(dates[0])

  const saldoInicial = contaFiltrada.value
    ? contaFiltrada.value.saldoInicial
    : contas.value.reduce((s, c) => s + c.saldoInicial, 0)

  // Soma liquidações anteriores ao primeiro dia visível (filtradas por conta se necessário)
  let saldoAntes = saldoInicial
  movimentacoes.value.forEach(m => {
    if (contaFiltrada.value && m.conta_financeira_id !== contaFiltrada.value.id) return
    const d = parseDate(m.data)
    if (d < firstVisibleDate) {
      const v = parseValor(m.valor)
      if (m.tipo === 'Entrada') saldoAntes += v
      else saldoAntes -= v
    }
  })

  const result = []
  let saldoAcum = saldoAntes

  dates.forEach(data => {
    const items = grouped.get(data)
    items.forEach(m => {
      result.push(m)
      const v = parseValor(m.valor)
      if (m.tipo === 'Entrada') saldoAcum += v
      else saldoAcum -= v
    })
    result.push({
      id: `saldo-${data}`,
      _isSaldoDia: true,
      data,
      saldoDia: saldoAcum,
    })
  })

  return result
})

const rowClass = (data) => data._isSaldoDia ? 'cf-saldo-dia-row' : ''

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'

const tipoIcon = (tipo) => ({
  banco:    'pi pi-building-columns',
  carteira: 'pi pi-wallet',
  caixa:    'pi pi-inbox',
}[tipo] ?? 'pi pi-credit-card')

const tipoLabel = (tipo) => ({
  banco:    'Banco',
  carteira: 'Carteira virtual',
  caixa:    'Caixa',
}[tipo] ?? tipo)

const tipoSeverity = (tipo) => ({
  banco:    'info',
  carteira: 'secondary',
  caixa:    'warn',
}[tipo] ?? 'secondary')

const contaNome = (id) => contas.value.find(c => c.id === id)?.nome ?? '—'
</script>

<template>
  <div class="cf-page">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <div class="cf-header">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="cf-breadcrumb" />
      <div class="cf-title-row">
        <span class="cf-title">Bancos</span>
        <button class="cf-conta-chip" @click="toggleAccountPopover">
          <span>{{ selectedConta }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="cf-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />
        <Button
          label="Nova conta"
          icon="pi pi-plus"
          class="cf-cta"
          @click="showNovaContaPanel = true"
        />
      </div>
    </div>

    <!-- ── Body ───────────────────────────────────────────────────────────── -->
    <div class="cf-body">

      <!-- Panel de contas ────────────────────────────────────────────────── -->
      <div class="cf-contas-panel">

        <div v-if="!contaFiltrada" class="cf-overview-bar">
          <SelectButton
            v-model="overviewMode"
            :options="overviewOptions"
            option-label="label"
            option-value="value"
            size="small"
          />
          <div class="cf-overview-actions">
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

        <!-- Totalizadores: consolidado + cards de contas -->
        <div v-if="contaFiltrada || (overviewMode === 'cards' && !overviewCollapsed)" class="cf-overview-inner">

          <!-- Consolidado — inline no panel ──────────────────────── -->
          <div class="cf-consolidado">
            <div class="cf-consolidado-main">
              <i
                class="cf-consolidado-icon"
                :class="consolidado.saldo >= 0 ? 'pi pi-trending-up cf-card-icon--pos' : 'pi pi-trending-down cf-card-icon--neg'"
              />
              <div>
                <span class="cf-card-label">
                  {{ contaFiltrada ? contaFiltrada.nome : `Saldo consolidado — ${contas.length} contas` }}
                </span>
                <span
                  class="cf-consolidado-valor"
                  :class="consolidado.saldo >= 0 ? 'cf-card-value--pos' : 'cf-card-value--neg'"
                >{{ showVal(consolidado.saldo) }}</span>
                <div class="cf-consolidado-meta">
                  <span class="cf-consolidado-meta-item">
                    <i class="pi pi-arrow-circle-down" />
                    Entradas: <strong>{{ showVal(consolidado.entradasPrevistas) }}</strong>
                  </span>
                  <span class="cf-consolidado-meta-sep">·</span>
                  <span class="cf-consolidado-meta-item">
                    <i class="pi pi-arrow-circle-up" />
                    Saídas: <strong>{{ showVal(consolidado.saidasPrevistas) }}</strong>
                  </span>
                  <span class="cf-consolidado-meta-sep">·</span>
                  <span class="cf-consolidado-meta-item">
                    Previsto: <strong>{{ showVal(saldoPrevisto) }}</strong>
                  </span>
                </div>
              </div>
            </div>
            <SelectButton
              v-if="!contaFiltrada"
              v-model="banksView"
              :options="banksViewOptions"
              option-value="value"
              size="small"
              class="cf-banks-view-toggle"
            >
              <template #option="{ option }">
                <i :class="option.icon" />
              </template>
            </SelectButton>
          </div>

          <!-- Grid de cards das contas ────────────────────────────── -->
          <div v-if="!contaFiltrada && banksView === 'cards'" class="cf-top-row">
            <Card
              v-for="conta in contas"
              :key="conta.id"
              class="cf-card"
              :pt="{ root: { style: `border-left: 3px solid ${bancoLogo(conta).color}` } }"
            >
              <template #content>
                <div class="cf-card-inner">
                  <div class="cf-bank-logo cf-bank-logo--card" :style="{ background: bancoLogo(conta).color }">
                    <img
                      v-if="bancoLogo(conta).logoUrl"
                      :src="bancoLogo(conta).logoUrl"
                      :alt="conta.banco ?? conta.nome"
                      class="cf-bank-logo-img"
                      @error="$event.target.style.display = 'none'"
                    />
                    <span class="cf-bank-logo-initials">{{ bancoLogo(conta).initials }}</span>
                  </div>
                  <div class="cf-card-body">
                    <span class="cf-card-label">{{ conta.nome }}</span>
                    <span class="cf-card-value">{{ showVal(conta.saldo) }}</span>
                    <span class="cf-card-sub">Saldo atual</span>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Lista compacta — 2 colunas ──────────────────────────── -->
          <ul v-else-if="!contaFiltrada" class="cf-banks-list">
            <li
              v-for="conta in contas"
              :key="conta.id"
              class="cf-bank-row"
            >
              <div class="cf-bank-logo" :style="{ background: bancoLogo(conta).color }">
                <img
                  v-if="bancoLogo(conta).logoUrl"
                  :src="bancoLogo(conta).logoUrl"
                  :alt="conta.banco ?? conta.nome"
                  class="cf-bank-logo-img"
                  @error="$event.target.style.display = 'none'"
                />
                <span class="cf-bank-logo-initials">{{ bancoLogo(conta).initials }}</span>
              </div>
              <span class="cf-bank-nome">{{ conta.nome }}</span>
              <span class="cf-bank-saldo">{{ showVal(conta.saldo) }}</span>
              <Button
                icon="pi pi-info-circle"
                variant="text"
                severity="secondary"
                rounded
                size="small"
                class="cf-bank-info-btn"
                v-tooltip.top="'Ver detalhes'"
                @click="openDetalhe(conta)"
              />
            </li>
          </ul>

        </div><!-- /.cf-overview-inner -->

        <!-- Fluxo de caixa: gráfico -->
        <div v-if="overviewMode === 'grafico' && !overviewCollapsed" class="cf-chart-inner">
          <div class="cf-chart-header">
            <span class="cf-chart-title">Fluxo de caixa</span>
            <span class="cf-chart-subtitle">Entradas e saídas agrupadas por semana</span>
          </div>
          <div class="cf-chart-body">
            <Chart type="bar" :data="chartData" :options="chartOptions" />
          </div>
        </div>

      </div><!-- /.cf-contas-panel -->

      <!-- Tabela de movimentações ─────────────────────────────────────────── -->
      <div class="cf-movimentacoes">

        <div class="cf-toolbar">
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
          <IconField class="cf-search">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchValue" placeholder="Buscar movimentação..." />
          </IconField>
          <SelectButton
            v-model="filterValues.period"
            :options="periodOptions"
            option-label="label"
            option-value="value"
          />
          <DatePicker
            v-model="filterValues.dateRange"
            class="cf-datepicker"
            selection-mode="range"
            date-format="dd/mm/yy"
            show-icon
            icon-display="input"
            placeholder="Período"
          />
        </div>

        <FilterBar
          v-model="filterValues"
          v-model:filtersDrawerVisible="filtersDrawerVisible"
          :filters="filterDefs"
          :selection-count="selectedMovimentacoes.length"
          :total-count="movimentacoesFiltradas.length"
          :selection-actions="selectionActionsItems"
          @clear="handleClearFilters"
          @clear-selection="clearSelection"
          @lower-selected="clearSelection"
        />

        <DataTable
          v-model:selection="selectedMovimentacoes"
          :value="movimentacoesComSaldo"
          dataKey="id"
          :size="tableSize === 'normal' ? undefined : tableSize"
          paginator
          :rows="100"
          :rowsPerPageOptions="[50, 100, 200]"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          :rowClass="rowClass"
          :pt="{ table: { style: 'table-layout: fixed; width: 100%' } }"
        >
          <template #empty>
            <div class="cf-empty">
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

          <Column selectionMode="multiple" headerStyle="width: 3rem" style="width: 3rem">
            <template #body="{ data }">
              <Checkbox v-if="!data._isSaldoDia" v-model="selectedMovimentacoes" :value="data" />
            </template>
          </Column>
          <Column field="data" header="Data" style="width: 8rem">
            <template #body="{ data }">
              <span v-if="!data._isSaldoDia">{{ data.data }}</span>
            </template>
          </Column>
          <Column field="descricao" header="Descrição" style="min-width: 12rem">
            <template #body="{ data }">
              <template v-if="!data._isSaldoDia">{{ data.descricao }}</template>
            </template>
          </Column>
          <Column header="Conta" style="width: 14rem">
            <template #body="{ data }">
              <template v-if="!data._isSaldoDia">{{ contaNome(data.conta_financeira_id) }}</template>
            </template>
          </Column>
          <Column field="tipo" header="Tipo" style="width: 11rem">
            <template #body="{ data }">
              <span v-if="data._isSaldoDia" class="cf-saldo-dia-label">Saldo em {{ data.data }}</span>
              <Tag
                v-else
                :value="data.tipo"
                :severity="data.tipo === 'Entrada' ? 'success' : 'danger'"
              />
            </template>
          </Column>
          <Column
            header="Valor"
            style="width: 10rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
          >
            <template #body="{ data }">
              <span v-if="data._isSaldoDia" class="cf-saldo-dia-valor">
                {{ fmtBRL(data.saldoDia) }}
              </span>
              <span v-else :class="data.tipo === 'Entrada' ? 'cf-valor--entrada' : 'cf-valor--saida'">
                {{ data.tipo === 'Saída' ? '−' : '+' }} R$ {{ data.valor }}
              </span>
            </template>
          </Column>
          <Column headerStyle="width: 3rem" style="width: 3rem">
            <template #body="{ data }">
              <Button v-if="!data._isSaldoDia" icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleRowMenu($event, data)" />
            </template>
          </Column>
        </DataTable>

      </div>

    </div><!-- /.cf-body -->

  </div><!-- /.cf-page -->

  <Menu ref="rowMenu" :model="rowMenuItems" popup />
  <ConfirmDialog :style="{ width: '28rem', maxWidth: '90vw' }" />

  <!-- ── Modal de detalhes da conta ─────────────────────────────────────── -->
  <Dialog
    v-model:visible="detalheConta"
    :header="detalheConta?.nome"
    modal
    :style="{ width: '26rem' }"
    :pt="{ header: { class: 'cf-dialog-header' } }"
  >
    <template v-if="detalheConta">

      <div class="cf-dialog-meta">
        <div class="cf-dialog-meta-item">
          <i :class="['cf-dialog-meta-icon', tipoIcon(detalheConta.tipo)]" />
          <Tag :value="tipoLabel(detalheConta.tipo)" :severity="tipoSeverity(detalheConta.tipo)" />
        </div>
        <span v-if="detalheConta.banco" class="cf-dialog-banco">{{ detalheConta.banco }}</span>
      </div>

      <div v-if="detalheConta.tipo === 'banco'" class="cf-dialog-ag-row">
        <div class="cf-dialog-ag-item">
          <span class="cf-dialog-ag-label">Agência</span>
          <span class="cf-dialog-ag-value">{{ detalheConta.agencia }}</span>
        </div>
        <div class="cf-dialog-ag-item">
          <span class="cf-dialog-ag-label">Conta</span>
          <span class="cf-dialog-ag-value">{{ detalheConta.conta }}</span>
        </div>
      </div>

      <Divider class="cf-dialog-divider" />

      <div class="cf-dialog-saldo-block">
        <span class="cf-dialog-saldo-label">Saldo atual</span>
        <span class="cf-dialog-saldo-valor">{{ fmtBRL(detalheConta.saldo) }}</span>
      </div>

      <div class="cf-dialog-previsoes">
        <div class="cf-dialog-prev-item">
          <span class="cf-dialog-prev-label">Entradas previstas</span>
          <span class="cf-dialog-prev-valor cf-dialog-prev-valor--entrada">
            {{ fmtBRL(detalheConta.entradasPrevistas) }}
          </span>
        </div>
        <div class="cf-dialog-prev-item">
          <span class="cf-dialog-prev-label">Saídas previstas</span>
          <span class="cf-dialog-prev-valor cf-dialog-prev-valor--saida">
            {{ fmtBRL(detalheConta.saidasPrevistas) }}
          </span>
        </div>
        <div class="cf-dialog-prev-item">
          <span class="cf-dialog-prev-label">Saldo previsto</span>
          <span class="cf-dialog-prev-valor">
            {{ fmtBRL(detalheConta.saldo + detalheConta.entradasPrevistas - detalheConta.saidasPrevistas) }}
          </span>
        </div>
      </div>

    </template>

    <template #footer>
      <Button label="Fechar" severity="secondary" variant="outlined" @click="detalheConta = null" />
      <Button label="Editar conta" icon="pi pi-pencil" @click="detalheConta = null" />
    </template>
  </Dialog>

  <!-- ── Botão flutuante de configurações ──────────────────────────────── -->
  <Button
    icon="pi pi-sliders-h"
    rounded
    severity="secondary"
    class="cf-fab"
    @click="toggleSettingsPopover"
    v-tooltip.left="'Configurações da tabela'"
  />

  <!-- ── Popover de seleção de conta ───────────────────────────────────── -->
  <Popover ref="accountPopover" class="cf-account-popover">
    <div class="cf-account-search">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="accountSearch"
          placeholder="Buscar conta..."
          size="small"
          autofocus
        />
      </IconField>
    </div>
    <ul class="cf-account-list">
      <template v-for="item in filteredContaOptions" :key="item.label">
        <li v-if="item.type === 'separator'" class="cf-account-separator">
          {{ item.label }}
        </li>
        <li
          v-else
          class="cf-account-item"
          :class="{ 'is-selected': item.label === selectedConta, 'is-featured': item.featured }"
          @click="selectConta(item)"
        >
          <i v-if="item.label === selectedConta" class="pi pi-check cf-account-check" />
          <span v-else class="cf-account-check-placeholder" />
          <i v-if="item.featured" class="pi pi-star-fill cf-account-featured-icon" />
          <span>{{ item.label }}</span>
        </li>
      </template>
      <li v-if="!filteredContaOptions.length" class="cf-account-empty">
        Nenhuma conta encontrada
      </li>
    </ul>
  </Popover>

  <Popover ref="settingsPopover">
    <div class="cf-settings-content">
      <span class="cf-settings-label">Densidade da tabela</span>
      <SelectButton
        v-model="tableSize"
        :options="tableSizeOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      />
    </div>
  </Popover>

  <NovaContaFinanceiraPanel v-model="showNovaContaPanel" />
</template>

<style scoped>
/* ── Página ──────────────────────────────────────────────────────────────────── */
.cf-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ───────────────────────────────────────────────────────────────── */
.cf-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.cf-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cf-title-row .cf-actions-btn {
  margin-left: auto;
}

.cf-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.cf-cta { white-space: nowrap; }

/* ── Chip de seleção de conta ───────────────────────────────────────────────── */
.cf-conta-chip {
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

.cf-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.cf-conta-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Popover de conta ───────────────────────────────────────────────────────── */
.cf-account-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 17rem;
}

.cf-account-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-account-search :deep(.p-inputtext) {
  width: 100%;
}

.cf-account-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.cf-account-item {
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

.cf-account-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.cf-account-item:hover {
  background: var(--p-surface-hover);
}

.cf-account-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.cf-account-item.is-featured {
  font-weight: 600;
  color: var(--p-primary-700, #1d4ed8);
}

.cf-account-item.is-featured.is-selected {
  color: var(--p-primary-600, #2563eb);
}

.cf-account-featured-icon {
  font-size: 0.625rem;
  color: var(--p-primary-400, #60a5fa);
  margin-right: 0.125rem;
}

.cf-account-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.cf-account-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.cf-account-empty {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* ── Body ────────────────────────────────────────────────────────────────────── */
.cf-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

/* ── Panel de contas ─────────────────────────────────────────────────────────── */
.cf-contas-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.cf-overview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-overview-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}


.cf-banks-view-toggle :deep(.p-selectbutton-option) {
  padding: 0.3rem 0.5rem;
}

/* ── Container overview (consolidado + grid/lista) ───────────────────────────── */
.cf-overview-inner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

/* ── Consolidado inline ──────────────────────────────────────────────────────── */
.cf-consolidado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 0.25rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-wrap: wrap;
}

.cf-consolidado-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cf-consolidado-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.cf-consolidado-valor {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--p-text-color);
}

.cf-consolidado-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.cf-consolidado-meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.cf-consolidado-meta-item .pi-arrow-circle-down { color: var(--p-blue-500,  #3b82f6); font-size: 0.75rem; }
.cf-consolidado-meta-item .pi-arrow-circle-up   { color: var(--p-orange-500, #f97316); font-size: 0.75rem; }

.cf-consolidado-meta-sep {
  color: var(--p-surface-400, #94a3b8);
  font-size: 0.75rem;
}

/* ── Grid de cards das 10 contas ─────────────────────────────────────────────── */
.cf-top-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

@media (max-width: 1280px) {
  .cf-top-row { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 960px) {
  .cf-top-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 640px) {
  .cf-top-row { grid-template-columns: repeat(2, 1fr); }
}

.cf-card-inner {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}


.cf-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cf-card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}

.cf-card-value--pos { color: var(--p-green-600, #16a34a); }
.cf-card-value--neg { color: var(--p-red-600,   #dc2626); }

.cf-card-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  line-height: 1.2;
  margin-bottom: 0.125rem;
}

/* ── Lista compacta de contas — 2 colunas ────────────────────────────────────── */
.cf-banks-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
}

@media (max-width: 640px) {
  .cf-banks-list { grid-template-columns: 1fr; }
}

.cf-bank-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-bank-row:last-child {
  border-bottom: none;
}

.cf-bank-logo--card {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
}

.cf-bank-logo {
  position: relative;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

/* Logo real — z-index acima das iniciais, fundo branco para não cortar transparências */
.cf-bank-logo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.2rem;
  background: #fff;
  border-radius: inherit;
  z-index: 1;
}

/* Iniciais ficam sempre renderizadas atrás, aparecem automaticamente se a img falhar */
.cf-bank-logo-initials {
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: white;
  user-select: none;
  z-index: 0;
}

.cf-bank-nome {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-bank-saldo {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cf-bank-info-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
  margin-right: -0.25rem;
}

.cf-bank-row:hover .cf-bank-info-btn {
  opacity: 1;
}

/* ── Gráfico ────────────────────────────────────────────────────────────────── */
.cf-chart-inner {
  display: flex;
  flex-direction: column;
}

.cf-chart-header {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.cf-chart-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.cf-chart-subtitle {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.cf-chart-body {
  padding: 1rem 1.25rem;
  height: 17rem;
}

.cf-chart-body :deep(.p-chart) {
  height: 100%;
}

.cf-chart-body :deep(canvas) {
  height: 100% !important;
}

/* ── Tabela de movimentações ─────────────────────────────────────────────────── */
.cf-movimentacoes {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.cf-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.cf-movimentacoes :deep(.fb) {
  margin: 0;
  border-bottom: 1px solid var(--p-surface-border);
}

.cf-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.cf-search :deep(.p-inputtext) { width: 100%; }

.cf-datepicker {
  width: 11rem;
  flex-shrink: 0;
}

/* ── Cores da tabela ─────────────────────────────────────────────────────────── */
.cf-valor--entrada { color: var(--p-green-600, #16a34a); }
.cf-valor--saida   { color: var(--p-red-500,   #ef4444); }

/* ── Saldo diário (linha intercalada) ───────────────────────────────────── */
:deep(.cf-saldo-dia-row) {
  background: color-mix(in srgb, var(--p-surface-ground), var(--p-text-color) 6%) !important;
  border-top: 1px solid color-mix(in srgb, var(--p-surface-ground), var(--p-text-color) 12%);
}
:deep(.cf-saldo-dia-row) td {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
}
.cf-saldo-dia-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  display: block;
  text-align: right;
}
.cf-saldo-dia-valor {
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
}

/* ── Estado vazio ────────────────────────────────────────────────────────────── */
.cf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.cf-empty .pi { font-size: 1.5rem; }

/* ── Botão flutuante ─────────────────────────────────────────────────────────── */
.cf-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.cf-settings-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.cf-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Modal de detalhes ───────────────────────────────────────────────────────── */
.cf-dialog-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.cf-dialog-meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cf-dialog-meta-icon {
  font-size: 1.125rem;
  color: var(--p-text-muted-color);
}

.cf-dialog-banco {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.cf-dialog-ag-row {
  display: flex;
  gap: 2rem;
  margin-bottom: 0.25rem;
}

.cf-dialog-ag-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.cf-dialog-ag-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.cf-dialog-ag-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
  font-variant-numeric: tabular-nums;
}

.cf-dialog-divider { margin: 1rem 0; }

.cf-dialog-saldo-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 1.25rem;
}

.cf-dialog-saldo-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.cf-dialog-saldo-valor {
  font-size: 2rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.15;
}

.cf-dialog-previsoes {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.cf-dialog-prev-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-50, var(--p-surface-ground));
  border-radius: 0.375rem;
}

.cf-dialog-prev-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.cf-dialog-prev-valor {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.cf-dialog-prev-valor--entrada { color: var(--p-green-600, #16a34a); }
.cf-dialog-prev-valor--saida   { color: var(--p-red-500,   #ef4444); }
</style>
