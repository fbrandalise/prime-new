<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button      from 'primevue/button'
import InputText   from 'primevue/inputtext'
import IconField   from 'primevue/iconfield'
import InputIcon   from 'primevue/inputicon'
import Breadcrumb  from 'primevue/breadcrumb'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import Tag         from 'primevue/tag'
import Menu        from 'primevue/menu'
import Select      from 'primevue/select'
import DatePicker  from 'primevue/datepicker'
import Drawer      from 'primevue/drawer'
import Dialog      from 'primevue/dialog'
import Card        from 'primevue/card'
import { useToast }   from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog  from 'primevue/confirmdialog'
import { usePedidosDeVendaStore } from '@/stores/pedidosDeVenda'

// ── Store ─────────────────────────────────────────────────────────────────────
const store   = usePedidosDeVendaStore()
const toast   = useToast()
const confirm = useConfirm()

onMounted(() => store.fetchAll())

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome  = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Vendas' }, { label: 'Pedidos de venda' }]

// ── Filtro de loja ────────────────────────────────────────────────────────────
const LOJAS = ['Todas as lojas', 'Mercado Livre', 'Shopee', 'Amazon', 'Loja Virtual']
const selectedLoja = ref('Todas as lojas')

// ── Busca rápida ──────────────────────────────────────────────────────────────
const searchValue     = ref('')
const searchInputRef  = ref(null)

// ── Filtros avançados ─────────────────────────────────────────────────────────
const filtersOpen = ref(false)

const SITUACOES = [
  'Todos', 'Atendido', 'Atendido parcialmente', 'Cancelado',
  'Checkout parcial', 'Em aberto', 'Em andamento', 'Em devolução',
  'Em digitação', 'Faturado parcialmente', 'Pagamento aprovado',
  'Venda Agenciada', 'Verificado',
]

const RASTREAMENTOS = [
  'Todos', 'Postado', 'Em andamento', 'Não Entregue', 'Entregue',
  'Aguardando retirada', 'Aguardando etiqueta', 'Etiqueta disponível',
]

const TIPOS_ENTREGA = ['Todas', 'Prioritárias', 'Normal']

const filterValues = ref({
  situacao:      'Em aberto',
  vendedor:      '',
  produto:       '',
  lote:          '',
  cep:           '',
  rastreamento:  'Todos',
  tipoEntrega:   'Todas',
  codigoRastreio:'',
  transportador: '',
  numeroPedidoLoja: '',
  dateRange:     null,
})

const activeFilterCount = computed(() => {
  const f = filterValues.value
  let n = 0
  if (f.situacao && f.situacao !== 'Todos' && f.situacao !== 'Em aberto') n++
  if (f.vendedor)       n++
  if (f.produto)        n++
  if (f.lote)           n++
  if (f.rastreamento && f.rastreamento !== 'Todos') n++
  if (f.tipoEntrega && f.tipoEntrega !== 'Todas')   n++
  if (f.codigoRastreio) n++
  if (f.transportador)  n++
  if (f.dateRange?.[0]) n++
  return n
})

const appliedFilters = ref({ ...filterValues.value })

const applyFilters = () => {
  appliedFilters.value = { ...filterValues.value }
  filtersOpen.value = false
}

const clearFilters = () => {
  filterValues.value = {
    situacao: 'Todos', vendedor: '', produto: '', lote: '', cep: '',
    rastreamento: 'Todos', tipoEntrega: 'Todas', codigoRastreio: '',
    transportador: '', numeroPedidoLoja: '', dateRange: null,
  }
  appliedFilters.value = { ...filterValues.value }
}

// ── Filtragem ─────────────────────────────────────────────────────────────────
const parseDate = (str) => {
  if (!str) return null
  const [d, m, y] = str.split('/')
  return new Date(+y, +m - 1, +d)
}

