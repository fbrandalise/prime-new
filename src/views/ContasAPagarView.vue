<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'
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
import { useToast } from 'primevue/usetoast'
import FilterBar from '@/components/FilterBar.vue'
import NovaContaPagarPanel from '@/components/NovaContaPagarPanel.vue'
import ImportarDocumentosDialog from '@/components/ImportarDocumentosDialog.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import * as service from '@/services/contasAPagarService'
import { PERIODO_OPTIONS_PAGAR, buildDateRange } from '@/composables/usePeriodFilter'

// ── Stores ────────────────────────────────────────────────────────────────────
const store = useContasAPagarStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const toast = useToast()
const confirm = useConfirm()

onMounted(async () => {
  try {
    await Promise.all([store.fetchAll(), contasFinanceirasStore.fetchAll()])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os dados.', life: 4000 })
  }
})

// ── Nova / Editar conta a pagar ───────────────────────────────────────────────
const showNovaContaPanel = ref(false)
const editingRaw = ref(null)

// ── Importação em lote ───────────────────────────────────────────────────────
const showImportarDialog = ref(false)

// ── Abas ─────────────────────────────────────────────────────────────────────
const activeTab = ref('todas')

watch(showNovaContaPanel, (val) => {
  if (!val) editingRaw.value = null
})

// ── Breadcrumb ───────────────────────────────────────────────────────────────
const breadcrumbHome = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Contas a pagar' }]

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

const periodOptions = PERIODO_OPTIONS_PAGAR

// Todos os valores de filtro em um único objeto (v-model do FilterBar)
const filterValues = ref({
  period:          'mes',
  dateRange:       null,
  situacoes:       [],
  categoria:       [],
  formaPagamento:  [],
  valor:           '',
  contaFinanceira: [],
})

// Exclusividade mútua: período preset ↔ data personalizada
watch(() => filterValues.value.period,    (v) => { if (v) filterValues.value = { ...filterValues.value, dateRange: null } })
watch(() => filterValues.value.dateRange, (v) => { if (v?.[0]) filterValues.value = { ...filterValues.value, period: null } })

const activeDateRange = computed(() => {
  const { period, dateRange } = filterValues.value
  if (dateRange?.[0]) {
    return { from: dateRange[0], to: dateRange[1] ?? dateRange[0] }
  }
  return buildDateRange(period)
})

// Definição dos filtros (computed para opções dinâmicas de conta)
const filterDefs = computed(() => [
  { id: 'situacoes',       type: 'multiselect', label: 'Situação',           defaultVisible: true, options: ['Atrasada', 'A pagar', 'Paga', 'Paga parcialmente'], width: '11rem' },
  { id: 'categoria',       type: 'multiselect', label: 'Categoria',          placeholder: 'Todas categorias', options: ['Compras', 'Serviços', 'Aluguéis', 'Outros'], width: '11rem' },
  { id: 'formaPagamento',  type: 'multiselect', label: 'Forma de pagamento', placeholder: 'Todas',            options: ['Boleto', 'PIX', 'Cartão de crédito', 'Transferência', 'Dinheiro'], width: '12rem' },
  { id: 'valor',           type: 'input',       label: 'Valor',              placeholder: 'Valor',            width: '9rem' },
  { id: 'contaFinanceira', type: 'multiselect', label: 'Conta financeira',   placeholder: 'Todas as contas', options: contasFinanceirasStore.items.map(c => c.nome), width: '12rem' },
])

