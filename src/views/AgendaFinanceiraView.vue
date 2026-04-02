<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'
import { useLancamentosStore } from '@/stores/lancamentos'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useContasAReceberStore } from '@/stores/contasAReceber'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { PERIODO_OPTIONS_PAGAR, buildDateRange } from '@/composables/usePeriodFilter'
import Chart from 'primevue/chart'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Breadcrumb from 'primevue/breadcrumb'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'
import Card from 'primevue/card'
import Popover from 'primevue/popover'
import FilterBar from '@/components/FilterBar.vue'
import NovaContaReceberPanel from '@/components/NovaContaReceberPanel.vue'
import NovaContaPagarPanel from '@/components/NovaContaPagarPanel.vue'
import * as contasAReceberService from '@/services/contasAReceberService'
import * as contasAPagarService from '@/services/contasAPagarService'

// ── Stores ────────────────────────────────────────────────────────────────────
const lancamentosStore = useLancamentosStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const contasAReceberStore = useContasAReceberStore()
const contasAPagarStore = useContasAPagarStore()
const toast = useToast()
const confirm = useConfirm()

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Meu Financeiro' }]

// ── Seletor de conta financeira ──────────────────────────────────────────────
const contaOptions = computed(() => {
  const all = [{ type: 'item', label: 'Todos os bancos', id: null }]
  const bancos    = contasFinanceirasStore.items.filter(c => c.tipo === 'banco')
  const carteiras = contasFinanceirasStore.items.filter(c => c.tipo === 'carteira')
  const caixas    = contasFinanceirasStore.items.filter(c => c.tipo === 'caixa')
  if (bancos.length)    { all.push({ type: 'separator', label: 'Bancos'    }); bancos.forEach(c    => all.push({ type: 'item', label: c.nome, id: c.id })) }
  if (carteiras.length) { all.push({ type: 'separator', label: 'Carteiras' }); carteiras.forEach(c => all.push({ type: 'item', label: c.nome, id: c.id })) }
  if (caixas.length)    { all.push({ type: 'separator', label: 'Caixa'     }); caixas.forEach(c    => all.push({ type: 'item', label: c.nome, id: c.id })) }
  return all
})

const selectedContaLabel = computed(() => {
  const id = filterValues.value.contaFinanceira
  if (!id) return 'Todos os bancos'
  return contasFinanceirasStore.items.find(c => c.id === id)?.nome ?? 'Todos os bancos'
})

const accountPopover = ref()
const accountSearch  = ref('')
const filteredContaOptions = computed(() => {
  const q = accountSearch.value.toLowerCase()
  if (!q) return contaOptions.value
  return contaOptions.value.filter(c => c.type === 'item' && c.label.toLowerCase().includes(q))
})
const toggleAccountPopover = (e) => accountPopover.value.toggle(e)
const selectConta = (conta) => {
  filterValues.value = { ...filterValues.value, contaFinanceira: conta.id ?? null }
  accountPopover.value.hide()
  accountSearch.value = ''
}

// ── Filtros ───────────────────────────────────────────────────────────────────
const searchValue = ref('')

const periodOptions = PERIODO_OPTIONS_PAGAR

const filterValues = ref({
  period:          'mes',
  dateRange:       null,
  tipo:            [],
  situacoes:       [],
  categoria:       [],
  canaisVenda:     [],
  contaFinanceira: null,
})

watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) {
    return { from: dateRange[0], to: dateRange[1] ?? dateRange[0] }
  }
  return buildDateRange(period)
})

const filterDefs = computed(() => [
  {
    id: 'tipo', type: 'multiselect', label: 'Tipo', defaultVisible: true,
    options: ['Entrada', 'Saída'], width: '9rem',
  },
  {
    id: 'situacoes', type: 'multiselect', label: 'Situação', defaultVisible: true,
    options: ['A receber', 'A pagar', 'Atrasada', 'Recebida', 'Recebida parcialmente', 'Antecipada', 'Paga', 'Paga parcialmente'],
    width: '14rem',
  },
  {
    id: 'categoria', type: 'multiselect', label: 'Categoria', placeholder: 'Todas categorias',
    options: ['Vendas', 'Serviços', 'Aluguéis', 'Compras', 'Despesas operacionais', 'Outros'],
    width: '13rem',
  },
  {
    id: 'canaisVenda', type: 'multiselect', label: 'Canal de venda', placeholder: 'Todos os canais',
    options: ['Loja física', 'E-commerce próprio', 'Mercado Livre', 'Shopee', 'Amazon', 'Instagram', 'WhatsApp'],
    width: '13rem',
  },
  {
    id: 'contaFinanceira', type: 'select', label: 'Conta financeira',
    placeholder: 'Todas as contas', width: '14rem',
    options: contasFinanceirasStore.items,
    optionLabel: 'nome',
    optionValue: 'id',
  },
])

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = { period: 'mes', dateRange: null, tipo: [], situacoes: [], categoria: [], canaisVenda: [], contaFinanceira: null }
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

