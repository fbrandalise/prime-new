<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
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
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import BulkEditGrid from '@/components/BulkEditGrid.vue'
import ContasAReceberCharts from '@/components/ContasAReceberCharts.vue'
import FilterBar from '@/components/FilterBar.vue'
import ContasReceberDateFilterPopover from '@/components/ContasReceberDateFilterPopover.vue'
import NovaContaReceberPanel from '@/components/NovaContaReceberPanel.vue'
import AnteciparRecebiveis from '@/components/AnteciparRecebiveis.vue'
import { useContasAReceberStore } from '@/stores/contasAReceber'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { useLancamentosStore } from '@/stores/lancamentos'
import * as service from '@/services/contasAReceberService'
import { buildContasReceberCarDateRange } from '@/composables/usePeriodFilter'
import { pendingInsightAction } from '@/composables/useInsightActions'
import { useCarTour } from '@/composables/useCarTour'

// ── Stores ────────────────────────────────────────────────────────────────────
const store = useContasAReceberStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const contasAPagarStore = useContasAPagarStore()
const lancamentosStore = useLancamentosStore()
const toast = useToast()
const confirm = useConfirm()

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchAll(),
      contasFinanceirasStore.fetchAll(),
      contasAPagarStore.fetchAll(),
      lancamentosStore.fetchAll(),
    ])
  } catch (err) {
    loadError.value = 'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.'
  }
})

// ── Painel "Nova / Editar conta" ──────────────────────────────────────────────
const showNovaContaPanel = ref(false)
const editingRaw = ref(null)

watch(showNovaContaPanel, (val) => {
  if (!val) editingRaw.value = null
})

// ── Breadcrumb ───────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Contas a receber' }]

// ── Seletor de conta financeira ──────────────────────────────────────────────
const contaOptions = computed(() => {
  const all = [{ type: 'item', label: 'Todos os bancos' }]
  const bancos    = contasFinanceirasStore.items.filter(c => c.tipo === 'banco')
  const carteiras = contasFinanceirasStore.items.filter(c => c.tipo === 'carteira')
  const caixas    = contasFinanceirasStore.items.filter(c => c.tipo === 'caixa')
  if (bancos.length)    { all.push({ type: 'separator', label: 'Bancos'    }); bancos.forEach(c    => all.push({ type: 'item', label: c.nome })) }
  if (carteiras.length) { all.push({ type: 'separator', label: 'Carteiras' }); carteiras.forEach(c => all.push({ type: 'item', label: c.nome })) }
  if (caixas.length)    { all.push({ type: 'separator', label: 'Caixa'     }); caixas.forEach(c    => all.push({ type: 'item', label: c.nome })) }
  return all
})
const selectedConta = computed(() => {
  const cf = filterValues.value.contaFinanceira
  if (!cf?.length) return 'Todos os bancos'
  if (cf.length === 1) return cf[0]
  return `${cf.length} contas`
})

const accountPopover = ref()
const accountSearch = ref('')
const filteredContaOptions = computed(() => {
  const q = accountSearch.value.toLowerCase()
  if (!q) return contaOptions.value
  return contaOptions.value.filter(c => c.type === 'item' && c.label.toLowerCase().includes(q))
})
const toggleAccountPopover = (e) => accountPopover.value.toggle(e)
const selectConta = (conta) => {
  if (conta.label === 'Todos os bancos') {
    filterValues.value = { ...filterValues.value, contaFinanceira: [] }
  } else {
    filterValues.value = { ...filterValues.value, contaFinanceira: [conta.label] }
  }
  accountPopover.value.hide()
  accountSearch.value = ''
}

// ── Filtros ──────────────────────────────────────────────────────────────────
const searchValue = ref('')

const CAR_PERIOD_LABELS = {
  hoje: 'Hoje',
  estaSemana: 'Esta semana',
  semanaPassada: 'Semana passada',
  mes: 'Este mês',
  mesPassado: 'Mês passado',
  '30d': 'Últ. 30d',
  next30d: 'Próx. 30d',
  next3m: 'Próx. 3m',
  '7d': '7 dias',
  '15d': '15 dias',
  '3m': '3 meses',
  next7d: 'Próx. 7d',
}

// Todos os valores de filtro em um único objeto (v-model do FilterBar)
const filterValues = ref({
  dateField:       'vencimento',
  period:          'mes',
  dateRange:       null,
  situacoes:       [],
  categoria:       [],
  formaPagamento:  [],
  valor:           '',
  vendedor:        [],
  contaFinanceira: [],
})

// Exclusividade mútua: período preset ↔ data personalizada
watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

// ── Ações disparadas pelo painel de Insights ──────────────────────────────────
watch(pendingInsightAction, (action) => {
  if (!action) return
  if (action.type === 'filter-situacao') {
    filterValues.value = { ...filterValues.value, situacoes: action.value }
  } else if (action.type === 'filter-forma') {
    filterValues.value = { ...filterValues.value, formaPagamento: [action.value] }
  } else if (action.type === 'search') {
    searchValue.value = action.value
  }
  pendingInsightAction.value = null
})

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) {
    const f = new Date(dateRange[0])
    f.setHours(0, 0, 0, 0)
    const t = new Date(dateRange[1] ?? dateRange[0])
    t.setHours(23, 59, 59, 999)
    return { from: f, to: t }
  }
  return buildContasReceberCarDateRange(period)
})

const dateFilterSummary = computed(() => {
  const { period, dateRange } = filterValues.value
  if (period) {
    return CAR_PERIOD_LABELS[period] || period
  }
  if (dateRange?.[0]) {
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' }
    const a = dateRange[0].toLocaleDateString('pt-BR', opts)
    const b = (dateRange[1] ?? dateRange[0]).toLocaleDateString('pt-BR', opts)
    return a === b ? a : `${a} – ${b}`
  }
  return CAR_PERIOD_LABELS.mes
})

const onDateFilterApply = (payload) => {
  filterValues.value = {
    ...filterValues.value,
    dateField: payload.dateField,
    period: payload.period,
    dateRange: payload.dateRange,
  }
}