const filteredItems = computed(() => {
  const q    = searchValue.value.toLowerCase()
  const f    = appliedFilters.value
  const loja = selectedLoja.value

  return store.items.filter(item => {
    const matchSearch = !q ||
      item.cliente.toLowerCase().includes(q) ||
      item.clienteHandle.toLowerCase().includes(q) ||
      String(item.numero).includes(q)

    const matchLoja   = loja === 'Todas as lojas' || item.loja === loja
    const matchSit    = !f.situacao || f.situacao === 'Todos' || item.situacao === f.situacao
    const matchRast   = !f.rastreamento || f.rastreamento === 'Todos' || item.rastreamento === f.rastreamento

    let matchDate = true
    if (f.dateRange?.[0]) {
      const d = parseDate(item.data)
      if (d) matchDate = d >= f.dateRange[0] && d <= (f.dateRange[1] ?? f.dateRange[0])
    }

    return matchSearch && matchLoja && matchSit && matchRast && matchDate
  })
})

// ── Totalizadores ─────────────────────────────────────────────────────────────
const totais = computed(() => {
  let emAberto = 0, atendido = 0, cancelado = 0, cntTotal = 0
  let valorTotal = 0
  filteredItems.value.forEach(p => {
    cntTotal++
    valorTotal += p.total
    if (['Em aberto', 'Em andamento', 'Em digitação', 'Pagamento aprovado', 'Verificado', 'Checkout parcial', 'Faturado parcialmente', 'Venda Agenciada'].includes(p.situacao))
      emAberto += p.total
    else if (['Atendido', 'Atendido parcialmente'].includes(p.situacao))
      atendido += p.total
    else if (p.situacao === 'Cancelado' || p.situacao === 'Em devolução')
      cancelado += p.total
  })
  return { emAberto, atendido, cancelado, cntTotal, valorTotal }
})

const overviewCollapsed = ref(false)
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Seleção ───────────────────────────────────────────────────────────────────
const selected = ref([])
const clearSelection = () => { selected.value = [] }
const selectionTotal = computed(() => {
  if (!selected.value.length) return null
  return selected.value.reduce((s, p) => s + p.total, 0)
})

// ── Menu de ações da toolbar ──────────────────────────────────────────────────
const actionsMenu = ref()
const actionsMenuItems = [
  { label: 'Importar pedidos',   icon: 'pi pi-upload' },
  { separator: true },
  { label: 'Exportar CSV',   icon: 'pi pi-file',       command: () => exportCSV()   },
  { label: 'Exportar Excel', icon: 'pi pi-file-excel', command: () => exportExcel() },
  { label: 'Imprimir / PDF', icon: 'pi pi-print',      command: () => exportPDF()   },
  { separator: true },
  { label: 'Excluir selecionados', icon: 'pi pi-trash',
    disabled: () => !selected.value.length,
    command: () => excluirSelecionados() },
]
const toggleActionsMenu = (e) => actionsMenu.value.toggle(e)

// ── Menu de ações por linha ───────────────────────────────────────────────────
const rowMenu = ref()
const currentRow = ref(null)

const SITUACOES_LINHA = ['Atendido', 'Cancelado', 'Em andamento', 'Em digitação', 'Venda Agenciada']

const rowMenuItems = computed(() => {
  const p = currentRow.value
  if (!p) return []
  return [
    { label: 'Editar',                    icon: 'pi pi-pencil' },
    { separator: true },
    { label: 'Gerar nota fiscal',          icon: 'pi pi-file-export' },
    { label: 'Gerar nota fiscal parcial',  icon: 'pi pi-file' },
    { label: 'Lançar estoque',             icon: 'pi pi-box' },
    { label: 'Lançar contas',              icon: 'pi pi-wallet' },
    { label: 'Gerar NFC-e',               icon: 'pi pi-receipt' },
    { label: 'Gerar nota serviço',         icon: 'pi pi-file' },
    { label: 'Gerar ordem serviço',        icon: 'pi pi-wrench' },
    { label: 'Clonar venda',              icon: 'pi pi-copy' },
    { label: 'Gerar reversão',            icon: 'pi pi-replay' },
    { separator: true },
    { label: 'Imprimir',                  icon: 'pi pi-print' },
    { label: 'Imprimir comprovante',      icon: 'pi pi-print' },
    { label: 'Imprimir c/ detalhes',      icon: 'pi pi-print' },
    { label: 'Imprimir etiqueta de envio', icon: 'pi pi-tag' },
    { label: 'Imprimir declaração de conteúdo', icon: 'pi pi-file-edit' },
    { label: 'Imprimir carnê',            icon: 'pi pi-print' },
    { label: 'Relatório de produção',     icon: 'pi pi-chart-bar' },
    { separator: true },
    { label: 'Enviar por e-mail',         icon: 'pi pi-envelope' },
    { label: 'Enviar por WhatsApp',       icon: 'pi pi-whatsapp' },
    { label: 'Emitir boletos',            icon: 'pi pi-barcode' },
    { label: 'Receber com Pix',           icon: 'pi pi-bolt' },
    { separator: true },
    ...SITUACOES_LINHA.filter(s => s !== p.situacao).map(s => ({
      label: s,
      icon: situacaoIcon(s),
      command: () => confirmarMudarSituacao(p, s),
    })),
    { separator: true },
    {
      label: 'Excluir',
      icon: 'pi pi-trash',
      command: () => confirmarExclusao(p),
    },
  ]
})