// ── Painéis de nova / editar conta ───────────────────────────────────────────
const showNovaContaReceber = ref(false)
const showNovaContaPagar   = ref(false)
const editingContaReceber  = ref(null)
const editingContaPagar    = ref(null)

watch(showNovaContaReceber, (val) => { if (!val) editingContaReceber.value = null })
watch(showNovaContaPagar,   (val) => { if (!val) editingContaPagar.value   = null })

const novoLancamentoMenu = ref()
const novoLancamentoItems = ref([
  {
    label: 'Conta a Receber',
    icon: 'pi pi-arrow-circle-down',
    command: () => { showNovaContaReceber.value = true },
  },
  {
    label: 'Conta a Pagar',
    icon: 'pi pi-arrow-circle-up',
    command: () => { showNovaContaPagar.value = true },
  },
])
const toggleNovoLancamentoMenu = (e) => novoLancamentoMenu.value.toggle(e)

// ── Menu de ações da toolbar ──────────────────────────────────────────────────
const actionsMenu = ref()
const actionsMenuItems = ref([
  { label: 'Importar registros', icon: 'pi pi-upload' },
  { label: 'Exportar',           icon: 'pi pi-download' },
  { label: 'Imprimir',           icon: 'pi pi-print' },
  { separator: true },
  {
    label: 'Excluir selecionados',
    icon: 'pi pi-trash',
    disabled: () => !selectedLancamentos.value.length,
    command: async () => {
      const ids = selectedLancamentos.value.map(l => l.id)
      try {
        await Promise.all(ids.map(id => lancamentosStore.remove(id)))
        toast.add({ severity: 'success', summary: 'Excluído', detail: `${ids.length} lançamento(s) excluído(s).`, life: 3000 })
        selectedLancamentos.value = []
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir os lançamentos.', life: 4000 })
      }
    },
  },
])
const toggleActionsMenu = (e) => actionsMenu.value.toggle(e)