// Definição dos filtros (computed para opções dinâmicas de conta)
const filterDefs = computed(() => [
  { id: 'situacoes',       type: 'multiselect', label: 'Situação',           defaultVisible: true, options: ['Atrasada', 'A receber', 'Recebida', 'Recebida parcialmente', 'Antecipada'], width: '11rem' },
  { id: 'categoria',       type: 'multiselect', label: 'Categoria',          placeholder: 'Todas categorias', options: ['Vendas', 'Serviços', 'Aluguéis', 'Outros'], width: '11rem' },
  { id: 'formaPagamento',  type: 'multiselect', label: 'Forma de pagamento', placeholder: 'Todas',            options: ['Boleto', 'PIX', 'Cartão de crédito', 'Transferência', 'Dinheiro'], width: '12rem' },
  { id: 'valor',           type: 'input',       label: 'Valor',              placeholder: 'Valor',            width: '9rem' },
  { id: 'vendedor',        type: 'multiselect', label: 'Vendedor',           placeholder: 'Vendedor',         options: ['Miguel Gaieski', 'Rodrigo R.', 'Ana Paula Silva', 'Fernando Alves', 'Juliana Martins'], width: '11rem' },
  { id: 'contaFinanceira', type: 'multiselect', label: 'Conta financeira',   placeholder: 'Todas as contas', options: contasFinanceirasStore.items.map(c => c.nome), width: '12rem' },
])

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = {
    dateField:       'vencimento',
    period:          'mes',
    dateRange:       null,
    situacoes:       [],
    categoria:       [],
    formaPagamento:  [],
    valor:           '',
    vendedor:        [],
    contaFinanceira: [],
  }
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

// ── Menu de ações da toolbar ──────────────────────────────────────────────────
const actionsMenu = ref()
const actionsMenuItems = ref([
  { label: 'Importar registros', icon: 'pi pi-upload' },
  { separator: true },
  { label: 'Exportar CSV',   icon: 'pi pi-file',       command: () => exportCSV()   },
  { label: 'Exportar Excel', icon: 'pi pi-file-excel', command: () => exportExcel() },
  { label: 'Imprimir / PDF', icon: 'pi pi-print',      command: () => exportPDF()   },
  { separator: true },
  {
    label: 'Excluir selecionados',
    icon: 'pi pi-trash',
    disabled: () => !selectedContas.value.length,
    command: () => excluirSelecionados(),
  },
])
const toggleActionsMenu = (e) => actionsMenu.value.toggle(e)