const toggleRowMenu = (e, data) => { currentRow.value = data; rowMenu.value.toggle(e) }

// ── Mudar situação ────────────────────────────────────────────────────────────
const confirmarMudarSituacao = (pedido, novaSituacao) => {
  confirm.require({
    header: `Mudar para "${novaSituacao}"?`,
    message: `O pedido #${pedido.numero} de ${pedido.cliente} será marcado como "${novaSituacao}".`,
    icon: 'pi pi-question-circle',
    acceptLabel: 'Confirmar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await store.mudarSituacao(pedido.id, novaSituacao)
        toast.add({ severity: 'success', summary: 'Situação atualizada', detail: `Pedido #${pedido.numero} → ${novaSituacao}`, life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível atualizar a situação.', life: 4000 })
      }
    },
  })
}

// ── Exclusão ──────────────────────────────────────────────────────────────────
const confirmarExclusao = (pedido) => {
  confirm.require({
    header: 'Excluir pedido?',
    message: `O pedido #${pedido.numero} de ${pedido.cliente} (${fmtBRL(pedido.total)}) será excluído permanentemente.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sim, excluir',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await store.remove(pedido.id)
        toast.add({ severity: 'success', summary: 'Excluído', detail: `Pedido #${pedido.numero} removido.`, life: 3000 })
        selected.value = selected.value.filter(s => s.id !== pedido.id)
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir o pedido.', life: 4000 })
      }
    },
  })
}