// ── Menu de ações da linha ────────────────────────────────────────────────────
const rowMenu = ref()
const currentRowData = ref(null)
const rowMenuItems = computed(() => {
  const data = currentRowData.value
  const { tipo, situacao, conta_a_receber_id, conta_a_pagar_id } = data ?? {}
  const isRecebido = situacao === 'Recebida' || situacao === 'Recebida parcialmente'
  const isPago = situacao === 'Paga' || situacao === 'Paga parcialmente'
  const isPendente = situacao === 'A receber' || situacao === 'A pagar' || situacao === 'Atrasada'

  return [
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: async () => {
        try {
          if (conta_a_receber_id) {
            editingContaReceber.value = await contasAReceberService.getById(conta_a_receber_id)
            showNovaContaReceber.value = true
          } else if (conta_a_pagar_id) {
            editingContaPagar.value = await contasAPagarService.getById(conta_a_pagar_id)
            showNovaContaPagar.value = true
          }
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os dados da conta.', life: 4000 })
        }
      },
    },
    // Baixar — Entrada pendente → Recebida
    ...(tipo === 'Entrada' && isPendente && conta_a_receber_id ? [{
      label: 'Marcar como recebida',
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await contasAReceberStore.baixar(conta_a_receber_id, 'Recebida')
          toast.add({ severity: 'success', summary: 'Recebida', detail: `Recebimento de ${data?.descricao} confirmado.`, life: 3000 })
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar o recebimento.', life: 4000 })
        }
      },
    }] : []),
    // Baixar — Saída pendente → Paga
    ...(tipo === 'Saída' && isPendente && conta_a_pagar_id ? [{
      label: 'Marcar como paga',
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await contasAPagarStore.baixar(conta_a_pagar_id, 'Paga')
          toast.add({ severity: 'success', summary: 'Paga', detail: `Pagamento de ${data?.descricao} confirmado.`, life: 3000 })
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar o pagamento.', life: 4000 })
        }
      },
    }] : []),
    // Cancelar recebimento
    ...(isRecebido && conta_a_receber_id ? [{
      label: 'Cancelar recebimento',
      icon: 'pi pi-times-circle',
      command: () => {
        confirm.require({
          header: 'Cancelar recebimento?',
          message: `O recebimento de ${data?.descricao} (R$ ${data?.valor}) será desfeito. A conta voltará para A receber ou Atrasada conforme o vencimento.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, cancelar',
          rejectLabel: 'Manter',
          acceptProps: { severity: 'warn' },
          accept: async () => {
            try {
              const novoStatus = await contasAReceberStore.cancelarRecebimento(conta_a_receber_id)
              toast.add({ severity: 'info', summary: 'Cancelado', detail: `Recebimento cancelado. Conta voltou para ${novoStatus}.`, life: 3000 })
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cancelar o recebimento.', life: 4000 })
            }
          },
        })
      },
    }] : []),
    // Cancelar pagamento
    ...(isPago && conta_a_pagar_id ? [{
      label: 'Cancelar pagamento',
      icon: 'pi pi-times-circle',
      command: () => {
        confirm.require({
          header: 'Cancelar pagamento?',
          message: `O pagamento de ${data?.descricao} (R$ ${data?.valor}) será desfeito. A conta voltará para A pagar ou Atrasada conforme o vencimento.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, cancelar',
          rejectLabel: 'Manter',
          acceptProps: { severity: 'warn' },
          accept: async () => {
            try {
              const novoStatus = await contasAPagarStore.cancelarPagamento(conta_a_pagar_id)
              toast.add({ severity: 'info', summary: 'Cancelado', detail: `Pagamento cancelado. Conta voltou para ${novoStatus}.`, life: 3000 })
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cancelar o pagamento.', life: 4000 })
            }
          },
        })
      },
    }] : []),
    { separator: true },
    {
      label: 'Excluir',
      icon: 'pi pi-trash',
      command: () => {
        confirm.require({
          header: 'Excluir lançamento?',
          message: `O lançamento "${data?.descricao}" (R$ ${data?.valor}) será excluído permanentemente, junto com a conta vinculada.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, excluir',
          rejectLabel: 'Cancelar',
          acceptProps: { severity: 'danger' },
          accept: async () => {
            try {
              // Remove a conta vinculada (que também remove o lançamento via store.remove)
              if (conta_a_receber_id) {
                await contasAReceberStore.remove(conta_a_receber_id)
              } else if (conta_a_pagar_id) {
                await contasAPagarStore.remove(conta_a_pagar_id)
              } else {
                await lancamentosStore.remove(data.id)
              }
              toast.add({ severity: 'success', summary: 'Excluído', detail: 'Lançamento e conta removidos.', life: 3000 })
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir.', life: 4000 })
            }
          },
        })
      },
    },
  ]
})
const toggleRowMenu = (e, data) => {
  currentRowData.value = data
  rowMenu.value.toggle(e)
}

// ── Seleção ───────────────────────────────────────────────────────────────────
const selectedLancamentos = ref([])

const selectionActionsItems = computed(() => [
  { label: 'Marcar como recebidos/pagos', icon: 'pi pi-check-circle' },
  { label: 'Duplicar selecionados',       icon: 'pi pi-copy' },
  { separator: true },
  {
    label: 'Excluir selecionados',
    icon: 'pi pi-trash',
    command: async () => {
      const ids = selectedLancamentos.value.map(l => l.id)
      try {
        await Promise.all(ids.map(id => lancamentosStore.remove(id)))
        toast.add({ severity: 'success', summary: 'Excluído', detail: `${ids.length} lançamento(s) excluído(s).`, life: 3000 })
        selectedLancamentos.value = []
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir os lançamentos.', life: 4000 })
      }
    },
  },
])
const clearSelection = () => { selectedLancamentos.value = [] }

const selectionTotal = computed(() => {
  if (!selectedLancamentos.value.length) return null
  const sum = selectedLancamentos.value.reduce((acc, l) => acc + parseValor(l.valor), 0)
  return sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
})

// ── Dados (via store) ─────────────────────────────────────────────────────────
const lancamentos = computed(() => lancamentosStore.items)

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  const [d, m, y] = str.split('/')
  return new Date(y, m - 1, d)
}

const filteredLancamentos = computed(() =>
  lancamentos.value.filter(l => {
    const q = searchValue.value.toLowerCase()
    const matchSearch = !q ||
      (l.descricao ?? '').toLowerCase().includes(q) ||
      l.data.includes(q) ||
      (l.categoria ?? '').toLowerCase().includes(q) ||
      l.valor.includes(q)

    const matchTipo        = !filterValues.value.tipo.length        || filterValues.value.tipo.includes(l.tipo)
    const matchSituacao    = !filterValues.value.situacoes.length   || filterValues.value.situacoes.includes(l.situacao)
    const matchCategoria   = !filterValues.value.categoria.length   || filterValues.value.categoria.includes(l.categoria)
    const matchCanalVenda  = !filterValues.value.canaisVenda.length || filterValues.value.canaisVenda.includes(l.canalVenda)
    const matchConta       = !filterValues.value.contaFinanceira    || l.conta_financeira_id === filterValues.value.contaFinanceira

    // Atrasados sempre aparecem, independente do filtro de data
    const isOverdue = l.situacao === 'Atrasada'
    let matchDate = true
    if (activeDateRange.value && !isOverdue) {
      const d = parseDate(l.data)
      matchDate = d >= activeDateRange.value.from && d <= activeDateRange.value.to
    }

    return matchSearch && matchTipo && matchSituacao && matchCategoria && matchCanalVenda && matchDate && matchConta
  })
)

// ── Totalizadores ─────────────────────────────────────────────────────────────
const parseValor = (str) => parseFloat(str.replace(/\./g, '').replace(',', '.'))

const saldoContas = computed(() =>
  contasFinanceirasStore.items.reduce((s, c) => s + (c.saldo ?? 0), 0)
)

const totais = computed(() => {
  let totalReceber = 0, totalPagar = 0
  let cntReceber = 0, cntPagar = 0
  let totalMarketplace = 0, cntMarketplace = 0
  let totalPos = 0, cntPos = 0

  const canaisMarketplace = ['Mercado Livre', 'Shopee', 'Amazon', 'Instagram', 'WhatsApp', 'E-commerce próprio']

  let atrasoReceber = 0, atrasoPagar = 0
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  filteredLancamentos.value.forEach(l => {
    const v = parseValor(l.valor)
    const vencido = parseDate(l.data) < hoje
    if (l.tipo === 'Entrada') {
      totalReceber += v; cntReceber++
      if (vencido) atrasoReceber += v
    }
    if (l.tipo === 'Saída') {
      totalPagar += v; cntPagar++
      if (vencido) atrasoPagar += v
    }
    if (canaisMarketplace.includes(l.canalVenda)) {
      totalMarketplace += v; cntMarketplace++
    }
    if (l.canalVenda === 'Loja física') {
      totalPos += v; cntPos++
    }
  })

  return {
    totalReceber, cntReceber, atrasoReceber,
    totalPagar, cntPagar, atrasoPagar,
    saldo: totalReceber - totalPagar,
    totalMarketplace, cntMarketplace,
    totalPos, cntPos,
  }
})

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Gráfico de fluxo de caixa ─────────────────────────────────────────────────
// Retorna a segunda-feira da semana de uma data
const weekStart = (d) => {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

const chartData = computed(() => {
  // Agrupa os lançamentos filtrados por semana
  const map = new Map()

  filteredLancamentos.value.forEach(l => {
    const d = parseDate(l.data)
    const ws = weekStart(d)
    const key = ws.toISOString()
    if (!map.has(key)) map.set(key, { date: ws, entrada: 0, saida: 0 })
    const v = parseValor(l.valor)
    if (l.tipo === 'Entrada') map.get(key).entrada += v
    else                      map.get(key).saida   += v
  })

  const weeks = [...map.values()].sort((a, b) => a.date - b.date)

  const labels = weeks.map(w => {
    const dd = String(w.date.getDate()).padStart(2, '0')
    const mm = String(w.date.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}`
  })

  // Saldo acumulado semana a semana
  let saldoAcum = 0
  const saldoData = weeks.map(w => {
    saldoAcum += w.entrada - w.saida
    return Math.round(saldoAcum * 100) / 100
  })

  const dark = isDarkMode.value
  // Cores adaptadas ao tema: mais claras/vibrantes em dark mode
  const entradaBg     = dark ? 'rgba(147, 197, 253, 0.75)' : 'rgba(59, 130, 246, 0.75)'
  const entradaBorder = dark ? 'rgba(147, 197, 253, 1)'    : 'rgba(59, 130, 246, 1)'
  const saidaBg       = dark ? 'rgba(253, 186, 116, 0.75)' : 'rgba(234, 88, 12, 0.75)'
  const saidaBorder   = dark ? 'rgba(253, 186, 116, 1)'    : 'rgba(234, 88, 12, 1)'
  const saldoPositivo = dark ? 'rgba(134, 239, 172, 1)'    : 'rgba(22, 163, 74, 1)'
  const saldoNegativo = dark ? 'rgba(252, 165, 165, 1)'    : 'rgba(220, 38, 38, 1)'
  const saldoColor    = saldoData[saldoData.length - 1] >= 0 ? saldoPositivo : saldoNegativo

  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Entradas',
        data: weeks.map(w => Math.round(w.entrada * 100) / 100),
        backgroundColor: entradaBg,
        borderColor: entradaBorder,
        borderWidth: 1,
        borderRadius: 4,
        order: 2,
      },
      {
        type: 'bar',
        label: 'Saídas',
        data: weeks.map(w => Math.round(w.saida * 100) / 100),
        backgroundColor: saidaBg,
        borderColor: saidaBorder,
        borderWidth: 1,
        borderRadius: 4,
        order: 2,
      },
      {
        type: 'line',
        label: 'Saldo acumulado',
        data: saldoData,
        borderColor: saldoColor,
        backgroundColor: 'transparent',
        pointBackgroundColor: saldoColor,
        pointRadius: 3,
        tension: 0.3,
        borderWidth: 2.5,
        order: 1,
      },
    ],
  }
})