// ── Menu de ações da linha (dinâmico por situação) ───────────────────────────
const rowMenu = ref()
const currentRowData = ref(null)
const rowMenuItems = computed(() => {
  const s    = currentRowData.value?.situacao
  const id   = currentRowData.value?.id
  const data = currentRowData.value
  return [
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: async () => {
        try {
          editingRaw.value = await service.getById(id)
          showNovaContaPanel.value = true
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os dados.', life: 4000 })
        }
      },
    },
    ...(s === 'A receber' || s === 'Atrasada' ? [{
      label: 'Marcar como recebida',
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await store.baixar(id, 'Recebida')
          toast.add({ severity: 'success', summary: 'Recebida', detail: `Recebimento de ${data?.cliente} confirmado.`, life: 3000 })
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar o recebimento.', life: 4000 })
        }
      },
    }] : []),
    ...(s === 'Recebida' || s === 'Recebida parcialmente' ? [{
      label: s === 'Recebida' ? 'Cancelar recebimento' : 'Cancelar recebimento parcial',
      icon: 'pi pi-times-circle',
      command: () => {
        confirm.require({
          header: s === 'Recebida' ? 'Cancelar recebimento?' : 'Cancelar recebimento parcial?',
          message: `O recebimento de ${data?.cliente} (R$ ${data?.valor}) será desfeito. A conta voltará para A receber ou Atrasada conforme o vencimento, e o lançamento na Agenda Financeira também será atualizado.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, cancelar',
          rejectLabel: 'Manter',
          acceptProps: { severity: 'warn' },
          accept: async () => {
            try {
              const novoStatus = await store.cancelarRecebimento(id)
              toast.add({ severity: 'info', summary: 'Cancelado', detail: `Recebimento cancelado. Conta voltou para ${novoStatus}.`, life: 3000 })
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cancelar o recebimento.', life: 4000 })
            }
          },
        })
      },
    }] : []),
    { separator: true },
    { label: 'Enviar cobrança por e-mail', icon: 'pi pi-envelope' },
    ...(s === 'Atrasada' || s === 'A receber' ? [{ label: 'Imprimir boleto', icon: 'pi pi-print' }] : []),
    { separator: true },
    {
      label: 'Excluir',
      icon: 'pi pi-trash',
      command: () => {
        confirm.require({
          header: 'Excluir conta a receber?',
          message: `A conta de ${data?.cliente} (R$ ${data?.valor}, venc. ${data?.vencimento}) será excluída permanentemente. O lançamento vinculado na Agenda Financeira também será removido.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, excluir',
          rejectLabel: 'Cancelar',
          acceptProps: { severity: 'danger' },
          accept: async () => {
            try {
              await store.remove(id)
              toast.add({ severity: 'success', summary: 'Excluído', detail: 'Conta e lançamento removidos.', life: 3000 })
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir a conta.', life: 4000 })
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

// ── Antecipação ───────────────────────────────────────────────────────────────
const showAntecipar  = ref(false)
const anteciparItems = ref([])

const saldoAtual = computed(() =>
  contasFinanceirasStore.items.reduce((sum, c) => sum + (c.saldoInicial ?? 0), 0)
)

const handleConfirmarAntecipacao = async ({ custoTotal }) => {
  try {
    await store.antecipar(anteciparItems.value.map(c => c.id), { custoTotal })
    showAntecipar.value = false
    selectedContas.value = []
    toast.add({ severity: 'success', summary: 'Antecipação confirmada',
      detail: `${anteciparItems.value.length} recebível(is) antecipado(s).`, life: 4000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Erro',
      detail: 'Não foi possível confirmar a antecipação.', life: 4000 })
  }
}

// ── Seleção de linhas ─────────────────────────────────────────────────────────
const selectedContas = ref([])

// ── Dados (via store) ─────────────────────────────────────────────────────────
const contas = computed(() => store.items)

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  const [d, m, y] = str.split('/')
  return new Date(y, m - 1, d)
}

const rowFilterDate = (c) => {
  if (filterValues.value.dateField === 'emissao') {
    if (!c._dataEmissaoRaw) return null
    return new Date(c._dataEmissaoRaw + 'T00:00:00')
  }
  return parseDate(c.vencimento)
}

const filteredContas = computed(() =>
  contas.value.filter(c => {
    const q = searchValue.value.toLowerCase()
    const matchSearch = !q ||
      c.cliente.toLowerCase().includes(q) ||
      c.vencimento.includes(q) ||
      (c.dataEmissao && c.dataEmissao.includes(q)) ||
      c.valor.includes(q)

    const matchSituacao       = !filterValues.value.situacoes.length      || filterValues.value.situacoes.includes(c.situacao)
    const matchCategoria      = !filterValues.value.categoria.length       || filterValues.value.categoria.includes(c.categoria)
    const matchFormaPagamento = !filterValues.value.formaPagamento.length  || filterValues.value.formaPagamento.includes(c.formaPagamento)
    const matchVendedor       = !filterValues.value.vendedor.length        || filterValues.value.vendedor.includes(c.vendedor)
    const matchValor          = !filterValues.value.valor                  || c.valor.includes(filterValues.value.valor)
    const matchContaFinanceira = !filterValues.value.contaFinanceira?.length ||
      (() => {
        const cf = contasFinanceirasStore.items.find(cf => cf.id === c.conta_financeira_id)
        return filterValues.value.contaFinanceira.includes(cf?.nome)
      })()

    let matchDate = true
    if (activeDateRange.value) {
      const d = rowFilterDate(c)
      if (d == null) matchDate = false
      else matchDate = d >= activeDateRange.value.from && d <= activeDateRange.value.to
    }

    return matchSearch && matchSituacao && matchCategoria && matchFormaPagamento && matchVendedor && matchValor && matchContaFinanceira && matchDate
  })
)

// ── Totalizadores ─────────────────────────────────────────────────────────────
const parseValor = (str) => parseFloat(str.replace(/\./g, '').replace(',', '.'))

const totais = computed(() => {
  let aReceber = 0, atrasado = 0, recebido = 0
  let cntAReceber = 0, cntAtrasado = 0, cntRecebido = 0
  filteredContas.value.forEach(c => {
    const v = parseValor(c.valor)
    if (c.situacao === 'Atrasada')                                             { atrasado  += v; cntAtrasado++ }
    else if (c.situacao === 'Recebida' || c.situacao === 'Recebida parcialmente') { recebido  += v; cntRecebido++ }
    else                                                                          { aReceber  += v; cntAReceber++ }
  })
  return { aReceber, atrasado, recebido, cntAReceber, cntAtrasado, cntRecebido }
})

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'

// ── Ações dinâmicas da seleção ────────────────────────────────────────────────
const FORMAS_ANTECIPAVEL = ['Boleto', 'Cartão de Crédito']

const selectionActionsItems = computed(() => {
  const recebiveis    = selectedContas.value.filter(c => c.situacao === 'A receber' || c.situacao === 'Atrasada')
  const antecipáveis  = recebiveis.filter(c => FORMAS_ANTECIPAVEL.includes(c.formaPagamento))
  const cancelaveis   = selectedContas.value.filter(c => c.situacao === 'Recebida' || c.situacao === 'Recebida parcialmente')
  const total         = selectedContas.value.length

  const labelCount = (base, n) => n < total ? `${base} (${n})` : base

  return [
    ...(recebiveis.length ? [{
      label: labelCount('Marcar como recebida', recebiveis.length),
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await Promise.all(recebiveis.map(c => store.baixar(c.id, 'Recebida')))
          toast.add({ severity: 'success', summary: 'Recebidas', detail: `${recebiveis.length} conta(s) marcadas como recebidas.`, life: 3000 })
          selectedContas.value = []
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar os recebimentos.', life: 4000 })
        }
      },
    }] : []),
    ...(antecipáveis.length ? [{
      label: labelCount('Antecipar', antecipáveis.length),
      icon: 'pi pi-bolt',
      command: () => { anteciparItems.value = antecipáveis; showAntecipar.value = true },
    }] : []),
    ...(cancelaveis.length ? [{
      label: labelCount('Cancelar recebimento', cancelaveis.length),
      icon: 'pi pi-times-circle',
      command: () => {
        confirm.require({
          header: 'Cancelar recebimentos?',
          message: `O recebimento de ${cancelaveis.length} conta(s) será desfeito. Cada conta voltará para A receber ou Atrasada conforme o vencimento, e os lançamentos na Agenda Financeira também serão atualizados.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, cancelar',
          rejectLabel: 'Manter',
          acceptProps: { severity: 'warn' },
          accept: async () => {
            try {
              await Promise.all(cancelaveis.map(c => store.cancelarRecebimento(c.id)))
              toast.add({ severity: 'info', summary: 'Cancelados', detail: `Recebimento de ${cancelaveis.length} conta(s) cancelado.`, life: 3000 })
              selectedContas.value = []
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cancelar os recebimentos.', life: 4000 })
            }
          },
        })
      },
    }] : []),
    { separator: true },
    { label: 'Gerar recibos',              icon: 'pi pi-receipt' },
    { label: 'Enviar cobrança por e-mail', icon: 'pi pi-envelope' },
    { label: 'Imprimir boleto',            icon: 'pi pi-print' },
    { label: 'Editar em massa',            icon: 'pi pi-pencil', command: openBulkEdit },
    { separator: true },
    {
      label: 'Excluir selecionados',
      icon: 'pi pi-trash',
      command: () => excluirSelecionados(),
    },
  ]
})
function excluirSelecionados() {
  const ids = selectedContas.value.map(c => c.id)
  if (!ids.length) return
  confirm.require({
    header: 'Excluir contas a receber?',
    message: `${ids.length} conta(s) serão excluídas permanentemente.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sim, excluir',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await Promise.all(ids.map(id => store.remove(id)))
        toast.add({ severity: 'success', summary: 'Excluído', detail: `${ids.length} conta(s) excluída(s).`, life: 3000 })
        selectedContas.value = []
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir as contas.', life: 4000 })
      }
    },
  })
}
const clearSelection = () => { selectedContas.value = [] }

const selectionTotal = computed(() => {
  if (!selectedContas.value.length) return null
  const sum = selectedContas.value.reduce((acc, c) => acc + (c._valorCentavos ?? 0), 0)
  return (sum / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
})

const primarySelectionAction = computed(() => {
  const recebiveis   = selectedContas.value.filter(c => c.situacao === 'A receber' || c.situacao === 'Atrasada')
  const antecipáveis = recebiveis.filter(c => FORMAS_ANTECIPAVEL.includes(c.formaPagamento))
  const cancelaveis  = selectedContas.value.filter(c => c.situacao === 'Recebida' || c.situacao === 'Recebida parcialmente')
  const total        = selectedContas.value.length
  const labelCount   = (base, n) => n < total ? `${base} (${n})` : base

  if (recebiveis.length) {
    return [
      {
        label: labelCount('Marcar como recebida', recebiveis.length),
        icon: 'pi pi-check-circle',
        command: async () => {
          try {
            await Promise.all(recebiveis.map(c => store.baixar(c.id, 'Recebida')))
            toast.add({ severity: 'success', summary: 'Recebidas', detail: `${recebiveis.length} conta(s) marcadas como recebidas.`, life: 3000 })
            selectedContas.value = []
          } catch {
            toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar os recebimentos.', life: 4000 })
          }
        },
      },
      ...(antecipáveis.length ? [{
        label: labelCount('Antecipar', antecipáveis.length),
        icon: 'pi pi-bolt',
        command: () => { anteciparItems.value = antecipáveis; showAntecipar.value = true },
      }] : []),
    ]
  }
  if (cancelaveis.length) {
    return {
      label: labelCount('Cancelar recebimento', cancelaveis.length),
      icon: 'pi pi-times-circle',
      command: () => {
        confirm.require({
          header: 'Cancelar recebimentos?',
          message: `O recebimento de ${cancelaveis.length} conta(s) será desfeito. Cada conta voltará para A receber ou Atrasada conforme o vencimento.`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sim, cancelar',
          rejectLabel: 'Manter',
          acceptProps: { severity: 'warn' },
          accept: async () => {
            try {
              await Promise.all(cancelaveis.map(c => store.cancelarRecebimento(c.id)))
              toast.add({ severity: 'info', summary: 'Cancelados', detail: `Recebimento de ${cancelaveis.length} conta(s) cancelado.`, life: 3000 })
              selectedContas.value = []
            } catch {
              toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cancelar os recebimentos.', life: 4000 })
            }
          },
        })
      },
    }
  }
  return null
})

// ── Modo de visualização ──────────────────────────────────────────────────────
const viewMode = ref('table') // 'table' | 'cards'

// ── Visibilidade de colunas ───────────────────────────────────────────────────
const columnDefs = [
  { key: 'cliente',        label: 'Cliente' },
  { key: 'vencimento',     label: 'Vencimento' },
  { key: 'formaPagamento', label: 'Forma de pagamento' },
  { key: 'situacao',       label: 'Situação' },
  { key: 'valor',          label: 'Valor total' },
]
const visibleColumns = ref(new Set(['cliente', 'vencimento', 'formaPagamento', 'situacao', 'valor']))
const toggleColumn = (key) => {
  const next = new Set(visibleColumns.value)
  if (next.has(key)) { if (next.size > 1) next.delete(key) }
  else next.add(key)
  visibleColumns.value = next
}
const colVisible = (key) => visibleColumns.value.has(key)

// ── Estado de erro de carregamento ────────────────────────────────────────────
const loadError = ref(null)
const retrying  = ref(false)
const retryLoad = async () => {
  retrying.value  = true
  loadError.value = null
  try {
    await Promise.all([
      store.fetchAll(),
      contasFinanceirasStore.fetchAll(),
      contasAPagarStore.fetchAll(),
      lancamentosStore.fetchAll(),
    ])
  } catch (err) {
    loadError.value = 'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.'
  } finally {
    retrying.value = false
  }
}


const statusSeverity = (s) => ({
  'Atrasada':              'danger',
  'Recebida parcialmente': 'success',
  'Recebida':              'success',
  'A receber':              'secondary',
  'Antecipada':            'info',
}[s] ?? 'secondary')

const pagamentoIcon = (forma) => ({
  'Boleto':           'pi pi-barcode',
  'PIX':              'pi pi-bolt',
  'Cartão de crédito':'pi pi-credit-card',
  'Transferência':    'pi pi-arrow-right-arrow-left',
  'Dinheiro':         'pi pi-wallet',
}[forma] ?? 'pi pi-minus')

// ── Opções para editores inline e edição em massa ─────────────────────────────
const formaPagamentoOptions = [
  'Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito',
  'Transferência Bancária', 'Dinheiro', 'Cheque',
]
const situacaoOptions = ['A receber', 'Atrasada', 'Recebida', 'Recebida parcialmente']

// ── Edição inline na tabela ───────────────────────────────────────────────────
const onCellEditComplete = async ({ data, newValue, value, field }) => {
  if (newValue === value || newValue == null || newValue === '') return

  const dbFieldMap = {
    cliente:        'cliente',
    vencimento:     'vencimento',
    formaPagamento: 'forma_pagamento',
    situacao:       'situacao',
  }
  const dbField = dbFieldMap[field]
  if (!dbField) return

  let dbValue = newValue
  if (field === 'vencimento') {
    const parts = newValue.split('/')
    if (parts.length === 3) dbValue = `${parts[2]}-${parts[1]}-${parts[0]}`
    else { data[field] = value; return } // revert invalid format
  }

  try {
    await store.patchField(data.id, dbField, dbValue)
  } catch {
    data[field] = value // revert on error
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar a alteração.', life: 3000 })
  }
}

// ── Edição em massa (fullscreen AG Grid) ─────────────────────────────────────
const bulkEditVisible = ref(false)
const openBulkEdit    = () => { bulkEditVisible.value = true }
const onBulkSaved     = () => { selectedContas.value = [] }

// ── Exportações ──────────────────────────────────────────────────────────────
const dlAnchor = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}
const _exportCols = ['Cliente', 'Vencimento', 'Forma de Pagamento', 'Situação', 'Valor']
const _exportRow  = (c) => [c.cliente, c.vencimento, c.formaPagamento ?? '', c.situacao, c.valor]

const exportCSV = () => {
  const rows = [_exportCols, ...filteredContas.value.map(_exportRow)]
  const csv  = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  dlAnchor(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), 'contas_a_receber.csv')
}
const exportExcel = () => {
  const rows = [_exportCols, ...filteredContas.value.map(_exportRow)]
  const tbl  = '<table>' + rows.map(r => '<tr>' + r.map(v => `<td>${v ?? ''}</td>`).join('') + '</tr>').join('') + '</table>'
  dlAnchor(new Blob([`<html><head><meta charset="utf-8"/></head><body>${tbl}</body></html>`], { type: 'application/vnd.ms-excel' }), 'contas_a_receber.xls')
}
const exportPDF = () => window.print()

// ── Drill-down por card de totalizador ───────────────────────────────────────
const overviewStatusFilter = ref('')
const toggleStatusFilter = (key) => {
  overviewStatusFilter.value = overviewStatusFilter.value === key ? '' : key
}
const tableContas = computed(() => {
  if (!overviewStatusFilter.value) return filteredContas.value
  const map = {
    aReceber: ['A receber', 'Antecipada'],
    atrasado: ['Atrasada'],
    recebido: ['Recebida', 'Recebida parcialmente'],
  }
  const allowed = map[overviewStatusFilter.value] ?? []
  return filteredContas.value.filter(c => allowed.includes(c.situacao))
})

// ── Tendências vs período anterior ───────────────────────────────────────────
const prevActiveDateRange = computed(() => {
  const r = activeDateRange.value
  if (!r?.from) return null
  const duration = r.to.getTime() - r.from.getTime()
  const prevTo   = new Date(r.from.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - duration)
  return { from: prevFrom, to: prevTo }
})
const prevTotais = computed(() => {
  const pr = prevActiveDateRange.value
  if (!pr) return { aReceber: 0, atrasado: 0, recebido: 0 }
  let aReceber = 0, atrasado = 0, recebido = 0
  contas.value.forEach(c => {
    const d = rowFilterDate(c)
    if (d == null || d < pr.from || d > pr.to) return
    const v = parseValor(c.valor)
    if      (c.situacao === 'Atrasada')                                               atrasado += v
    else if (c.situacao === 'Recebida' || c.situacao === 'Recebida parcialmente') recebido += v
    else                                                                               aReceber += v
  })
  return { aReceber, atrasado, recebido }
})
const deltaPercent = computed(() => {
  const pct = (cur, prv) => prv === 0 ? null : Math.round((cur - prv) / prv * 100)
  return {
    aReceber: pct(totais.value.aReceber, prevTotais.value.aReceber),
    atrasado: pct(totais.value.atrasado, prevTotais.value.atrasado),
    recebido: pct(totais.value.recebido, prevTotais.value.recebido),
  }
})

// ── Gráficos ──────────────────────────────────────────────────────────────────
const showCharts = ref(false)

// ── Tour ──────────────────────────────────────────────────────────────────────
const { start: startTour } = useCarTour({
  onStart: () => {
    // garante que o overview esteja expandido para os passos do tour
    overviewCollapsed.value = false
  },
})

// ── Atalhos de teclado ────────────────────────────────────────────────────────
const showShortcuts = ref(false)
const searchInputRef = ref(null)

const isEditingText = () => {
  const el = document.activeElement
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.closest('[data-primevue-datepicker]'))
}

const onGlobalKeydown = (e) => {
  // ? → abre overlay de atalhos (ignora shift+/ quando em input)
  if (e.key === '?' && !isEditingText()) {
    e.preventDefault()
    showShortcuts.value = !showShortcuts.value
    return
  }
  if (e.key === 'Escape') {
    showShortcuts.value = false
    return
  }
  if (isEditingText()) return

  // / → foca busca
  if (e.key === '/') {
    e.preventDefault()
    searchInputRef.value?.$el?.focus()
    return
  }
  // n → nova conta a receber
  if (e.key === 'n' || e.key === 'N') {
    if (!showNovaContaPanel.value) showNovaContaPanel.value = true
    return
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div class="car-page">

    <!-- ── Cabeçalho ───────────────────────────────────────────────────── -->
    <div class="car-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="car-breadcrumb"
      />

      <div class="car-title-row">
        <span class="car-title">Contas a receber</span>
        <Button
          label="Iniciar tour"
          icon="pi pi-map"
          variant="text"
          severity="secondary"
          size="small"
          class="car-tour-btn"
          @click="startTour"
        />
        <button class="car-conta-chip" @click="toggleAccountPopover">
          <span>{{ selectedConta }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="car-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />
        <div class="car-cta-wrap">
          <Button label="Nova conta a receber" icon="pi pi-plus" class="car-cta" @click="showNovaContaPanel = true" />
          <kbd class="car-btn-kbd">N</kbd>
        </div>
      </div>

    </div>

    <div class="car-body">

      <!-- ── Cards totalizadores ───────────────────────────────────────────── -->
      <div class="car-overview-panel">
        <div class="car-overview-bar">
          <span class="car-overview-title">Resumo</span>
          <div class="car-overview-actions">
            <Button
              icon="pi pi-chart-bar"
              variant="text"
              :severity="showCharts ? 'primary' : 'secondary'"
              size="small"
              rounded
              v-tooltip.bottom="showCharts ? 'Ocultar gráficos' : 'Exibir gráficos'"
              @click="showCharts = !showCharts"
            />
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
        <div v-show="!overviewCollapsed" class="car-cards-wrap">
          <div class="car-totais">

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500, #3b82f6)' } }">
            <template #content>
              <div class="car-total-inner">
                <i class="pi pi-clock car-total-icon car-total-icon--previsto" />
                <div class="car-total-body">
                  <span class="car-total-label">A receber</span>
                  <span class="car-total-value">{{ showVal(totais.aReceber) }}</span>
                  <span class="car-total-count">{{ totais.cntAReceber }} contas</span>
                  <span
                    v-if="deltaPercent.aReceber !== null"
                    class="car-total-delta"
                    :class="deltaPercent.aReceber > 0 ? 'car-total-delta--up' : deltaPercent.aReceber < 0 ? 'car-total-delta--down' : 'car-total-delta--flat'"
                  >
                    <i :class="deltaPercent.aReceber > 0 ? 'pi pi-arrow-up' : deltaPercent.aReceber < 0 ? 'pi pi-arrow-down' : 'pi pi-minus'" />
                    {{ Math.abs(deltaPercent.aReceber) }}% vs período anterior
                  </span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500, #ef4444)' } }">
            <template #content>
              <div class="car-total-inner">
                <i class="pi pi-exclamation-circle car-total-icon car-total-icon--atrasado" />
                <div class="car-total-body">
                  <span class="car-total-label">Em atraso</span>
                  <span class="car-total-value">{{ showVal(totais.atrasado) }}</span>
                  <span class="car-total-count">{{ totais.cntAtrasado }} contas</span>
                  <span
                    v-if="deltaPercent.atrasado !== null"
                    class="car-total-delta"
                    :class="deltaPercent.atrasado > 0 ? 'car-total-delta--down' : deltaPercent.atrasado < 0 ? 'car-total-delta--up' : 'car-total-delta--flat'"
                  >
                    <i :class="deltaPercent.atrasado > 0 ? 'pi pi-arrow-up' : deltaPercent.atrasado < 0 ? 'pi pi-arrow-down' : 'pi pi-minus'" />
                    {{ Math.abs(deltaPercent.atrasado) }}% vs período anterior
                  </span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-700, #008F42)' } }">
            <template #content>
              <div class="car-total-inner">
                <i class="pi pi-check-circle car-total-icon car-total-icon--recebido" />
                <div class="car-total-body">
                  <span class="car-total-label">Recebido</span>
                  <span class="car-total-value">{{ showVal(totais.recebido) }}</span>
                  <span class="car-total-count">{{ totais.cntRecebido }} contas</span>
                  <span
                    v-if="deltaPercent.recebido !== null"
                    class="car-total-delta"
                    :class="deltaPercent.recebido > 0 ? 'car-total-delta--up' : deltaPercent.recebido < 0 ? 'car-total-delta--down' : 'car-total-delta--flat'"
                  >
                    <i :class="deltaPercent.recebido > 0 ? 'pi pi-arrow-up' : deltaPercent.recebido < 0 ? 'pi pi-arrow-down' : 'pi pi-minus'" />
                    {{ Math.abs(deltaPercent.recebido) }}% vs período anterior
                  </span>
                </div>
              </div>
            </template>
          </Card>

          </div>
        </div>

        <!-- ── Gráficos interativos ──────────────────────────────────────── -->
        <Transition name="car-charts">
          <div v-if="showCharts && !overviewCollapsed" class="car-charts-section">
            <div class="car-charts-divider" />
            <ContasAReceberCharts :contas="filteredContas" :values-visible="overviewValuesVisible" />
          </div>
        </Transition>
      </div>

      <!-- ── Tabela ────────────────────────────────────────────────────────── -->
      <div class="car-contas">

        <div class="car-toolbar">
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
          <IconField class="car-search">
            <InputIcon class="pi pi-search" />
            <InputText ref="searchInputRef" v-model="searchValue" placeholder="Pesquise por cliente, vencimento ou valor" />
            <span class="car-search-kbd" aria-hidden="true">/</span>
          </IconField>
          <ContasReceberDateFilterPopover
            :summary-label="dateFilterSummary"
            :committed-date-field="filterValues.dateField"
            :committed-period="filterValues.period"
            :committed-date-range="filterValues.dateRange"
            @apply="onDateFilterApply"
          />
          <div class="car-view-toggle">
            <Button
              icon="pi pi-table"
              :severity="viewMode === 'table' ? 'primary' : 'secondary'"
              variant="text"
              rounded
              size="small"
              v-tooltip.bottom="'Tabela'"
              @click="viewMode = 'table'"
            />
            <Button
              icon="pi pi-th-large"
              :severity="viewMode === 'cards' ? 'primary' : 'secondary'"
              variant="text"
              rounded
              size="small"
              v-tooltip.bottom="'Cards'"
              @click="viewMode = 'cards'"
            />
          </div>
          <button
            class="car-kbd-trigger"
            v-tooltip.bottom="'Atalhos de teclado'"
            aria-label="Atalhos de teclado"
            @click="showShortcuts = true"
          >
            <kbd class="car-kbd car-kbd--btn">?</kbd>
          </button>
        </div>

        <FilterBar
          v-model="filterValues"
          v-model:filtersDrawerVisible="filtersDrawerVisible"
          :filters="filterDefs"
          :selection-count="selectedContas.length"
          :total-count="filteredContas.length"
          :selection-actions="selectionActionsItems"
          :primary-selection-action="primarySelectionAction"
          :selection-total="selectionTotal"
          :column-defs="columnDefs"
          :visible-columns="[...visibleColumns]"
          @clear="handleClearFilters"
          @clear-selection="clearSelection"
          @toggle-column="toggleColumn"
        />

        <!-- ── Estado de erro ────────────────────────────────────────────── -->
        <div v-if="loadError" class="car-load-error">
          <i class="pi pi-exclamation-circle car-load-error-icon" />
          <span class="car-load-error-title">Erro ao carregar dados</span>
          <span class="car-load-error-desc">{{ loadError }}</span>
          <Button
            label="Tentar novamente"
            icon="pi pi-refresh"
            severity="secondary"
            :loading="retrying"
            @click="retryLoad"
          />
        </div>

        <!-- ── Tabela ────────────────────────────────────────────────────── -->
        <DataTable
          v-else-if="viewMode === 'table'"
          v-model:selection="selectedContas"
          :value="filteredContas"
          dataKey="id"
          size="small"
          stripedRows
          resizableColumns
          columnResizeMode="expand"
          editMode="cell"
          @cell-edit-complete="onCellEditComplete"
          paginator
          :rows="100"
          :rowsPerPageOptions="[50, 100, 200]"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <template #empty>
            <div class="car-empty">
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
          <Column v-if="colVisible('cliente')" field="cliente" header="Cliente" style="width: 16rem; min-width: 8rem" sortable>
            <template #editor="{ data, field }">
              <InputText v-model="data[field]" fluid autofocus />
            </template>
          </Column>
          <Column v-if="colVisible('vencimento')" field="vencimento" header="Vencimento" style="width: 9rem" sortable>
            <template #editor="{ data, field }">
              <InputText v-model="data[field]" fluid autofocus placeholder="dd/mm/aaaa" style="width: 8rem" />
            </template>
          </Column>
          <Column v-if="colVisible('formaPagamento')" field="formaPagamento" header="Forma de pagamento" style="width: 12rem" sortable>
            <template #body="{ data }">
              <span class="car-pagamento">
                <i :class="pagamentoIcon(data.formaPagamento)" />
                {{ data.formaPagamento }}
              </span>
            </template>
            <template #editor="{ data, field }">
              <Select v-model="data[field]" :options="formaPagamentoOptions" fluid autofocus />
            </template>
          </Column>
          <Column v-if="colVisible('situacao')" field="situacao" header="Situação" style="width: 12rem" sortable>
            <template #body="{ data }">
              <Tag :value="data.situacao" :severity="statusSeverity(data.situacao)" />
            </template>
            <template #editor="{ data, field }">
              <Select v-model="data[field]" :options="situacaoOptions" fluid autofocus />
            </template>
          </Column>
          <Column
            v-if="colVisible('valor')"
            field="_valorCentavos"
            header="Valor total"
            style="width: 9rem"
            bodyStyle="text-align: right; font-weight: 600"
            :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
            sortable
          >
            <template #body="{ data }">{{ data.valor }}</template>
          </Column>
          <Column headerStyle="width: 3rem" style="width: 3rem">
            <template #body="{ data }">
              <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleRowMenu($event, data)" />
            </template>
          </Column>
        </DataTable>

        <!-- ── Cards ─────────────────────────────────────────────────────── -->
        <div v-else-if="viewMode === 'cards'" class="car-cards-grid">
          <div v-if="!filteredContas.length" class="car-empty" style="grid-column: 1 / -1; padding: 2.5rem 0">
            <i class="pi pi-filter-slash" />
            <span>Nenhum resultado para os filtros aplicados.</span>
            <Button label="Limpar filtros" icon="pi pi-times" size="small" severity="secondary" @click="handleClearFilters" />
          </div>
          <div
            v-for="conta in filteredContas"
            :key="conta.id"
            class="car-card-item"
            :class="{ 'car-card-item--atrasada': conta.situacao === 'Atrasada' }"
          >
            <div class="car-card-header">
              <span class="car-card-cliente">{{ conta.cliente }}</span>
              <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleRowMenu($event, conta)" />
            </div>
            <div class="car-card-valor">{{ conta.valor }}</div>
            <div class="car-card-meta">
              <span class="car-card-meta-item">
                <i class="pi pi-calendar" />
                venc. {{ conta.vencimento }}
              </span>
              <span v-if="conta.formaPagamento" class="car-card-meta-item">
                <i :class="pagamentoIcon(conta.formaPagamento)" />
                {{ conta.formaPagamento }}
              </span>
            </div>
            <div class="car-card-footer">
              <Tag :value="conta.situacao" :severity="statusSeverity(conta.situacao)" />
              <span v-if="conta.nro_documento" class="car-card-doc">{{ conta.nro_documento }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <!-- ── Popover de seleção de conta ───────────────────────────────────── -->
    <Popover ref="accountPopover" class="car-account-popover">
      <div class="car-account-search">
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
      <ul class="car-account-list">
        <template v-for="conta in filteredContaOptions" :key="conta.label">
          <li v-if="conta.type === 'separator'" class="car-account-separator">
            {{ conta.label }}
          </li>
          <li
            v-else
            class="car-account-item"
            :class="{ 'is-selected': conta.label === selectedConta, 'is-featured': conta.featured }"
            @click="selectConta(conta)"
          >
            <i v-if="conta.label === selectedConta" class="pi pi-check car-account-check" />
            <span v-else class="car-account-check-placeholder" />
            <i v-if="conta.featured" class="pi pi-star-fill car-account-featured-icon" />
            <span>{{ conta.label }}</span>
          </li>
        </template>
        <li v-if="!filteredContaOptions.length" class="car-account-empty">
          Nenhuma conta encontrada
        </li>
      </ul>
    </Popover>

    <ConfirmDialog :style="{ width: '28rem', maxWidth: '90vw' }" />

    <!-- ── Overlay de atalhos de teclado ─────────────────────────────── -->
    <Dialog
      v-model:visible="showShortcuts"
      modal
      header="Atalhos de teclado"
      :style="{ width: '22rem' }"
      :pt="{ header: { style: 'padding-bottom: 0.75rem' } }"
    >
      <div class="car-kbd-overlay">
        <div class="car-kbd-group">
          <span class="car-kbd-group-label">Navegação</span>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Focar busca</span>
            <kbd class="car-kbd">/</kbd>
          </div>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Nova conta a receber</span>
            <kbd class="car-kbd">N</kbd>
          </div>
        </div>
        <div class="car-kbd-group">
          <span class="car-kbd-group-label">Interface</span>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Mostrar / fechar atalhos</span>
            <kbd class="car-kbd">?</kbd>
          </div>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Fechar painel ou modal</span>
            <kbd class="car-kbd">Esc</kbd>
          </div>
        </div>
        <div class="car-kbd-group">
          <span class="car-kbd-group-label">Tabela</span>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Confirmar edição inline</span>
            <kbd class="car-kbd">Enter</kbd>
          </div>
          <div class="car-kbd-row">
            <span class="car-kbd-desc">Cancelar edição inline</span>
            <kbd class="car-kbd">Esc</kbd>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- ── Edição em massa: tela cheia AG Grid ──────────────────────────── -->
    <BulkEditGrid
      v-model="bulkEditVisible"
      :rows="selectedContas"
      @saved="onBulkSaved"
    />

    <!-- ── Painel: Nova / Editar conta a receber ─────────────────────────── -->
    <NovaContaReceberPanel v-model="showNovaContaPanel" :edit-item="editingRaw" />

    <!-- ── Dialog: Antecipação de recebíveis ────────────────────────────── -->
    <AnteciparRecebiveis
      v-model="showAntecipar"
      :items="anteciparItems"
      :saldo-atual="saldoAtual"
      :lancamentos="lancamentosStore.items"
      :contas-a-pagar="contasAPagarStore.items"
      @confirmed="handleConfirmarAntecipacao"
    />

  </div>
</template>

<style scoped>
.car-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.car-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.car-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.car-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.car-title-row .car-actions-btn {
  margin-left: auto;
}

.car-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.car-contas :deep(.fb) {
  margin: 0;
  border-bottom: 1px solid var(--p-surface-border);
}

.car-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

/* ── Chip de conta ──────────────────────────────────────────────────────────── */
.car-conta-chip {
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

.car-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.car-conta-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Forma de pagamento ─────────────────────────────────────────────────────── */
.car-pagamento {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.car-pagamento .pi {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}


.car-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.car-search :deep(.p-inputtext) {
  width: 100%;
}

.car-datepicker {
  width: 11rem;
  flex-shrink: 0;
}

.car-cta {
  white-space: nowrap;
}

.car-tour-btn {
  font-size: 0.8125rem;
  opacity: 0.75;
  transition: opacity 0.15s;
}

.car-tour-btn:hover {
  opacity: 1;
}

/* ── Popover de conta ───────────────────────────────────────────────────────── */
.car-account-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 17rem;
}

.car-account-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.car-account-search :deep(.p-inputtext) {
  width: 100%;
}

.car-account-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.car-account-item {
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

.car-account-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.car-account-item:hover {
  background: var(--p-surface-hover);
}

.car-account-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.car-account-item.is-featured {
  font-weight: 600;
  color: var(--p-primary-700, #1d4ed8);
}

.car-account-item.is-featured.is-selected {
  color: var(--p-primary-600, #2563eb);
}

.car-account-featured-icon {
  font-size: 0.625rem;
  color: var(--p-primary-400, #60a5fa);
  margin-right: 0.125rem;
}

.car-account-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.car-account-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.car-account-empty {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* ── Corpo da página ────────────────────────────────────────────────────────── */
.car-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.car-contas {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}


/* ── Panel de totalizadores ─────────────────────────────────────────────────── */
.car-overview-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.car-overview-bar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.car-overview-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.car-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.car-cards-wrap {
  padding: 1rem;
}

/* ── Cards totalizadores ────────────────────────────────────────────────────── */
.car-totais {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.car-total-inner {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.car-total-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.car-total-icon--previsto { color: var(--p-blue-500, #3b82f6); }
.car-total-icon--atrasado { color: var(--p-red-500, #ef4444); }
.car-total-icon--recebido { color: var(--p-green-700, #008F42); }

.car-total-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.car-total-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.car-total-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}

.car-total-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.car-total-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-top: 0.125rem;
}

.car-total-delta .pi {
  font-size: 0.5625rem;
}

.car-total-delta--up   { color: var(--p-green-700, #008F42); }
.car-total-delta--down { color: var(--p-red-500,   #ef4444); }
.car-total-delta--flat { color: var(--p-text-muted-color); }

/* ── Seção de gráficos ──────────────────────────────────────────────────────── */
.car-charts-divider {
  height: 1px;
  background: var(--p-surface-border);
}

.car-charts-enter-active,
.car-charts-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.car-charts-enter-from,
.car-charts-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Estado vazio ───────────────────────────────────────────────────────────── */
.car-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.car-empty .pi {
  font-size: 1.5rem;
}

/* ── Estado de erro de carregamento ─────────────────────────────────────────── */
.car-load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3.5rem 1rem;
  text-align: center;
}

.car-load-error-icon {
  font-size: 2.25rem;
  color: var(--p-red-400, #f87171);
}

.car-load-error-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.car-load-error-desc {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  max-width: 26rem;
  line-height: 1.5;
}

/* ── Resize de colunas ──────────────────────────────────────────────────────── */
.car-contas :deep(.p-datatable-column-resizer) {
  width: 6px;
  right: -3px;
  border-right: 2px solid transparent;
  transition: border-color 0.15s;
}

.car-contas :deep(th:hover .p-datatable-column-resizer),
.car-contas :deep(.p-datatable-column-resizer:hover) {
  border-right-color: var(--p-primary-400, #60a5fa);
}

.car-contas :deep(.p-datatable-column-resize-indicator) {
  background: var(--p-primary-400, #60a5fa);
  width: 2px;
}

/* ── Toggle de visualização ─────────────────────────────────────────────────── */
.car-view-toggle {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
  border-left: 1px solid var(--p-surface-border);
  padding-left: 0.5rem;
  margin-left: 0.25rem;
}

/* ── Cards grid ─────────────────────────────────────────────────────────────── */
.car-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.car-card-item {
  background: var(--p-surface-0, #fff);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  transition: box-shadow 0.15s;
}

.car-card-item:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.car-card-item--atrasada {
  border-left: 3px solid var(--p-red-400, #f87171);
}

.car-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.car-card-cliente {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.35;
}

.car-card-valor {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.car-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 1rem;
}

.car-card-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.car-card-meta-item .pi {
  font-size: 0.75rem;
}

.car-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--p-surface-border);
  margin-top: 0.125rem;
}

.car-card-doc {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Hint de busca ──────────────────────────────────────────────────────────── */
.car-search :deep(.p-iconfield) {
  position: relative;
}

.car-search-kbd {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-family: monospace;
  color: var(--p-text-muted-color);
  background: var(--p-surface-50);
  pointer-events: none;
  line-height: 1;
  transition: opacity 0.15s;
}

.car-search:focus-within .car-search-kbd {
  opacity: 0;
}

/* ── Badge kbd no botão CTA ─────────────────────────────────────────────────── */
.car-cta-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.car-btn-kbd {
  position: absolute;
  top: -0.45rem;
  right: -0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.2rem;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-bottom-width: 2px;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-family: monospace;
  font-weight: 700;
  color: var(--p-text-color);
  background: var(--p-surface-0, #fff);
  line-height: 1;
  font-style: normal;
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

/* ── Botão ? como kbd clicável ──────────────────────────────────────────────── */
.car-kbd-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  border-left: 1px solid var(--p-surface-border);
  padding-left: 0.625rem;
  margin-left: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.car-kbd-trigger:hover {
  opacity: 1;
}

.car-kbd--btn {
  font-size: 0.75rem;
  min-width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

/* ── Overlay de atalhos ─────────────────────────────────────────────────────── */
.car-kbd-overlay {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.car-kbd-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.car-kbd-group-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  margin-bottom: 0.125rem;
}

.car-kbd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.car-kbd-desc {
  font-size: 0.8125rem;
  color: var(--p-text-color);
}

.car-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.625rem;
  height: 1.625rem;
  padding: 0 0.375rem;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-bottom-width: 2px;
  border-radius: 0.3125rem;
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 600;
  color: var(--p-text-color);
  background: var(--p-surface-50);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Edição inline — célula em edição ───────────────────────────────────────── */
.car-contas :deep(.p-datatable-tbody > tr > td.p-cell-editing) {
  padding: 0.25rem 0.5rem;
}

.car-contas :deep(.p-datatable-tbody > tr > td.p-cell-editing .p-inputtext),
.car-contas :deep(.p-datatable-tbody > tr > td.p-cell-editing .p-select) {
  height: 2rem;
}


</style>