const handleClearFilters = () => {
  searchValue.value = ''
  filterValues.value = {
    period:          'mes',
    dateRange:       null,
    situacoes:       [],
    categoria:       [],
    formaPagamento:  [],
    valor:           '',
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
  { label: 'Exportar',           icon: 'pi pi-download' },
  { label: 'Imprimir',           icon: 'pi pi-print' },
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
    ...(s !== 'Paga' ? [{
      label: 'Marcar como paga',
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await store.baixar(id, 'Paga')
          toast.add({ severity: 'success', summary: 'Baixado', detail: 'Conta marcada como paga.', life: 3000 })
        } catch (err) {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível baixar a conta.', life: 4000 })
        }
      },
    }] : []),
    { separator: true },
    { label: 'Enviar comprovante de pagamento', icon: 'pi pi-envelope' },
    ...(s === 'Atrasada' || s === 'A pagar' ? [{ label: 'Imprimir comprovante', icon: 'pi pi-print' }] : []),
    { separator: true },
    {
      label: 'Excluir',
      icon: 'pi pi-trash',
      command: () => {
        confirm.require({
          header: 'Excluir conta a pagar?',
          message: `A conta de ${data?.fornecedor} (R$ ${data?.valor}, venc. ${data?.vencimento}) será excluída permanentemente. O lançamento vinculado na Agenda Financeira também será removido.`,
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

// ── Seleção de linhas ─────────────────────────────────────────────────────────
const selectedContas = ref([])

// ── Dados (via store) ─────────────────────────────────────────────────────────
const contas = computed(() => store.items.filter(c => c.situacao !== 'Para Aprovação'))
const paraAprovacaoContas = computed(() => store.items.filter(c => c.situacao === 'Para Aprovação'))

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  const [d, m, y] = str.split('/')
  return new Date(y, m - 1, d)
}

const filteredContas = computed(() =>
  contas.value.filter(c => {
    const q = searchValue.value.toLowerCase()
    const matchSearch = !q ||
      c.fornecedor.toLowerCase().includes(q) ||
      c.vencimento.includes(q) ||
      c.valor.includes(q)

    const matchSituacao       = !filterValues.value.situacoes.length      || filterValues.value.situacoes.includes(c.situacao)
    const matchCategoria      = !filterValues.value.categoria.length       || filterValues.value.categoria.includes(c.categoria)
    const matchFormaPagamento = !filterValues.value.formaPagamento.length  || filterValues.value.formaPagamento.includes(c.formaPagamento)
    const matchValor          = !filterValues.value.valor                  || c.valor.includes(filterValues.value.valor)
    const matchContaFinanceira = !filterValues.value.contaFinanceira?.length ||
      (() => {
        const cf = contasFinanceirasStore.items.find(cf => cf.id === c.conta_financeira_id)
        return filterValues.value.contaFinanceira.includes(cf?.nome)
      })()

    let matchDate = true
    if (activeDateRange.value) {
      const venc = parseDate(c.vencimento)
      matchDate = venc >= activeDateRange.value.from && venc <= activeDateRange.value.to
    }

    return matchSearch && matchSituacao && matchCategoria && matchFormaPagamento && matchValor && matchContaFinanceira && matchDate
  })
)

// ── Totalizadores ─────────────────────────────────────────────────────────────
const parseValor = (str) => parseFloat(str.replace(/\./g, '').replace(',', '.'))

const totais = computed(() => {
  let aPagar = 0, atrasado = 0, pago = 0
  let cntAPagar = 0, cntAtrasado = 0, cntPago = 0
  filteredContas.value.forEach(c => {
    const v = parseValor(c.valor)
    if (c.situacao === 'Atrasada')                                   { atrasado += v; cntAtrasado++ }
    else if (c.situacao === 'Paga' || c.situacao === 'Paga parcialmente') { pago     += v; cntPago++ }
    else                                                              { aPagar   += v; cntAPagar++ }
  })
  return { aPagar, atrasado, pago, cntAPagar, cntAtrasado, cntPago }
})

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)
const showVal = (v) => overviewValuesVisible.value ? fmtBRL(v) : 'R$ ••••'

// ── Ações dinâmicas da seleção ────────────────────────────────────────────────
const selectionActionsItems = computed(() => {
  const pagaveis = selectedContas.value.filter(c => c.situacao !== 'Paga' && c.situacao !== 'Paga parcialmente')
  const total    = selectedContas.value.length
  const labelCount = (base, n) => n < total ? `${base} (${n})` : base

  return [
    ...(pagaveis.length ? [{
      label: labelCount('Marcar como paga', pagaveis.length),
      icon: 'pi pi-check-circle',
      command: async () => {
        try {
          await Promise.all(pagaveis.map(c => store.baixar(c.id, 'Paga')))
          toast.add({ severity: 'success', summary: 'Baixadas', detail: `${pagaveis.length} conta(s) marcadas como pagas.`, life: 3000 })
          selectedContas.value = []
        } catch {
          toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível registrar os pagamentos.', life: 4000 })
        }
      },
    }] : []),
    { label: 'Gerar comprovantes',              icon: 'pi pi-receipt' },
    { label: 'Enviar comprovante de pagamento',  icon: 'pi pi-envelope' },
    { label: 'Imprimir comprovante',             icon: 'pi pi-print' },
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
    header: 'Excluir contas a pagar?',
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

// ── Tamanho da tabela ─────────────────────────────────────────────────────────
const tableSizeOptions = [
  { label: 'Pequeno', value: 'small' },
  { label: 'Normal',  value: 'normal' },
  { label: 'Grande',  value: 'large' },
]
const tableSize = ref('small')
const settingsPopover = ref()
const toggleSettingsPopover = (e) => settingsPopover.value.toggle(e)


const statusSeverity = (s) => ({
  'Atrasada':          'danger',
  'Paga parcialmente': 'success',
  'Paga':              'success',
  'A pagar':          'secondary',
  'Para Aprovação':    'warn',
}[s] ?? 'secondary')

// ── Ações de aprovação / rejeição ─────────────────────────────────────────────
const aprovarConta = async (id) => {
  try {
    await store.aprovar(id)
    toast.add({ severity: 'success', summary: 'Aprovada', detail: 'Conta movida para A pagar na Agenda Financeira.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível aprovar a conta.', life: 4000 })
  }
}

const rejeitarConta = (id, fornecedor) => {
  confirm.require({
    header: 'Rejeitar importação?',
    message: `A conta de "${fornecedor}" e o documento associado serão removidos permanentemente.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sim, rejeitar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await store.rejeitar(id)
        toast.add({ severity: 'success', summary: 'Rejeitada', detail: 'Conta removida.', life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível rejeitar a conta.', life: 4000 })
      }
    },
  })
}

const pagamentoIcon = (forma) => ({
  'Boleto':           'pi pi-barcode',
  'PIX':              'pi pi-bolt',
  'Cartão de crédito':'pi pi-credit-card',
  'Transferência':    'pi pi-arrow-right-arrow-left',
  'Dinheiro':         'pi pi-wallet',
}[forma] ?? 'pi pi-minus')
</script>

<template>
  <div class="cap-page">

    <!-- ── Cabeçalho ───────────────────────────────────────────────────── -->
    <div class="cap-header">
      <Breadcrumb
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="cap-breadcrumb"
      />

      <div class="cap-title-row">
        <span class="cap-title">Contas a pagar</span>
        <button class="cap-conta-chip" @click="toggleAccountPopover">
          <span>{{ selectedConta }}</span>
          <i class="pi pi-chevron-down" />
        </button>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="cap-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />
        <Button
          label="Importar em lote"
          icon="pi pi-upload"
          severity="secondary"
          variant="outlined"
          class="cap-cta"
          @click="showImportarDialog = true"
        />
        <Button label="Nova conta a pagar" icon="pi pi-plus" class="cap-cta" @click="showNovaContaPanel = true" />
      </div>

    </div>

    <div class="cap-body">

      <!-- ── Cards totalizadores ───────────────────────────────────────────── -->
      <div class="cap-overview-panel">
        <div class="cap-overview-bar">
          <span class="cap-overview-title">Resumo</span>
          <div class="cap-overview-actions">
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
        <div v-show="!overviewCollapsed" class="cap-cards-wrap">
          <div class="cap-totais">

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500, #3b82f6)' } }">
            <template #content>
              <div class="cap-total-inner">
                <i class="pi pi-clock cap-total-icon cap-total-icon--previsto" />
                <div class="cap-total-body">
                  <span class="cap-total-label">A pagar</span>
                  <span class="cap-total-value">{{ showVal(totais.aPagar) }}</span>
                  <span class="cap-total-count">{{ totais.cntAPagar }} contas</span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500, #ef4444)' } }">
            <template #content>
              <div class="cap-total-inner">
                <i class="pi pi-exclamation-circle cap-total-icon cap-total-icon--atrasado" />
                <div class="cap-total-body">
                  <span class="cap-total-label">Em atraso</span>
                  <span class="cap-total-value">{{ showVal(totais.atrasado) }}</span>
                  <span class="cap-total-count">{{ totais.cntAtrasado }} contas</span>
                </div>
              </div>
            </template>
          </Card>

          <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500, #22c55e)' } }">
            <template #content>
              <div class="cap-total-inner">
                <i class="pi pi-check-circle cap-total-icon cap-total-icon--pago" />
                <div class="cap-total-body">
                  <span class="cap-total-label">Pago</span>
                  <span class="cap-total-value">{{ showVal(totais.pago) }}</span>
                  <span class="cap-total-count">{{ totais.cntPago }} contas</span>
                </div>
              </div>
            </template>
          </Card>

          </div>
        </div>
      </div>

      <!-- ── Abas: Todas / Para Aprovação ─────────────────────────────────── -->
      <Tabs v-model:value="activeTab" class="cap-tabs">
        <TabList>
          <Tab value="todas">Todas</Tab>
          <Tab value="aprovacao">
            Para Aprovação
            <span v-if="paraAprovacaoContas.length" class="cap-tab-badge">{{ paraAprovacaoContas.length }}</span>
          </Tab>
        </TabList>

        <TabPanels>

          <!-- ── Tab: Todas ───────────────────────────────────────────────── -->
          <TabPanel value="todas">

      <!-- ── Tabela ────────────────────────────────────────────────────────── -->
      <div class="cap-contas cap-contas--tab">

        <div class="cap-toolbar">
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
          <IconField class="cap-search">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchValue" placeholder="Pesquise por fornecedor, vencimento ou valor" />
          </IconField>
          <SelectButton
            v-model="filterValues.period"
            :options="periodOptions"
            option-label="label"
            option-value="value"
          />
          <DatePicker
            v-model="filterValues.dateRange"
            class="cap-datepicker"
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
          :selection-count="selectedContas.length"
          :total-count="filteredContas.length"
          :selection-actions="selectionActionsItems"
          :selection-total="selectionTotal"
          @clear="handleClearFilters"
          @clear-selection="clearSelection"
          @lower-selected="clearSelection"
        />

        <DataTable
          v-model:selection="selectedContas"
          :value="filteredContas"
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
            <div class="cap-empty">
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
          <Column field="fornecedor" header="Fornecedor" style="width: 16rem; min-width: 8rem" sortable />
          <Column field="vencimento" header="Vencimento" style="width: 9rem" sortable />
          <Column field="formaPagamento" header="Forma de pagamento" style="width: 12rem" sortable>
            <template #body="{ data }">
              <span class="cap-pagamento">
                <i :class="pagamentoIcon(data.formaPagamento)" />
                {{ data.formaPagamento }}
              </span>
            </template>
          </Column>
          <Column field="situacao" header="Situação" style="width: 12rem" sortable>
            <template #body="{ data }">
              <Tag :value="data.situacao" :severity="statusSeverity(data.situacao)" />
            </template>
          </Column>
          <Column
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
      </div><!-- /.cap-contas -->

          </TabPanel><!-- /Tab todas -->

          <!-- ── Tab: Para Aprovação ──────────────────────────────────────── -->
          <TabPanel value="aprovacao">
            <div class="cap-contas cap-contas--tab">

              <div v-if="!paraAprovacaoContas.length" class="cap-empty cap-empty--tab">
                <i class="pi pi-check-circle" style="color: var(--p-green-500)" />
                <span>Nenhuma conta aguardando aprovação.</span>
              </div>

              <DataTable
                v-else
                :value="paraAprovacaoContas"
                dataKey="id"
                size="small"
                stripedRows
                :pt="{ table: { style: 'table-layout: fixed; width: 100%' } }"
              >
                <Column field="fornecedor" header="Fornecedor" style="width: 16rem; min-width: 8rem" sortable />
                <Column field="vencimento" header="Vencimento" style="width: 9rem" sortable />
                <Column
                  field="_valorCentavos"
                  header="Valor"
                  style="width: 9rem"
                  bodyStyle="text-align: right; font-weight: 600"
                  :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }"
                  sortable
                >
                  <template #body="{ data }">{{ data.valor }}</template>
                </Column>
                <Column field="historico" header="Histórico" style="min-width: 10rem" />
                <Column field="nro_documento" header="Nº Documento" style="width: 10rem" />
                <Column header="Documento" style="width: 7rem" bodyStyle="text-align: center">
                  <template #body="{ data }">
                    <a
                      v-if="data.documento_url"
                      :href="data.documento_url"
                      target="_blank"
                      rel="noopener"
                      class="cap-doc-link"
                      v-tooltip.top="'Visualizar documento'"
                    >
                      <i class="pi pi-file-pdf" />
                    </a>
                    <span v-else class="cap-no-doc">—</span>
                  </template>
                </Column>
                <Column header="Ações" style="width: 9rem" bodyStyle="text-align: center">
                  <template #body="{ data }">
                    <div class="cap-approval-actions">
                      <Button
                        icon="pi pi-check"
                        size="small"
                        severity="success"
                        rounded
                        v-tooltip.top="'Aprovar — mover para A pagar'"
                        @click="aprovarConta(data.id)"
                      />
                      <Button
                        icon="pi pi-times"
                        size="small"
                        severity="danger"
                        rounded
                        variant="outlined"
                        v-tooltip.top="'Rejeitar e remover'"
                        @click="rejeitarConta(data.id, data.fornecedor)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>

            </div><!-- /.cap-contas -->
          </TabPanel><!-- /Tab aprovacao -->

        </TabPanels>
      </Tabs><!-- /.cap-tabs -->

    </div>

    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <!-- ── Popover de seleção de conta ───────────────────────────────────── -->
    <Popover ref="accountPopover" class="cap-account-popover">
      <div class="cap-account-search">
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
      <ul class="cap-account-list">
        <template v-for="conta in filteredContaOptions" :key="conta.label">
          <li v-if="conta.type === 'separator'" class="cap-account-separator">
            {{ conta.label }}
          </li>
          <li
            v-else
            class="cap-account-item"
            :class="{ 'is-selected': conta.label === selectedConta, 'is-featured': conta.featured }"
            @click="selectConta(conta)"
          >
            <i v-if="conta.label === selectedConta" class="pi pi-check cap-account-check" />
            <span v-else class="cap-account-check-placeholder" />
            <i v-if="conta.featured" class="pi pi-star-fill cap-account-featured-icon" />
            <span>{{ conta.label }}</span>
          </li>
        </template>
        <li v-if="!filteredContaOptions.length" class="cap-account-empty">
          Nenhuma conta encontrada
        </li>
      </ul>
    </Popover>

    <!-- ── Botão flutuante de configurações ──────────────────────────────── -->
    <Button
      icon="pi pi-sliders-h"
      rounded
      severity="secondary"
      class="cap-fab"
      @click="toggleSettingsPopover"
      v-tooltip.left="'Configurações da tabela'"
    />

    <Popover ref="settingsPopover" class="cap-settings-popover">
      <div class="cap-settings-content">
        <span class="cap-settings-label">Densidade da tabela</span>
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

  <ConfirmDialog :style="{ width: '28rem', maxWidth: '90vw' }" />
  <NovaContaPagarPanel v-model="showNovaContaPanel" :edit-item="editingRaw" />
  <ImportarDocumentosDialog v-model="showImportarDialog" />
</template>

<style scoped>
.cap-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.cap-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cap-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.cap-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cap-title-row .cap-actions-btn {
  margin-left: auto;
}

.cap-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cap-toolbar :deep(.p-selectbutton) {
  flex-shrink: 0;
}

.cap-contas :deep(.fb) {
  margin: 0;
  border-bottom: 1px solid var(--p-surface-border);
}

.cap-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

/* ── Chip de conta ──────────────────────────────────────────────────────────── */
.cap-conta-chip {
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

.cap-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}

.cap-conta-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Forma de pagamento ─────────────────────────────────────────────────────── */
.cap-pagamento {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.cap-pagamento .pi {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}


.cap-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.cap-search :deep(.p-inputtext) {
  width: 100%;
}

.cap-datepicker {
  width: 11rem;
  flex-shrink: 0;
}

.cap-cta {
  white-space: nowrap;
}

/* ── Popover de conta ───────────────────────────────────────────────────────── */
.cap-account-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 17rem;
}

.cap-account-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cap-account-search :deep(.p-inputtext) {
  width: 100%;
}

.cap-account-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.cap-account-item {
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

.cap-account-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}

.cap-account-item:hover {
  background: var(--p-surface-hover);
}

.cap-account-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}

.cap-account-item.is-featured {
  font-weight: 600;
  color: var(--p-primary-700, #1d4ed8);
}

.cap-account-item.is-featured.is-selected {
  color: var(--p-primary-600, #2563eb);
}

.cap-account-featured-icon {
  font-size: 0.625rem;
  color: var(--p-primary-400, #60a5fa);
  margin-right: 0.125rem;
}

.cap-account-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}

.cap-account-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}

.cap-account-empty {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* ── Corpo da página ────────────────────────────────────────────────────────── */
.cap-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.cap-contas {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}


/* ── Botão flutuante ────────────────────────────────────────────────────────── */
.cap-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.cap-settings-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.cap-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Panel de totalizadores ─────────────────────────────────────────────────── */
.cap-overview-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.cap-overview-bar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cap-overview-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.cap-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.cap-cards-wrap {
  padding: 1rem;
}

/* ── Cards totalizadores ────────────────────────────────────────────────────── */
.cap-totais {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.cap-total-inner {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.cap-total-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.cap-total-icon--previsto { color: var(--p-blue-500, #3b82f6); }
.cap-total-icon--atrasado { color: var(--p-red-500, #ef4444); }
.cap-total-icon--pago     { color: var(--p-green-500, #22c55e); }

.cap-total-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cap-total-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.cap-total-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}

.cap-total-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── Abas ───────────────────────────────────────────────────────────────────── */
.cap-tabs {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

:deep(.cap-tabs .p-tablist) {
  border-bottom: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
}

.cap-contas--tab {
  border: none;
  border-radius: 0;
}

.cap-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--p-orange-500, #f97316);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  margin-left: 0.375rem;
  vertical-align: middle;
}

/* ── Ações de aprovação ─────────────────────────────────────────────────────── */
.cap-approval-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

/* ── Link para documento ────────────────────────────────────────────────────── */
.cap-doc-link {
  display: inline-flex;
  align-items: center;
  color: var(--p-primary-color);
  font-size: 1.125rem;
  transition: opacity 0.15s;
}

.cap-doc-link:hover {
  opacity: 0.75;
}

.cap-no-doc {
  color: var(--p-text-muted-color);
}

.cap-empty--tab {
  padding: 3rem 0;
}

/* ── Estado vazio ───────────────────────────────────────────────────────────── */
.cap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.cap-empty .pi {
  font-size: 1.5rem;
}

</style>