// ── Detecção de dark mode para o gráfico ─────────────────────────────────────
const isDarkMode = ref(document.documentElement.classList.contains('dark-mode'))
let _observer    = null

onMounted(async () => {
  _observer = new MutationObserver(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark-mode')
  })
  _observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  try {
    await Promise.all([
      lancamentosStore.fetchAll(),
      contasFinanceirasStore.fetchAll(),
      contasAReceberStore.fetchAll(),
      contasAPagarStore.fetchAll(),
    ])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os lançamentos.', life: 4000 })
  }
})

onUnmounted(() => {
  _observer?.disconnect()
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
      legend: {
        labels: { color: textColor, boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        titleColor:      dark ? '#e2e8f0' : '#0f172a',
        bodyColor:       dark ? '#94a3b8' : '#475569',
        borderColor:     dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: mutedColor, font: { size: 11 } },
        grid:  { color: borderColor },
      },
      y: {
        position: 'left',
        ticks: {
          color: mutedColor,
          font: { size: 11 },
          callback: (v) => fmtBRL(v),
        },
        grid: { color: borderColor },
      },
    },
  }
})

// ── Modo de visão geral ───────────────────────────────────────────────────────
const overviewMode = ref('cards')
const overviewOptions = [
  { label: 'Totalizadores',   value: 'cards',   icon: 'pi pi-th-large'  },
  { label: 'Fluxo de caixa',  value: 'grafico', icon: 'pi pi-chart-bar' },
]
const overviewCollapsed  = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'