const excluirSelecionados = () => {
  if (!selected.value.length) return
  confirm.require({
    header: 'Excluir pedidos selecionados?',
    message: `${selected.value.length} pedido(s) serão excluídos permanentemente.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sim, excluir',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await Promise.all(selected.value.map(p => store.remove(p.id)))
        toast.add({ severity: 'success', summary: 'Excluídos', detail: `${selected.value.length} pedido(s) removidos.`, life: 3000 })
        selected.value = []
      } catch {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir os pedidos.', life: 4000 })
      }
    },
  })
}

// ── Ações em lote ─────────────────────────────────────────────────────────────
const selectionMenu = ref()
const selectionActionsItems = computed(() => [
  { label: 'Gerar NF-e dos selecionados',      icon: 'pi pi-file-export',
    disabled: !selected.value.length },
  { label: 'Mudar situação dos selecionados',   icon: 'pi pi-pencil',
    disabled: !selected.value.length },
  { label: 'Imprimir selecionados',             icon: 'pi pi-print',
    disabled: !selected.value.length },
  { label: 'Enviar dados para loja virtual',    icon: 'pi pi-globe',
    disabled: !selected.value.length },
  { label: 'Imprimir etiquetas de transporte',  icon: 'pi pi-tag',
    disabled: !selected.value.length },
  { separator: true },
  { label: 'Excluir selecionados', icon: 'pi pi-trash',
    command: excluirSelecionados },
])
const toggleSelectionMenu = (e) => selectionMenu.value.toggle(e)

// ── Situação: helpers visuais ─────────────────────────────────────────────────
const situacaoSeverity = (s) => ({
  'Em aberto':             'warn',
  'Em andamento':          'info',
  'Atendido':              'success',
  'Atendido parcialmente': 'success',
  'Pagamento aprovado':    'success',
  'Verificado':            'success',
  'Cancelado':             'danger',
  'Em devolução':          'danger',
  'Faturado parcialmente': 'info',
  'Checkout parcial':      'secondary',
  'Em digitação':          'secondary',
  'Venda Agenciada':       'secondary',
}[s] ?? 'secondary')

const situacaoIcon = (s) => ({
  'Em aberto':             'pi pi-clock',
  'Em andamento':          'pi pi-spin pi-spinner',
  'Atendido':              'pi pi-check-circle',
  'Atendido parcialmente': 'pi pi-check',
  'Pagamento aprovado':    'pi pi-dollar',
  'Verificado':            'pi pi-verified',
  'Cancelado':             'pi pi-times-circle',
  'Em devolução':          'pi pi-replay',
  'Faturado parcialmente': 'pi pi-file',
  'Checkout parcial':      'pi pi-shopping-cart',
  'Em digitação':          'pi pi-pen-to-square',
  'Venda Agenciada':       'pi pi-briefcase',
}[s] ?? 'pi pi-circle')

const rastreamentoSeverity = (r) => ({
  'Entregue':           'success',
  'Postado':            'info',
  'Em andamento':       'info',
  'Não Entregue':       'danger',
  'Aguardando retirada':'warn',
  'Aguardando etiqueta':'warn',
  'Etiqueta disponível':'secondary',
}[r] ?? 'secondary')

// ── Exportação ────────────────────────────────────────────────────────────────
const _cols = ['Nº', 'Data', 'Cliente', 'Total (R$)', 'Situação', 'Loja']
const _row  = (p) => [p.numero, p.data, `${p.cliente} (${p.clienteHandle})`, p.totalDisplay, p.situacao, p.loja]
const dlBlob = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click(); URL.revokeObjectURL(url)
}
const exportCSV = () => {
  const rows = [_cols, ...filteredItems.value.map(_row)]
  const csv  = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  dlBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), 'pedidos_de_venda.csv')
}
const exportExcel = () => {
  const rows = [_cols, ...filteredItems.value.map(_row)]
  const tbl  = '<table>' + rows.map(r => '<tr>' + r.map(v => `<td>${v ?? ''}</td>`).join('') + '</tr>').join('') + '</table>'
  dlBlob(new Blob([`<html><head><meta charset="utf-8"/></head><body>${tbl}</body></html>`], { type: 'application/vnd.ms-excel' }), 'pedidos_de_venda.xls')
}
const exportPDF = () => window.print()

// ── Atalhos de teclado ────────────────────────────────────────────────────────
const showShortcuts = ref(false)

const isEditingText = () => {
  const el = document.activeElement
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

const onGlobalKeydown = (e) => {
  if (e.key === '?' && !isEditingText()) { e.preventDefault(); showShortcuts.value = !showShortcuts.value; return }
  if (e.key === 'Escape') { showShortcuts.value = false; filtersOpen.value = false; return }
  if (isEditingText()) return
  if (e.key === '/') { e.preventDefault(); searchInputRef.value?.$el?.focus(); return }
}

onMounted(()   => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <ConfirmDialog />

  <div class="pdv-page">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <div class="pdv-header">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="pdv-breadcrumb" />

      <div class="pdv-title-row">
        <span class="pdv-title">Pedidos de venda</span>

        <!-- Seletor de loja -->
        <Select
          v-model="selectedLoja"
          :options="LOJAS"
          class="pdv-loja-select"
          size="small"
        />

        <!-- Ações -->
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          size="small"
          class="pdv-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />

        <!-- CTA -->
        <div class="pdv-cta-wrap">
          <Button
            label="Incluir pedido"
            icon="pi pi-plus"
            class="pdv-cta"
            size="small"
          />
          <kbd class="pdv-btn-kbd">N</kbd>
        </div>
      </div>
    </div>

    <div class="pdv-body">

      <!-- ── Cards totalizadores ───────────────────────────────────────────── -->
      <div class="pdv-overview-panel">
        <div class="pdv-overview-bar">
          <span class="pdv-overview-title">Resumo</span>
          <div class="pdv-overview-actions">
            <Button
              :icon="overviewCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
              variant="text" severity="secondary" size="small" rounded
              @click="overviewCollapsed = !overviewCollapsed"
            />
          </div>
        </div>

        <div v-show="!overviewCollapsed" class="pdv-cards-wrap">
          <div class="pdv-totais">

            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-surface-400)' } }">
              <template #content>
                <div class="pdv-total-inner">
                  <i class="pi pi-shopping-cart pdv-total-icon pdv-total-icon--total" />
                  <div class="pdv-total-body">
                    <span class="pdv-total-label">Total de pedidos</span>
                    <span class="pdv-total-value">{{ totais.cntTotal }}</span>
                    <span class="pdv-total-count">{{ fmtBRL(totais.valorTotal) }}</span>
                  </div>
                </div>
              </template>
            </Card>

            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-yellow-500, #eab308)' } }">
              <template #content>
                <div class="pdv-total-inner">
                  <i class="pi pi-clock pdv-total-icon pdv-total-icon--aberto" />
                  <div class="pdv-total-body">
                    <span class="pdv-total-label">Em aberto / andamento</span>
                    <span class="pdv-total-value">{{ fmtBRL(totais.emAberto) }}</span>
                    <span class="pdv-total-count">aguardando atendimento</span>
                  </div>
                </div>
              </template>
            </Card>

            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500, #22c55e)' } }">
              <template #content>
                <div class="pdv-total-inner">
                  <i class="pi pi-check-circle pdv-total-icon pdv-total-icon--atendido" />
                  <div class="pdv-total-body">
                    <span class="pdv-total-label">Atendidos</span>
                    <span class="pdv-total-value">{{ fmtBRL(totais.atendido) }}</span>
                    <span class="pdv-total-count">concluídos no período</span>
                  </div>
                </div>
              </template>
            </Card>

            <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500, #ef4444)' } }">
              <template #content>
                <div class="pdv-total-inner">
                  <i class="pi pi-times-circle pdv-total-icon pdv-total-icon--cancelado" />
                  <div class="pdv-total-body">
                    <span class="pdv-total-label">Cancelados / devoluções</span>
                    <span class="pdv-total-value">{{ fmtBRL(totais.cancelado) }}</span>
                    <span class="pdv-total-count">cancelados no período</span>
                  </div>
                </div>
              </template>
            </Card>

          </div>
        </div>
      </div>

      <!-- ── Seção principal (toolbar + tabela) ────────────────────────────── -->
      <div class="pdv-contas">

        <!-- ── Toolbar ──────────────────────────────────────────────────── -->
        <div class="pdv-toolbar">

          <!-- Busca -->
          <IconField class="pdv-search">
            <InputIcon class="pi pi-search" />
            <InputText
              ref="searchInputRef"
              v-model="searchValue"
              placeholder="Pesquisar por nome, e-mail, CPF/CNPJ ou nº do pedido"
            />
            <span class="pdv-search-kbd" aria-hidden="true">/</span>
          </IconField>

          <!-- DatePicker -->
          <DatePicker
            v-model="filterValues.dateRange"
            class="pdv-datepicker"
            selection-mode="range"
            show-icon
            icon-display="input"
            placeholder="Período personalizado"
            date-format="dd/mm/yy"
          />

          <!-- Filtros avançados -->
          <Button
            :icon="filtersOpen ? 'pi pi-filter-slash' : 'pi pi-filter'"
            :severity="activeFilterCount > 0 ? 'primary' : 'secondary'"
            size="small"
            :label="activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : 'Filtros'"
            class="pdv-filter-btn"
            @click="filtersOpen = !filtersOpen"
          />

          <!-- Atalhos -->
          <button
            class="pdv-kbd-trigger"
            v-tooltip.bottom="'Atalhos de teclado'"
            aria-label="Atalhos de teclado"
            @click="showShortcuts = !showShortcuts"
          >
            <kbd class="pdv-kbd pdv-kbd--btn">?</kbd>
          </button>
        </div>

        <!-- Chips de filtros ativos -->
        <div v-if="appliedFilters.situacao && appliedFilters.situacao !== 'Todos'" class="pdv-active-filters">
          <span class="pdv-filter-chip">
            Situação: {{ appliedFilters.situacao }}
            <button @click="clearFilters"><i class="pi pi-times" /></button>
          </span>
          <button class="pdv-clear-all" @click="clearFilters">Limpar</button>
        </div>

        <!-- ── Barra de seleção em lote ────────────────────────────────── -->
        <Transition name="pdv-selection-bar">
          <div v-if="selected.length" class="pdv-selection-bar">
            <Button icon="pi pi-times" text rounded size="small" @click="clearSelection" />
            <span class="pdv-sel-count">{{ selected.length }} selecionado(s)</span>
            <span v-if="selectionTotal" class="pdv-sel-total">· {{ fmtBRL(selectionTotal) }}</span>
            <Button label="Gerar NF-e" icon="pi pi-file-export" size="small" severity="secondary" />
            <Button label="Mudar situação" icon="pi pi-pencil" size="small" severity="secondary" />
            <Button label="Imprimir" icon="pi pi-print" size="small" severity="secondary" />
            <Button icon="pi pi-ellipsis-v" size="small" severity="secondary" @click="toggleSelectionMenu" />
            <Menu ref="selectionMenu" :model="selectionActionsItems" popup />
          </div>
        </Transition>

        <!-- ── DataTable ─────────────────────────────────────────────── -->
        <DataTable
        v-model:selection="selected"
        :value="filteredItems"
        :loading="store.loading"
        data-key="id"
        size="small"
        paginator
        :rows="50"
        :rows-per-page-options="[25, 50, 100]"
        scroll-height="flex"
        scrollable
        class="pdv-table"
      >
        <template #empty>
          <div class="pdv-empty">
            <i class="pi pi-inbox" />
            <span>Nenhum pedido encontrado.</span>
          </div>
        </template>

        <!-- Checkbox -->
        <Column selection-mode="multiple" style="width: 3rem; flex-shrink: 0" />

        <!-- Número -->
        <Column field="numero" header="Número" sortable style="width: 5rem">
          <template #body="{ data }">
            <span class="pdv-numero">{{ data.numero }}</span>
          </template>
        </Column>

        <!-- Data -->
        <Column field="_dataRaw" header="Data" sortable style="width: 8rem">
          <template #body="{ data }">{{ data.data }}</template>
        </Column>

        <!-- Cliente -->
        <Column field="cliente" header="Cliente" sortable style="min-width: 14rem">
          <template #body="{ data }">
            <span class="pdv-cliente-nome">{{ data.cliente }}</span>
            <span class="pdv-cliente-handle"> ({{ data.clienteHandle }})</span>
          </template>
        </Column>

        <!-- Total -->
        <Column field="total" header="Total (R$)" sortable style="width: 8rem; text-align: right">
          <template #body="{ data }">
            <span class="pdv-valor">{{ data.totalDisplay }}</span>
          </template>
        </Column>

        <!-- Situação + badges -->
        <Column field="situacao" header="Situação" sortable style="min-width: 16rem">
          <template #body="{ data }">
            <div class="pdv-situacao-cell">
              <Tag
                :value="data.situacao"
                :severity="situacaoSeverity(data.situacao)"
                class="pdv-situacao-tag"
              />
              <Tag
                v-if="data.rastreamento"
                :value="data.rastreamento"
                :severity="rastreamentoSeverity(data.rastreamento)"
                class="pdv-rastreio-tag"
                size="small"
              />
              <Tag
                v-if="data.primeiraVenda"
                value="1ª venda"
                severity="contrast"
                class="pdv-primeira-tag"
                size="small"
              />
            </div>
          </template>
        </Column>

        <!-- Loja -->
        <Column field="loja" header="Loja" style="width: 9rem">
          <template #body="{ data }">
            <span class="pdv-loja-badge">{{ data.loja }}</span>
          </template>
        </Column>

        <!-- Ações -->
        <Column style="width: 3rem; text-align: right; flex-shrink: 0">
          <template #body="{ data }">
            <Button
              icon="pi pi-ellipsis-v"
              text rounded size="small"
              @click="toggleRowMenu($event, data)"
            />
          </template>
        </Column>
      </DataTable>

        <Menu ref="rowMenu" :model="rowMenuItems" popup />

      </div><!-- /.pdv-contas -->

    </div><!-- /.pdv-body -->

    <!-- ── Drawer de filtros ──────────────────────────────────────────────── -->
    <Drawer
      v-model:visible="filtersOpen"
      header="Filtrar pedidos"
      position="left"
      class="pdv-filters-drawer"
    >
      <div class="pdv-filters-body">

        <div class="pdv-filter-field">
          <label>Situação</label>
          <Select v-model="filterValues.situacao" :options="SITUACOES" />
        </div>

        <div class="pdv-filter-field">
          <label>Vendedor</label>
          <InputText v-model="filterValues.vendedor" placeholder="Nome do vendedor" />
        </div>

        <div class="pdv-filter-field">
          <label>Produto</label>
          <InputText v-model="filterValues.produto" placeholder="Nome ou código" />
        </div>

        <div class="pdv-filter-field">
          <label>Rastreamento</label>
          <Select v-model="filterValues.rastreamento" :options="RASTREAMENTOS" />
        </div>

        <div class="pdv-filter-field">
          <label>Tipo de entrega</label>
          <Select v-model="filterValues.tipoEntrega" :options="TIPOS_ENTREGA" />
        </div>

        <div class="pdv-filter-field">
          <label>Código de rastreio</label>
          <InputText v-model="filterValues.codigoRastreio" placeholder="Código" />
        </div>

        <div class="pdv-filter-field">
          <label>Transportador</label>
          <InputText v-model="filterValues.transportador" placeholder="Nome do transportador" />
        </div>

        <div class="pdv-filter-field">
          <label>Nº pedido na loja virtual</label>
          <InputText v-model="filterValues.numeroPedidoLoja" placeholder="Nº do pedido" />
        </div>

        <div class="pdv-filter-field">
          <label>Período</label>
          <DatePicker v-model="filterValues.dateRange" selection-mode="range" show-icon date-format="dd/mm/yy" />
        </div>

      </div>

      <template #footer>
        <div class="pdv-filters-footer">
          <Button label="Limpar" severity="secondary" variant="text" @click="clearFilters" />
          <Button label="Filtrar" icon="pi pi-filter" @click="applyFilters" />
        </div>
      </template>
    </Drawer>

    <!-- ── Overlay de atalhos de teclado ────────────────────────────────── -->
    <Dialog
      v-model:visible="showShortcuts"
      modal
      header="Atalhos de teclado"
      :style="{ width: '22rem' }"
      :pt="{ header: { style: 'padding-bottom: 0.75rem' } }"
    >
      <div class="pdv-kbd-overlay">
        <div class="pdv-kbd-group">
          <span class="pdv-kbd-group-label">Navegação</span>
          <div class="pdv-kbd-row">
            <span class="pdv-kbd-desc">Focar busca</span>
            <kbd class="pdv-kbd">/</kbd>
          </div>
          <div class="pdv-kbd-row">
            <span class="pdv-kbd-desc">Incluir pedido</span>
            <kbd class="pdv-kbd">N</kbd>
          </div>
        </div>
        <div class="pdv-kbd-group">
          <span class="pdv-kbd-group-label">Interface</span>
          <div class="pdv-kbd-row">
            <span class="pdv-kbd-desc">Mostrar / fechar atalhos</span>
            <kbd class="pdv-kbd">?</kbd>
          </div>
          <div class="pdv-kbd-row">
            <span class="pdv-kbd-desc">Fechar painel ou modal</span>
            <kbd class="pdv-kbd">Esc</kbd>
          </div>
        </div>
      </div>
    </Dialog>

  </div>
</template>

<style scoped>
/* ── Página ───────────────────────────────────────────────────────────────── */
.pdv-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--p-surface-ground);
}

/* ── Cabeçalho ────────────────────────────────────────────────────────────── */
.pdv-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.pdv-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.pdv-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.pdv-title-row .pdv-actions-btn {
  margin-left: auto;
}

.pdv-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.pdv-loja-select {
  font-size: 0.8125rem;
}

:deep(.pdv-loja-select .p-select) {
  min-width: 9rem;
}

.pdv-cta-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pdv-btn-kbd {
  font-size: 0.6875rem;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-border);
  border-radius: 4px;
  padding: 0 5px;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

/* ── Corpo ────────────────────────────────────────────────────────────────── */
.pdv-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Overview ─────────────────────────────────────────────────────────────── */
.pdv-overview-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.pdv-overview-bar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.pdv-overview-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.pdv-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.pdv-cards-wrap { padding: 1rem; }

.pdv-totais {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .pdv-totais { grid-template-columns: repeat(2, 1fr); }
}

.pdv-total-inner {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.pdv-total-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}
.pdv-total-icon--total    { color: var(--p-text-muted-color); }
.pdv-total-icon--aberto   { color: var(--p-yellow-500, #eab308); }
.pdv-total-icon--atendido { color: var(--p-green-500,  #22c55e); }
.pdv-total-icon--cancelado{ color: var(--p-red-500,    #ef4444); }

.pdv-total-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}
.pdv-total-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}
.pdv-total-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}
.pdv-total-count { font-size: 0.75rem; color: var(--p-text-muted-color); }

/* ── Seção principal ──────────────────────────────────────────────────────── */
.pdv-contas {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

/* ── Toolbar ──────────────────────────────────────────────────────────────── */
.pdv-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.pdv-search {
  flex: 1;
  min-width: 0;
  max-width: 20rem;
}

.pdv-search :deep(.p-inputtext) {
  width: 100%;
}

.pdv-search-kbd {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-border);
  border-radius: 4px;
  padding: 0 4px;
  line-height: 1.6;
  pointer-events: none;
}

.pdv-datepicker { width: 11rem; flex-shrink: 0; }

.pdv-kbd-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

/* ── Teclas de atalho ─────────────────────────────────────────────────────── */
.pdv-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.125rem 0.375rem;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-border);
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--p-text-color);
}

.pdv-kbd--btn {
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.pdv-kbd--btn:hover {
  background: var(--p-surface-hover);
}

/* ── Chips de filtros ativos ───────────────────────────────────────────────── */
.pdv-active-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.pdv-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--p-text-color);
  background: var(--p-primary-50, #f0fdf4);
  border: 1px solid var(--p-primary-200, #bbf7d0);
  border-radius: 1rem;
  padding: 0.125rem 0.625rem;
}
.pdv-filter-chip button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--p-text-muted-color);
  line-height: 1;
}
.pdv-filter-chip button:hover { color: var(--p-text-color); }
.pdv-filter-chip .pi { font-size: 0.625rem; }

.pdv-clear-all {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--p-primary-color);
  font-weight: 600;
  padding: 0;
}
.pdv-clear-all:hover { text-decoration: underline; }

/* ── Barra de seleção ─────────────────────────────────────────────────────── */
.pdv-selection-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--p-primary-50, #f0fdf4);
  border-bottom: 1px solid var(--p-primary-200, #bbf7d0);
  padding: 0.375rem 1rem;
  flex-wrap: wrap;
}
.pdv-sel-count { font-size: 0.8125rem; font-weight: 600; }
.pdv-sel-total { font-size: 0.8125rem; color: var(--p-text-muted-color); }

.pdv-selection-bar-enter-from,
.pdv-selection-bar-leave-to   { opacity: 0; transform: translateY(-8px); }
.pdv-selection-bar-enter-active,
.pdv-selection-bar-leave-active{ transition: opacity 0.15s, transform 0.15s; }

/* ── Tabela ───────────────────────────────────────────────────────────────── */
.pdv-table {
  flex: 1;
  min-height: 0;
}

.pdv-numero {
  font-weight: 600;
  color: var(--p-primary-color);
}

.pdv-cliente-nome { font-weight: 500; }
.pdv-cliente-handle { color: var(--p-text-muted-color); font-size: 0.8125rem; }

.pdv-valor {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pdv-situacao-cell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.pdv-situacao-tag { font-size: 0.6875rem; }
.pdv-rastreio-tag { font-size: 0.6rem; }
.pdv-primeira-tag { font-size: 0.6rem; }

.pdv-loja-badge {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.pdv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}
.pdv-empty .pi { font-size: 1.5rem; }

/* ── Drawer de filtros ────────────────────────────────────────────────────── */
.pdv-filters-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pdv-filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pdv-filter-field label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pdv-filter-field :deep(.p-select),
.pdv-filter-field :deep(.p-inputtext),
.pdv-filter-field :deep(.p-datepicker) {
  width: 100%;
}

.pdv-filters-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-border);
}

/* ── Overlay de atalhos ───────────────────────────────────────────────────── */
.pdv-kbd-overlay {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.pdv-kbd-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pdv-kbd-group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  margin-bottom: 0.125rem;
}

.pdv-kbd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.pdv-kbd-desc { font-size: 0.8125rem; }
</style>