// ── Tamanho da tabela ─────────────────────────────────────────────────────────
const tableSizeOptions = [
  { label: 'Pequeno', value: 'small' },
  { label: 'Normal',  value: 'normal' },
  { label: 'Grande',  value: 'large' },
]
const tableSize = ref('small')
const settingsPopover = ref()
const toggleSettingsPopover = (e) => settingsPopover.value.toggle(e)

// ── Helpers visuais ───────────────────────────────────────────────────────────
const statusSeverity = (s) => ({
  'A receber':             'secondary',
  'A pagar':               'secondary',
  'Atrasada':              'danger',
  'Recebida':              'success',
  'Recebida parcialmente': 'warn',
  'Antecipada':            'info',
  'Paga':                  'success',
  'Paga parcialmente':     'warn',
}[s] ?? 'secondary')

const tipoSeverity = (t) => t === 'Entrada' ? 'info' : 'warn'
const tipoIcon     = (t) => t === 'Entrada' ? 'pi pi-arrow-circle-down' : 'pi pi-arrow-circle-up'
</script>

<template>
  <div class="af-page">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <div class="af-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="af-breadcrumb"
      />

      <div class="af-title-row">
        <span class="af-title">Meu Financeiro</span>
        <button class="af-conta-chip" @click="toggleAccountPopover">
          <span>{{ selectedContaLabel }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="af-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />
        <Button
          label="Novo lançamento"
          icon="pi pi-plus"
          class="af-cta"
          @click="toggleNovoLancamentoMenu"
        />
        <Menu ref="novoLancamentoMenu" :model="novoLancamentoItems" popup />
      </div>
    </div>

    <div class="af-body">

      <!-- ── Visão geral ────────────────────────────────────────────────── -->
      <div class="af-overview-card">

        <div class="af-overview-bar">
          <SelectButton
            v-model="overviewMode"
            :options="overviewOptions"
            option-label="label"
            option-value="value"
            size="small"
          />
          <div class="af-overview-actions">
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

        <!-- Gráfico de fluxo de caixa -->
        <div v-if="overviewMode === 'grafico' && !overviewCollapsed" class="af-chart-inner">
          <div class="af-chart-header">
            <span class="af-chart-title">Fluxo de caixa</span>
            <span class="af-chart-subtitle">Entradas e saídas agrupadas por semana</span>
          </div>
          <div class="af-chart-body">
            <Chart type="bar" :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Cards com saldo lateral -->
        <div v-if="overviewMode === 'cards' && !overviewCollapsed" class="af-cards-wrap">

          <!-- Saldo em bancos (não afetado por filtros) -->
          <div class="af-saldo-lateral">
            <span class="af-saldo-lateral-label">Em bancos</span>
            <span class="af-saldo-lateral-value">
              {{ showVal(saldoContas) }}
            </span>
          </div>

          <!-- Grid de cards -->
          <div class="af-cards">

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500, #3b82f6)' } }">
            <template #content>
              <div class="af-total-inner">
                <i class="pi pi-arrow-circle-down af-total-icon af-total-icon--receber" />
                <div class="af-total-body">
                  <span class="af-total-label">A receber</span>
                  <span class="af-total-value">{{ showVal(totais.totalReceber) }}</span>
                  <span class="af-total-count" :class="totais.atrasoReceber ? 'af-total-count--atraso' : ''">{{ fmtBRL(totais.atrasoReceber) }} em atraso</span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-orange-500, #f97316)' } }">
            <template #content>
              <div class="af-total-inner">
                <i class="pi pi-arrow-circle-up af-total-icon af-total-icon--pagar" />
                <div class="af-total-body">
                  <span class="af-total-label">A pagar</span>
                  <span class="af-total-value">{{ showVal(totais.totalPagar) }}</span>
                  <span class="af-total-count" :class="totais.atrasoPagar ? 'af-total-count--atraso' : ''">{{ fmtBRL(totais.atrasoPagar) }} em atraso</span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: `border-left: 3px solid ${totais.saldo >= 0 ? 'var(--p-green-500, #22c55e)' : 'var(--p-red-500, #ef4444)'}` } }">
            <template #content>
              <div class="af-total-inner">
                <i
                  class="af-total-icon"
                  :class="totais.saldo >= 0
                    ? 'pi pi-trending-up af-total-icon--saldo-positivo'
                    : 'pi pi-trending-down af-total-icon--saldo-negativo'"
                />
                <div class="af-total-body">
                  <span class="af-total-label">Saldo previsto</span>
                  <span
                    class="af-total-value"
                    :class="totais.saldo >= 0 ? 'af-total-value--positivo' : 'af-total-value--negativo'"
                  >
                    {{ showVal(totais.saldo) }}
                  </span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-purple-500, #a855f7)' } }">
            <template #content>
              <div class="af-total-inner">
                <i class="pi pi-shopping-cart af-total-icon af-total-icon--marketplace" />
                <div class="af-total-body">
                  <span class="af-total-label">Marketplace</span>
                  <span class="af-total-value">{{ showVal(totais.totalMarketplace) }}</span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-teal-500, #14b8a6)' } }">
            <template #content>
              <div class="af-total-inner">
                <i class="pi pi-credit-card af-total-icon af-total-icon--pos" />
                <div class="af-total-body">
                  <span class="af-total-label">POS</span>
                  <span class="af-total-value">{{ showVal(totais.totalPos) }}</span>
                </div>
              </div>
            </template>
          </Card>

          </div>
        </div>

      </div>

      <!-- ── Lançamentos ─────────────────────────────────────────────────── -->
      <div class="af-lancamentos">

        <div class="af-toolbar-wrap">
          <div class="af-toolbar">
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
            <IconField class="af-search">
              <InputIcon class="pi pi-search" />
              <InputText v-model="searchValue" placeholder="Buscar lançamento..." />
            </IconField>
            <SelectButton
              v-model="filterValues.period"
              :options="periodOptions"
              option-label="label"
              option-value="value"
            />
            <DatePicker
              v-model="filterValues.dateRange"
              class="af-datepicker"
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
            :selection-count="selectedLancamentos.length"
            :total-count="filteredLancamentos.length"
            :selection-actions="selectionActionsItems"
            :selection-total="selectionTotal"
            @clear="handleClearFilters"
            @clear-selection="clearSelection"
            @lower-selected="clearSelection"
          />
        </div>

        <DataTable
          v-model:selection="selectedLancamentos"
          :value="filteredLancamentos"
          dataKey="id"
          :size="tableSize === 'normal' ? undefined : tableSize"
          stripedRows
          paginator
          :rows="100"
          :rowsPerPageOptions="[50, 100, 200]"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          :pt="{ table: { style: 'table-layout: fixed; width: 100%' } }"
        >
          <template #empty>
            <div class="af-empty">
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
          <Column field="data" header="Vencimento" style="width: 9rem" sortable />
          <Column field="descricao" header="Descrição" style="width: 16rem; min-width: 8rem" sortable />
          <Column field="categoria" header="Categoria" style="width: 11rem" sortable />
          <Column field="tipo" header="Tipo" style="width: 9rem" sortable>
            <template #body="{ data }">
              <span class="af-tipo">
                <i :class="tipoIcon(data.tipo)" />
                {{ data.tipo }}
              </span>
            </template>
          </Column>
          <Column field="situacao" header="Situação" style="width: 13rem" sortable>
            <template #body="{ data }">
              <Tag :value="data.situacao" :severity="statusSeverity(data.situacao)" />
            </template>
          </Column>
          <Column
            field="valor"
            header="Valor"
            style="width: 9rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
            sortable
          />
          <Column headerStyle="width: 3rem" style="width: 3rem">
            <template #body="{ data }">
              <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleRowMenu($event, data)" />
            </template>
          </Column>
        </DataTable>

      </div>

    </div>

    <Menu ref="rowMenu" :model="rowMenuItems" popup />
    <ConfirmDialog :style="{ width: '28rem', maxWidth: '90vw' }" />

    <!-- ── Painéis de nova conta ─────────────────────────────────────────── -->
    <NovaContaReceberPanel v-model="showNovaContaReceber" :edit-item="editingContaReceber" />
    <NovaContaPagarPanel   v-model="showNovaContaPagar"   :edit-item="editingContaPagar" />

    <!-- ── Popover de seleção de conta ───────────────────────────────────── -->
    <Popover ref="accountPopover" class="af-account-popover">
      <div class="af-account-search">
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
      <ul class="af-account-list">
        <template v-for="conta in filteredContaOptions" :key="conta.label">
          <li v-if="conta.type === 'separator'" class="af-account-separator">
            {{ conta.label }}
          </li>
          <li
            v-else
            class="af-account-item"
            :class="{ 'is-selected': conta.id === filterValues.contaFinanceira }"
            @click="selectConta(conta)"
          >
            <i v-if="conta.id === filterValues.contaFinanceira" class="pi pi-check af-account-check" />
            <span v-else class="af-account-check-placeholder" />
            <span>{{ conta.label }}</span>
          </li>
        </template>
        <li v-if="!filteredContaOptions.length" class="af-account-empty">
          Nenhuma conta encontrada
        </li>
      </ul>
    </Popover>

    <!-- ── Botão flutuante de configurações ──────────────────────────────── -->
    <Button
      icon="pi pi-sliders-h"
      rounded
      severity="secondary"
      class="af-fab"
      @click="toggleSettingsPopover"
      v-tooltip.left="'Configurações da tabela'"
    />

    <Popover ref="settingsPopover" class="af-settings-popover">
      <div class="af-settings-content">
        <span class="af-settings-label">Densidade da tabela</span>
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
.af-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.af-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.af-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.af-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.af-title-row .af-actions-btn {
  margin-left: auto;
}

.af-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

/* ── Chip de conta ──────────────────────────────────────────────────────────── */
.af-conta-chip {
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

.af-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.af-conta-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Popover de conta ───────────────────────────────────────────────────────── */
.af-account-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 17rem;
}

.af-account-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.af-account-search :deep(.p-inputtext) {
  width: 100%;
}

.af-account-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.af-account-item {
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

.af-account-item:hover {
  background: var(--p-surface-hover);
}

.af-account-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.af-account-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.af-account-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.af-account-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.af-account-empty {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.af-cta {
  white-space: nowrap;
}

/* ── Toolbar da tabela ───────────────────────────────────────────────────────── */
.af-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.af-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.af-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.af-search :deep(.p-inputtext) {
  width: 100%;
}

.af-datepicker {
  width: 13rem;
  flex-shrink: 0;
}

.af-toolbar-wrap :deep(.fb) {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: 1px solid var(--p-surface-border);
}

/* ── Corpo ──────────────────────────────────────────────────────────────────── */
.af-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Visão geral (card contentor) ───────────────────────────────────────────── */
.af-overview-card {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.af-overview-bar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.af-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

/* ── Cards com saldo lateral ─────────────────────────────────────────────────── */
.af-cards-wrap {
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.af-saldo-lateral {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.125rem;
  padding: 1rem 1.25rem;
  border-right: 1px solid var(--p-surface-border);
}

.af-saldo-lateral-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.af-saldo-lateral-value {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--p-text-color);
}

.af-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.af-total-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.af-total-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.af-total-icon--receber         { color: var(--p-blue-500,   #3b82f6); }
.af-total-icon--pagar           { color: var(--p-orange-500, #f97316); }
.af-total-icon--saldo-positivo  { color: var(--p-green-500,  #22c55e); }
.af-total-icon--saldo-negativo  { color: var(--p-red-500,    #ef4444); }
.af-total-icon--marketplace     { color: var(--p-purple-500, #a855f7); }
.af-total-icon--pos             { color: var(--p-teal-500,   #14b8a6); }

.af-total-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.af-total-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.af-total-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}

.af-total-value--positivo { color: var(--p-green-600, #16a34a); }
.af-total-value--negativo { color: var(--p-red-600,   #dc2626); }

.af-total-count {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
}

.af-total-count--atraso {
  color: var(--p-red-500, #ef4444);
}

/* ── Responsivo cards ────────────────────────────────────────────────────────── */
@media (max-width: 1200px) {
  .af-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .af-cards-wrap {
    flex-direction: column;
  }

  .af-saldo-lateral {
    width: 100%;
    flex-direction: row;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
    border-right: none;
    border-bottom: 1px solid var(--p-surface-border);
  }

  .af-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Gráfico ────────────────────────────────────────────────────────────────── */
.af-chart-inner {
  display: flex;
  flex-direction: column;
}

.af-chart-header {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.af-chart-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.af-chart-subtitle {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.af-chart-body {
  padding: 1rem 1.25rem;
  height: 17rem;
}

.af-chart-body :deep(.p-chart) {
  height: 100%;
}

.af-chart-body :deep(canvas) {
  height: 100% !important;
}

/* ── Lançamentos (seção da tabela) ──────────────────────────────────────────── */
.af-lancamentos {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  overflow: hidden;
}


/* ── Coluna Tipo ────────────────────────────────────────────────────────────── */
.af-tipo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.af-tipo .pi-arrow-circle-down { color: var(--p-blue-500,   #3b82f6); }
.af-tipo .pi-arrow-circle-up   { color: var(--p-orange-500, #f97316); }

/* ── Estado vazio ───────────────────────────────────────────────────────────── */
.af-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.af-empty .pi {
  font-size: 1.5rem;
}

/* ── Botão flutuante ────────────────────────────────────────────────────────── */
.af-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.af-settings-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.af-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
