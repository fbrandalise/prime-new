<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import Breadcrumb from 'primevue/breadcrumb'
import Card from 'primevue/card'
import Popover from 'primevue/popover'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Menu from 'primevue/menu'
import ProgressBar from 'primevue/progressbar'
import Select from 'primevue/select'
import ImportarExtratoDialog from '@/components/ImportarExtratoDialog.vue'
import { useConciliacaoStore } from '@/stores/conciliacao'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useContasAReceberStore } from '@/stores/contasAReceber'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { useLancamentosStore } from '@/stores/lancamentos'
import * as lancamentosService from '@/services/lancamentosService'

const toast                  = useToast()
const conciliacaoStore       = useConciliacaoStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const contasAReceberStore    = useContasAReceberStore()
const contasAPagarStore      = useContasAPagarStore()
const lancamentosStore       = useLancamentosStore()

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const breadcrumbHome  = { icon: 'pi pi-home' }
const breadcrumbItems = [{ label: 'Financeiro' }, { label: 'Conciliação Bancária' }]

// ── Filtros ───────────────────────────────────────────────────────────────────
const contaId    = ref(null)
const periodo    = ref(defaultPeriodo())
const showDialog = ref(false)

function defaultPeriodo() {
  const hoje = new Date()
  return [
    new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0),
  ]
}

const periodoFrom = computed(() => {
  const d = periodo.value?.[0]
  return d ? (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0] : null
})
const periodoTo = computed(() => {
  const d = periodo.value?.[1]
  return d ? (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0] : null
})

// ── Conta financeira pill ─────────────────────────────────────────────────────
const contaOptions = computed(() => {
  const all = []
  const bancos    = contasFinanceirasStore.items.filter(c => c.tipo === 'banco')
  const carteiras = contasFinanceirasStore.items.filter(c => c.tipo === 'carteira')
  const caixas    = contasFinanceirasStore.items.filter(c => c.tipo === 'caixa')
  if (bancos.length)    { all.push({ type: 'separator', label: 'Bancos'    }); bancos.forEach(c    => all.push({ type: 'item', id: c.id, label: c.nome })) }
  if (carteiras.length) { all.push({ type: 'separator', label: 'Carteiras' }); carteiras.forEach(c => all.push({ type: 'item', id: c.id, label: c.nome })) }
  if (caixas.length)    { all.push({ type: 'separator', label: 'Caixa'     }); caixas.forEach(c    => all.push({ type: 'item', id: c.id, label: c.nome })) }
  return all
})

const selectedContaLabel = computed(() => {
  if (!contaId.value) return 'Selecione a conta'
  const found = contaOptions.value.find(c => c.type === 'item' && c.id === contaId.value)
  return found?.label ?? 'Selecione a conta'
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
  contaId.value = conta.id
  accountPopover.value.hide()
  accountSearch.value = ''
}

// ── Menu ⋮ ────────────────────────────────────────────────────────────────────
const actionsMenu = ref()
const actionsMenuItems = ref([
  { label: 'Importar Extrato', icon: 'pi pi-upload', command: () => { showDialog.value = true } },
  { label: 'Atualizar',        icon: 'pi pi-refresh', command: () => carregar() },
])
const toggleActionsMenu = (e) => actionsMenu.value.toggle(e)

// ── Carregar ──────────────────────────────────────────────────────────────────
async function carregar() {
  if (!contaId.value || !periodoFrom.value || !periodoTo.value) return
  try {
    await conciliacaoStore.fetchExtrato(contaId.value, periodoFrom.value, periodoTo.value)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o extrato.', life: 4000 })
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      contasFinanceirasStore.fetchAll(),
      contasAReceberStore.fetchAll(),
      contasAPagarStore.fetchAll(),
      lancamentosStore.fetchAll(),
    ])
    const first = contaOptions.value.find(c => c.type === 'item')
    if (!contaId.value && first) {
      contaId.value = first.id
    }
    await carregar()
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os dados.', life: 4000 })
  }
})

watch(contaId, () => carregar())
function onPeriodoChange() {
  if (periodo.value?.[0] && periodo.value?.[1]) carregar()
}

// ── Overview panel ────────────────────────────────────────────────────────────
const overviewCollapsed     = ref(false)
const overviewValuesVisible = ref(true)

function fmtValor(centavos) {
  const abs = Math.abs(centavos)
  return (abs / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function showVal(centavos) {
  return overviewValuesVisible.value ? `R$ ${fmtValor(centavos)}` : 'R$ ••••'
}

const totalCreditos     = computed(() => conciliacaoStore.extrato.filter(e => e.tipo === 'Crédito').reduce((s, e) => s + e.valor, 0))
const totalDebitos      = computed(() => conciliacaoStore.extrato.filter(e => e.tipo === 'Débito').reduce((s, e) => s + e.valor, 0))
const saldoExtrato      = computed(() => totalCreditos.value - totalDebitos.value)
const cntCreditos       = computed(() => conciliacaoStore.extrato.filter(e => e.tipo === 'Crédito').length)
const cntDebitos        = computed(() => conciliacaoStore.extrato.filter(e => e.tipo === 'Débito').length)
const totalConciliados  = computed(() => conciliacaoStore.extrato.filter(e => e.conciliado).length)
const totalPendentes    = computed(() => conciliacaoStore.extrato.filter(e => !e.conciliado && !e.ignorado).length)
const totalIgnorados    = computed(() => conciliacaoStore.extrato.filter(e => e.ignorado).length)
const totalExtrato      = computed(() => conciliacaoStore.extrato.length)
const pctConciliados    = computed(() => totalExtrato.value ? Math.round(totalConciliados.value / totalExtrato.value * 100) : 0)

// ── Filtro tabs do extrato ───────────────────────────────────────────────────
const extratoFilter = ref('Todos')
const extratoFilterOptions = computed(() => [
  { label: 'Todos',       value: 'Todos',       count: totalExtrato.value },
  { label: 'Pendentes',   value: 'Pendentes',   count: totalPendentes.value },
  { label: 'Conciliados', value: 'Conciliados', count: totalConciliados.value },
  { label: 'Ignorados',   value: 'Ignorados',   count: totalIgnorados.value },
])

const filteredExtrato = computed(() => {
  const items = conciliacaoStore.extrato
  switch (extratoFilter.value) {
    case 'Pendentes':   return items.filter(e => !e.conciliado && !e.ignorado)
    case 'Conciliados': return items.filter(e => e.conciliado)
    case 'Ignorados':   return items.filter(e => e.ignorado)
    default:            return items
  }
})

// ── IDs já vinculados (evita duplicatas) ──────────────────────────────────────
const linkedReceberIds = computed(() => {
  const ids = new Set()
  conciliacaoStore.extrato.forEach(e => {
    if (e.contasAReceberIds) e.contasAReceberIds.forEach(id => ids.add(id))
    if (e.conta_a_receber_id) ids.add(e.conta_a_receber_id)
  })
  return ids
})
const linkedPagarIds = computed(() => {
  const ids = new Set()
  conciliacaoStore.extrato.forEach(e => {
    if (e.contasAPagarIds) e.contasAPagarIds.forEach(id => ids.add(id))
    if (e.conta_a_pagar_id) ids.add(e.conta_a_pagar_id)
  })
  return ids
})

// ── Auto-sugestão (per-item) ──────────────────────────────────────────────────
const DIAS_TOL = 3
function diasDiff(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / 86_400_000)
}

function sugestaoParaItem(item) {
  if (!item || item.conciliado || item.ignorado) return null
  const lista  = item.tipo === 'Crédito' ? contasAReceberStore.items : contasAPagarStore.items
  const linked = item.tipo === 'Crédito' ? linkedReceberIds.value  : linkedPagarIds.value
  const matches = lista.filter(c =>
    !linked.has(c.id) &&
    c._valorCentavos === item.valor &&
    c._vencimentoRaw &&
    diasDiff(c._vencimentoRaw, item.data) <= DIAS_TOL
  )
  if (matches.length !== 1) return null
  return { tipo: item.tipo === 'Crédito' ? 'receber' : 'pagar', conta: matches[0] }
}

// ── Candidatos per-item ──────────────────────────────────────────────────────
function candidatosParaItem(item, searchText) {
  if (!item || item.conciliado || item.ignorado) return []
  const lista  = item.tipo === 'Crédito' ? contasAReceberStore.items : contasAPagarStore.items
  const linked = item.tipo === 'Crédito' ? linkedReceberIds.value  : linkedPagarIds.value
  let result = lista.filter(c => !linked.has(c.id))
  const q = (searchText || '').toLowerCase().trim()
  if (q) {
    result = result.filter(c => {
      const name = (c.cliente || c.fornecedor || '').toLowerCase()
      const doc  = (c.nro_documento || '').toLowerCase()
      const val  = (c.valor || '').toLowerCase()
      return name.includes(q) || doc.includes(q) || val.includes(q)
    })
  }
  const sug = sugestaoParaItem(item)
  const sugId = sug?.conta?.id
  return result.sort((a, b) => {
    if (a.id === sugId) return -1
    if (b.id === sugId) return 1
    const da = a._vencimentoRaw ? diasDiff(a._vencimentoRaw, item.data) : 9999
    const db = b._vencimentoRaw ? diasDiff(b._vencimentoRaw, item.data) : 9999
    return da - db
  })
}

// ── Per-row state ─────────────────────────────────────────────────────────────
const rowState = reactive({})

function getRowState(itemId) {
  if (!rowState[itemId]) {
    rowState[itemId] = {
      search: '',
      selectedContaId: null,
      activeTab: 'buscar', // 'buscar' | 'novo'
      novoDescricao: '',
      novoCategoria: null,
      saving: false,
    }
  }
  return rowState[itemId]
}

// ── Status helper ────────────────────────────────────────────────────────────
function rowStatus(item) {
  if (item.ignorado)   return { label: 'Ignorado',   severity: 'secondary', icon: 'pi pi-ban' }
  if (item.conciliado) return { label: 'Conciliado', severity: 'success',   icon: 'pi pi-check-circle' }
  if (sugestaoParaItem(item)) return { label: 'Sugestão', severity: 'warn', icon: 'pi pi-bolt' }
  return { label: 'Pendente', severity: 'secondary', icon: 'pi pi-circle' }
}

// ── Entidades vinculadas (estado conciliado) per-item ─────────────────────────
function linkedEntitiesForItem(item) {
  if (!item?.conciliado) return []
  const entities = []
  if (item.contasAReceberIds?.length) {
    item.contasAReceberIds.forEach(id => {
      const c = contasAReceberStore.items.find(x => x.id === id)
      if (c) entities.push({ ...c, _tipo: 'receber' })
    })
  }
  if (item.contasAPagarIds?.length) {
    item.contasAPagarIds.forEach(id => {
      const c = contasAPagarStore.items.find(x => x.id === id)
      if (c) entities.push({ ...c, _tipo: 'pagar' })
    })
  }
  if (!entities.length) {
    if (item.conta_a_receber_id) {
      const c = contasAReceberStore.items.find(x => x.id === item.conta_a_receber_id)
      if (c) entities.push({ ...c, _tipo: 'receber' })
    }
    if (item.conta_a_pagar_id) {
      const c = contasAPagarStore.items.find(x => x.id === item.conta_a_pagar_id)
      if (c) entities.push({ ...c, _tipo: 'pagar' })
    }
  }
  return entities
}

function entityName(c) {
  if (!c) return '—'
  return c.cliente || c.fornecedor || '—'
}

function rowLinkedName(item) {
  if (!item.conciliado) return null
  if (item.contasAReceberIds?.length) {
    const c = contasAReceberStore.items.find(x => x.id === item.contasAReceberIds[0])
    return c?.cliente ?? null
  }
  if (item.contasAPagarIds?.length) {
    const c = contasAPagarStore.items.find(x => x.id === item.contasAPagarIds[0])
    return c?.fornecedor ?? null
  }
  if (item.conta_a_receber_id) return contasAReceberStore.items.find(c => c.id === item.conta_a_receber_id)?.cliente ?? null
  if (item.conta_a_pagar_id)   return contasAPagarStore.items.find(c => c.id === item.conta_a_pagar_id)?.fornecedor ?? null
  return null
}

// ── Per-item menu ⋮ ──────────────────────────────────────────────────────────
const itemMenuRefs = ref({})
const itemMenuTarget = ref(null)

function itemMenuItems(item) {
  const items = []
  if (!item.conciliado && !item.ignorado) {
    items.push({ label: 'Ignorar item', icon: 'pi pi-ban', command: () => ignorarItem(item.id) })
  }
  if (item.ignorado) {
    items.push({ label: 'Restaurar item', icon: 'pi pi-undo', command: () => restaurarItem(item.id) })
  }
  if (item.conciliado) {
    items.push({ label: 'Desvincular', icon: 'pi pi-undo', command: () => desconciliar(item.id) })
  }
  items.push({ label: 'Remover item', icon: 'pi pi-trash', command: () => removerItem(item.id) })
  return items
}

function toggleItemMenu(e, item) {
  itemMenuTarget.value = item
  const menuRef = itemMenuRefs.value[item.id]
  if (menuRef) menuRef.toggle(e)
}

// ── Ações ─────────────────────────────────────────────────────────────────────
async function conciliarItem(item) {
  const rs = getRowState(item.id)
  const sug = sugestaoParaItem(item)
  const contaIdToUse = rs.selectedContaId || sug?.conta?.id
  if (!contaIdToUse) return

  const tipo = item.tipo === 'Crédito' ? 'receber' : 'pagar'
  try {
    await conciliacaoStore.conciliar(item.id, {
      contasAPagarIds:   tipo === 'pagar'   ? [contaIdToUse] : [],
      contasAReceberIds: tipo === 'receber' ? [contaIdToUse] : [],
    })
    rs.selectedContaId = null
    rs.search = ''
    toast.add({ severity: 'success', summary: 'Conciliado', detail: 'Item conciliado com sucesso.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  }
}

async function conciliarTodos() {
  const pendentes = filteredExtrato.value.filter(e => !e.conciliado && !e.ignorado)
  let count = 0
  for (const item of pendentes) {
    const sug = sugestaoParaItem(item)
    if (!sug) continue
    try {
      await conciliacaoStore.conciliar(item.id, {
        contasAPagarIds:   sug.tipo === 'pagar'   ? [sug.conta.id] : [],
        contasAReceberIds: sug.tipo === 'receber' ? [sug.conta.id] : [],
      })
      count++
    } catch { /* skip individual errors */ }
  }
  if (count > 0) {
    toast.add({ severity: 'success', summary: 'Conciliados', detail: `${count} item(ns) conciliado(s).`, life: 3000 })
  } else {
    toast.add({ severity: 'info', summary: 'Nenhum', detail: 'Nenhuma sugestão pendente para conciliar.', life: 2500 })
  }
}

const totalSugestoes = computed(() => {
  return conciliacaoStore.extrato.filter(e => !e.conciliado && !e.ignorado && sugestaoParaItem(e)).length
})

async function desconciliar(extratoId) {
  try {
    await conciliacaoStore.desconciliar(extratoId)
    toast.add({ severity: 'info', summary: 'Desvinculado', detail: 'Conciliação desfeita.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  }
}

async function ignorarItem(extratoId) {
  try {
    await conciliacaoStore.ignorar(extratoId)
    toast.add({ severity: 'info', summary: 'Ignorado', detail: 'Item marcado como ignorado.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  }
}

async function restaurarItem(extratoId) {
  try {
    await conciliacaoStore.restaurar(extratoId)
    toast.add({ severity: 'info', summary: 'Restaurado', detail: 'Item restaurado.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  }
}

async function removerItem(extratoId) {
  try {
    await conciliacaoStore.removerItem(extratoId)
    toast.add({ severity: 'info', summary: 'Removido', detail: 'Item removido do extrato.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  }
}

// ── Novo lançamento inline ──────────────────────────────────────────────────
const categoriaOptions = [
  'Vendas', 'Serviços', 'Salários', 'Aluguel', 'Impostos',
  'Fornecedores', 'Marketing', 'Outros',
]

async function criarLancamentoInline(item) {
  const rs = getRowState(item.id)
  rs.saving = true
  try {
    const tipoLanc = item.tipo === 'Crédito' ? 'Entrada' : 'Saída'
    const payload = {
      descricao:           rs.novoDescricao || item.descricao || '—',
      categoria:           rs.novoCategoria || 'Outros',
      tipo:                tipoLanc,
      valor:               item.valor, // centavos
      data:                item.data, // YYYY-MM-DD
      situacao:            'Recebida',
      conta_financeira_id: contaId.value,
    }
    const raw = await lancamentosService.create(payload)
    // Add to lancamentos store
    lancamentosStore.items.unshift({
      id:                  raw.id,
      data:                lancamentosService.dateToDisplay(raw.data),
      descricao:           raw.descricao,
      categoria:           raw.categoria,
      tipo:                raw.tipo,
      valor:               lancamentosService.fromCents(raw.valor ?? 0)
                             .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      situacao:            raw.situacao,
      conta_financeira_id: raw.conta_financeira_id,
    })

    // Now auto-conciliar — we create a conta a receber/pagar placeholder or just mark conciliado
    // For simplicity, just mark the extrato item as conciliado directly
    await conciliacaoStore.conciliar(item.id, {
      contasAPagarIds: [],
      contasAReceberIds: [],
    })

    rs.novoDescricao = ''
    rs.novoCategoria = null
    rs.activeTab = 'buscar'
    toast.add({ severity: 'success', summary: 'Criado', detail: 'Lançamento criado e conciliado.', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 4000 })
  } finally {
    rs.saving = false
  }
}

// ── Can conciliar helper ────────────────────────────────────────────────────
function canConciliar(item) {
  const rs = getRowState(item.id)
  const sug = sugestaoParaItem(item)
  return !!(rs.selectedContaId || sug)
}

// ── Após importar ─────────────────────────────────────────────────────────────
function onImported(importedContaId) {
  if (importedContaId && contaId.value !== importedContaId) {
    contaId.value = importedContaId
  }
  carregar()
}
</script>

<template>
  <div class="cb-page">

    <!-- ── Cabeçalho ─────────────────────────────────────────────────────── -->
    <div class="cb-header">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="cb-breadcrumb" />

      <div class="cb-title-row">
        <span class="cb-title">Conciliação Bancária</span>

        <button class="cb-conta-chip" @click="toggleAccountPopover">
          <span>{{ selectedContaLabel }}</span>
          <i class="pi pi-chevron-down" />
        </button>

        <DatePicker
          v-model="periodo"
          selection-mode="range"
          :manual-input="false"
          date-format="dd/mm/yy"
          placeholder="Período"
          show-icon
          class="cb-datepicker"
          @update:model-value="onPeriodoChange"
        />

        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          class="cb-actions-btn"
          @click="toggleActionsMenu"
        />
        <Menu ref="actionsMenu" :model="actionsMenuItems" popup />
      </div>
    </div>

    <!-- ── Corpo ──────────────────────────────────────────────────────────── -->
    <div class="cb-body">

      <!-- Sem conta selecionada -->
      <div v-if="!contaId" class="cb-empty-page">
        <i class="pi pi-building-columns cb-empty-page-icon" />
        <p class="cb-empty-page-title">Selecione uma conta financeira</p>
        <p class="cb-empty-page-sub">Escolha a conta no seletor acima para visualizar e conciliar o extrato bancário.</p>
      </div>

      <template v-else>

        <!-- ── Overview Panel ──────────────────────────────────────────── -->
        <div class="cb-overview-panel">
          <div class="cb-overview-bar">
            <span class="cb-overview-title">Resumo</span>
            <div class="cb-overview-actions">
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
          <div v-show="!overviewCollapsed" class="cb-cards-wrap">
            <div class="cb-totais">
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-arrow-down-left cb-total-icon cb-total-icon--credito" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Créditos</span>
                      <span class="cb-total-value">{{ showVal(totalCreditos) }}</span>
                      <span class="cb-total-count">{{ cntCreditos }} itens</span>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-400)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-arrow-up-right cb-total-icon cb-total-icon--debito" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Débitos</span>
                      <span class="cb-total-value">{{ showVal(totalDebitos) }}</span>
                      <span class="cb-total-count">{{ cntDebitos }} itens</span>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-wallet cb-total-icon cb-total-icon--saldo" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Saldo</span>
                      <span class="cb-total-value" :class="saldoExtrato >= 0 ? 'cb-val-credito' : 'cb-val-debito'">
                        {{ saldoExtrato < 0 ? '−' : '' }}{{ showVal(saldoExtrato) }}
                      </span>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-check-circle cb-total-icon cb-total-icon--conciliado" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Conciliados</span>
                      <span class="cb-total-value">{{ totalConciliados }} <span class="cb-total-pct">({{ pctConciliados }}%)</span></span>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-yellow-500)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-clock cb-total-icon cb-total-icon--pendente" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Pendentes</span>
                      <span class="cb-total-value">{{ totalPendentes }}</span>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-surface-400)' } }">
                <template #content>
                  <div class="cb-total-inner">
                    <i class="pi pi-ban cb-total-icon cb-total-icon--ignorado" />
                    <div class="cb-total-body">
                      <span class="cb-total-label">Ignorados</span>
                      <span class="cb-total-value">{{ totalIgnorados }}</span>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
            <ProgressBar
              :value="pctConciliados"
              :show-value="false"
              class="cb-progress"
              :pt="{ value: { style: 'background: var(--p-green-500)' } }"
            />
          </div>
        </div>

        <!-- ── Tabs de filtro ───────────────────────────────────────────── -->
        <div class="cb-filter-tabs">
          <button
            v-for="opt in extratoFilterOptions"
            :key="opt.value"
            class="cb-filter-tab"
            :class="{ 'cb-filter-tab--active': extratoFilter === opt.value }"
            @click="extratoFilter = opt.value"
          >
            {{ opt.label }}
            <span class="cb-filter-tab-count">{{ opt.count }}</span>
          </button>
        </div>

        <!-- ── Column Headers ───────────────────────────────────────────── -->
        <div class="cb-col-headers">
          <span class="cb-col-header-left">
            <i class="pi pi-building-columns" />
            Extrato do Banco
            <Tag :value="String(filteredExtrato.length)" severity="secondary" />
          </span>
          <span class="cb-col-header-center">
            <Button
              v-if="totalSugestoes > 0"
              :label="`Conciliar Todos (${totalSugestoes})`"
              icon="pi pi-check-double"
              size="small"
              severity="success"
              @click="conciliarTodos"
            />
          </span>
          <span class="cb-col-header-right">
            <i class="pi pi-list" />
            Movimentações
          </span>
        </div>

        <!-- ── Loading ──────────────────────────────────────────────────── -->
        <div v-if="conciliacaoStore.loading" class="cb-loading">
          <i class="pi pi-spin pi-spinner" />
          <span>Carregando...</span>
        </div>

        <!-- ── Empty ────────────────────────────────────────────────────── -->
        <div v-else-if="filteredExtrato.length === 0" class="cb-empty-rows">
          <i class="pi pi-inbox" />
          <span>Nenhum item. Importe um extrato para começar.</span>
        </div>

        <!-- ── Rows lado-a-lado ─────────────────────────────────────────── -->
        <div v-else class="cb-rows">
          <div
            v-for="item in filteredExtrato"
            :key="item.id"
            class="cb-row"
            :class="{
              'cb-row--conciliado': item.conciliado,
              'cb-row--ignorado': item.ignorado,
            }"
          >
            <!-- ═══ ESQUERDA: Card do extrato ═══ -->
            <div class="cb-row-left">
              <div
                class="cb-extrato-card"
                :class="{
                  'cb-extrato-card--credito': item.tipo === 'Crédito',
                  'cb-extrato-card--debito': item.tipo === 'Débito',
                }"
              >
                <div class="cb-extrato-card-border" />
                <div class="cb-extrato-card-body">
                  <div class="cb-extrato-card-top">
                    <span class="cb-extrato-card-date">{{ item.dataDisplay }}</span>
                    <span class="cb-extrato-card-desc">{{ item.descricao || '—' }}</span>
                    <Tag
                      :value="item.tipo === 'Crédito' ? 'C' : 'D'"
                      :severity="item.tipo === 'Crédito' ? 'success' : 'danger'"
                      class="cb-extrato-card-tipo"
                    />
                    <Button
                      icon="pi pi-ellipsis-v"
                      variant="text"
                      severity="secondary"
                      size="small"
                      rounded
                      class="cb-item-menu-btn"
                      @click.stop="toggleItemMenu($event, item)"
                    />
                    <Menu
                      :ref="el => { if (el) itemMenuRefs[item.id] = el }"
                      :model="itemMenuItems(item)"
                      popup
                    />
                  </div>
                  <div class="cb-extrato-card-bottom">
                    <span v-if="rowLinkedName(item)" class="cb-extrato-card-linked">
                      <i class="pi pi-link" />
                      {{ rowLinkedName(item) }}
                    </span>
                    <span class="cb-extrato-card-valor" :class="item.tipo === 'Crédito' ? 'cb-val-credito' : 'cb-val-debito'">
                      {{ item.tipo === 'Débito' ? '−' : '' }}R$ {{ item.valorDisplay }}
                    </span>
                    <Tag
                      :value="rowStatus(item).label"
                      :severity="rowStatus(item).severity"
                      class="cb-extrato-card-status-tag"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- ═══ CENTRO: Botão Conciliar ═══ -->
            <div class="cb-row-center">
              <template v-if="item.conciliado">
                <i class="pi pi-check-circle cb-center-icon cb-center-icon--ok" />
              </template>
              <template v-else-if="item.ignorado">
                <i class="pi pi-ban cb-center-icon cb-center-icon--ignored" />
              </template>
              <template v-else>
                <Button
                  icon="pi pi-arrows-h"
                  size="small"
                  rounded
                  :disabled="!canConciliar(item)"
                  v-tooltip.bottom="'Conciliar'"
                  @click="conciliarItem(item)"
                />
              </template>
            </div>

            <!-- ═══ DIREITA: Painel de match ═══ -->
            <div class="cb-row-right">

              <!-- Estado: Conciliado -->
              <template v-if="item.conciliado">
                <div class="cb-match-card cb-match-card--conciliado">
                  <div v-for="ent in linkedEntitiesForItem(item)" :key="ent.id" class="cb-match-entity">
                    <div class="cb-match-entity-info">
                      <span class="cb-match-entity-name">{{ entityName(ent) }}</span>
                      <span class="cb-match-entity-meta">Venc. {{ ent.vencimento }} · {{ ent.situacao }}</span>
                    </div>
                    <span class="cb-match-entity-valor">R$ {{ ent.valor }}</span>
                  </div>
                  <div v-if="!linkedEntitiesForItem(item).length" class="cb-match-entity">
                    <span class="cb-match-entity-name" style="color: var(--p-text-muted-color)">Lançamento vinculado</span>
                  </div>
                </div>
              </template>

              <!-- Estado: Ignorado -->
              <template v-else-if="item.ignorado">
                <div class="cb-match-card cb-match-card--ignorado">
                  <i class="pi pi-ban" />
                  <span>Item ignorado</span>
                </div>
              </template>

              <!-- Estado: Pendente com sugestão -->
              <template v-else-if="sugestaoParaItem(item)">
                <div class="cb-match-card cb-match-card--sugestao">
                  <div class="cb-match-sug-header">
                    <Tag value="Match" severity="warn" />
                    <span class="cb-match-sug-label">Sugestão automática</span>
                  </div>
                  <div class="cb-match-entity">
                    <div class="cb-match-entity-info">
                      <span class="cb-match-entity-name">{{ entityName(sugestaoParaItem(item).conta) }}</span>
                      <span class="cb-match-entity-meta">
                        Venc. {{ sugestaoParaItem(item).conta.vencimento }}
                        · {{ sugestaoParaItem(item).conta.situacao }}
                      </span>
                    </div>
                    <span class="cb-match-entity-valor">R$ {{ sugestaoParaItem(item).conta.valor }}</span>
                  </div>
                </div>
              </template>

              <!-- Estado: Pendente sem sugestão — Buscar/Novo -->
              <template v-else>
                <div class="cb-match-card cb-match-card--pending">
                  <!-- Tab switcher -->
                  <div class="cb-match-tabs">
                    <button
                      class="cb-match-tab"
                      :class="{ 'cb-match-tab--active': getRowState(item.id).activeTab === 'buscar' }"
                      @click="getRowState(item.id).activeTab = 'buscar'"
                    >
                      <i class="pi pi-search" />
                      Buscar
                    </button>
                    <button
                      class="cb-match-tab"
                      :class="{ 'cb-match-tab--active': getRowState(item.id).activeTab === 'novo' }"
                      @click="getRowState(item.id).activeTab = 'novo'"
                    >
                      <i class="pi pi-plus" />
                      Novo
                    </button>
                  </div>

                  <!-- Tab: Buscar -->
                  <div v-if="getRowState(item.id).activeTab === 'buscar'" class="cb-match-buscar">
                    <IconField class="cb-match-search-field">
                      <InputIcon class="pi pi-search" />
                      <InputText
                        v-model="getRowState(item.id).search"
                        :placeholder="`Buscar ${item.tipo === 'Crédito' ? 'contas a receber' : 'contas a pagar'}...`"
                        size="small"
                      />
                    </IconField>

                    <div class="cb-match-candidates">
                      <div
                        v-if="candidatosParaItem(item, getRowState(item.id).search).length === 0"
                        class="cb-match-candidates-empty"
                      >
                        Nenhuma conta disponível.
                      </div>

                      <div
                        v-for="cand in candidatosParaItem(item, getRowState(item.id).search).slice(0, 5)"
                        :key="cand.id"
                        class="cb-match-cand"
                        :class="{ 'cb-match-cand--selected': getRowState(item.id).selectedContaId === cand.id }"
                        @click="getRowState(item.id).selectedContaId = getRowState(item.id).selectedContaId === cand.id ? null : cand.id"
                      >
                        <div class="cb-match-cand-info">
                          <span class="cb-match-cand-name">{{ cand.cliente || cand.fornecedor || '—' }}</span>
                          <span class="cb-match-cand-meta">
                            Venc. {{ cand.vencimento }}
                            <template v-if="cand.nro_documento"> · Doc {{ cand.nro_documento }}</template>
                          </span>
                        </div>
                        <span class="cb-match-cand-valor" :class="item.tipo === 'Crédito' ? 'cb-val-credito' : 'cb-val-debito'">
                          R$ {{ cand.valor }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Tab: Novo -->
                  <div v-else class="cb-match-novo">
                    <div class="cb-match-novo-row">
                      <label class="cb-match-novo-label">Valor</label>
                      <span class="cb-match-novo-readonly" :class="item.tipo === 'Crédito' ? 'cb-val-credito' : 'cb-val-debito'">
                        R$ {{ item.valorDisplay }}
                      </span>
                    </div>
                    <div class="cb-match-novo-row">
                      <label class="cb-match-novo-label">Data</label>
                      <span class="cb-match-novo-readonly">{{ item.dataDisplay }}</span>
                    </div>
                    <div class="cb-match-novo-row">
                      <label class="cb-match-novo-label">Tipo</label>
                      <Tag
                        :value="item.tipo === 'Crédito' ? 'Entrada' : 'Saída'"
                        :severity="item.tipo === 'Crédito' ? 'success' : 'danger'"
                      />
                    </div>
                    <div class="cb-match-novo-field">
                      <InputText
                        v-model="getRowState(item.id).novoDescricao"
                        :placeholder="item.descricao || 'Descrição'"
                        size="small"
                        fluid
                      />
                    </div>
                    <div class="cb-match-novo-field">
                      <Select
                        v-model="getRowState(item.id).novoCategoria"
                        :options="categoriaOptions"
                        placeholder="Categoria"
                        size="small"
                        fluid
                      />
                    </div>
                    <Button
                      label="Criar e conciliar"
                      icon="pi pi-check"
                      size="small"
                      :loading="getRowState(item.id).saving"
                      @click="criarLancamentoInline(item)"
                    />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

      </template>
    </div>

    <!-- ── Popover conta financeira ─────────────────────────────────────── -->
    <Popover ref="accountPopover" class="cb-account-popover">
      <div class="cb-account-search">
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
      <ul class="cb-account-list">
        <template v-for="conta in filteredContaOptions" :key="conta.label">
          <li v-if="conta.type === 'separator'" class="cb-account-separator">
            {{ conta.label }}
          </li>
          <li
            v-else
            class="cb-account-item"
            :class="{ 'is-selected': conta.id === contaId }"
            @click="selectConta(conta)"
          >
            <i v-if="conta.id === contaId" class="pi pi-check cb-account-check" />
            <span v-else class="cb-account-check-placeholder" />
            <span>{{ conta.label }}</span>
          </li>
        </template>
        <li v-if="!filteredContaOptions.length" class="cb-account-empty">
          Nenhuma conta encontrada
        </li>
      </ul>
    </Popover>

    <!-- ── Dialog de importação ──────────────────────────────────────────── -->
    <ImportarExtratoDialog v-model="showDialog" @imported="onImported" />

  </div>
</template>

<style scoped>
/* ── Página ─────────────────────────────────────────────────────────────────── */
.cb-page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.cb-header {
  background: var(--p-surface-card);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.cb-breadcrumb {
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  background: transparent;
}

.cb-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cb-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.cb-datepicker { min-width: 13rem; }

.cb-title-row .cb-actions-btn {
  margin-left: auto;
}

/* ── Pill chip ──────────────────────────────────────────────────────────────── */
.cb-conta-chip {
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
.cb-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-surface-400, #94a3b8);
}
.cb-conta-chip .pi-chevron-down {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

/* ── Account popover ────────────────────────────────────────────────────────── */
.cb-account-popover :deep(.p-popover-content) {
  padding: 0;
  min-width: 17rem;
}
.cb-account-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}
.cb-account-search :deep(.p-inputtext) { width: 100%; }
.cb-account-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}
.cb-account-item {
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
.cb-account-separator {
  padding: 0.375rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: default;
}
.cb-account-item:hover { background: var(--p-surface-hover); }
.cb-account-item.is-selected {
  color: var(--p-primary-600, #2563eb);
  font-weight: 600;
}
.cb-account-check {
  font-size: 0.75rem;
  color: var(--p-primary-600, #2563eb);
  flex-shrink: 0;
}
.cb-account-check-placeholder {
  display: inline-block;
  width: 0.75rem;
  flex-shrink: 0;
}
.cb-account-empty {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* ── Corpo ───────────────────────────────────────────────────────────────────── */
.cb-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

/* ── Empty page ─────────────────────────────────────────────────────────────── */
.cb-empty-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 4rem 1rem;
  color: var(--p-text-muted-color);
}
.cb-empty-page-icon  { font-size: 3rem; opacity: 0.2; }
.cb-empty-page-title { font-size: 1rem; font-weight: 600; color: var(--p-text-color); margin: 0; }
.cb-empty-page-sub   { font-size: 0.875rem; margin: 0; max-width: 28rem; }

/* ── Overview Panel ─────────────────────────────────────────────────────────── */
.cb-overview-panel {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}
.cb-overview-bar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}
.cb-overview-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}
.cb-overview-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}
.cb-cards-wrap { padding: 1rem; }
.cb-totais {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
@media (max-width: 1200px) {
  .cb-totais { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .cb-totais { grid-template-columns: 1fr; }
}
.cb-total-inner {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.cb-total-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}
.cb-total-icon--credito   { color: var(--p-green-500); }
.cb-total-icon--debito    { color: var(--p-red-400); }
.cb-total-icon--saldo     { color: var(--p-blue-500); }
.cb-total-icon--conciliado{ color: var(--p-green-500); }
.cb-total-icon--pendente  { color: var(--p-yellow-500); }
.cb-total-icon--ignorado  { color: var(--p-surface-400); }
.cb-total-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}
.cb-total-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}
.cb-total-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}
.cb-total-pct {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}
.cb-total-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}
.cb-progress {
  margin-top: 0.75rem;
  height: 0.375rem;
}

/* ── Filter tabs ──────────────────────────────────────────────────────────────── */
.cb-filter-tabs {
  display: flex;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  gap: 0;
}
.cb-filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.625rem 0.75rem;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.cb-filter-tab:hover {
  color: var(--p-text-color);
}
.cb-filter-tab--active {
  color: var(--p-primary-color);
  border-bottom-color: var(--p-primary-color);
  font-weight: 600;
}
.cb-filter-tab-count {
  font-size: 0.6875rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: var(--p-surface-100, #f1f5f9);
  color: var(--p-text-muted-color);
}
.cb-filter-tab--active .cb-filter-tab-count {
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  color: var(--p-primary-color);
}

/* ── Column headers ──────────────────────────────────────────────────────────── */
.cb-col-headers {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  gap: 0.5rem;
}
.cb-col-header-left,
.cb-col-header-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}
.cb-col-header-left .pi,
.cb-col-header-right .pi {
  color: var(--p-text-muted-color);
}
.cb-col-header-right {
  justify-content: flex-end;
}
.cb-col-header-center {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  width: 3rem;
  justify-content: center;
}

/* ── Loading / Empty ──────────────────────────────────────────────────────────── */
.cb-loading,
.cb-empty-rows {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}
.cb-loading .pi,
.cb-empty-rows .pi { font-size: 1.25rem; opacity: 0.35; }

/* ── Rows container ──────────────────────────────────────────────────────────── */
.cb-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Individual Row ──────────────────────────────────────────────────────────── */
.cb-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-surface-border);
}
.cb-row:last-child { border-bottom: none; }
.cb-row--conciliado { opacity: 0.65; }
.cb-row--ignorado   { opacity: 0.45; }

.cb-row-left,
.cb-row-right {
  flex: 1;
  min-width: 0;
}

.cb-row-center {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  padding-top: 1rem;
}

.cb-center-icon {
  font-size: 1.25rem;
}
.cb-center-icon--ok { color: var(--p-green-500); }
.cb-center-icon--ignored { color: var(--p-surface-400); }

/* ── Extrato card (left) ──────────────────────────────────────────────────── */
.cb-extrato-card {
  display: flex;
  align-items: stretch;
  border-radius: 0.375rem;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  transition: border-color 0.15s;
}

.cb-extrato-card-border {
  width: 3px;
  flex-shrink: 0;
  border-radius: 0.375rem 0 0 0.375rem;
}
.cb-extrato-card--credito .cb-extrato-card-border { background: var(--p-green-500); }
.cb-extrato-card--debito  .cb-extrato-card-border { background: var(--p-red-400); }

.cb-extrato-card-body {
  flex: 1;
  padding: 0.5rem 0.625rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cb-extrato-card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.cb-extrato-card-date {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
  min-width: 3.5rem;
}
.cb-extrato-card-desc {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.cb-extrato-card-tipo {
  flex-shrink: 0;
}
.cb-item-menu-btn {
  flex-shrink: 0;
  width: 1.5rem !important;
  height: 1.5rem !important;
}
.cb-extrato-card-bottom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.cb-extrato-card-linked {
  font-size: 0.7rem;
  color: var(--p-primary-color);
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cb-extrato-card-linked .pi { font-size: 0.55rem; }
.cb-extrato-card-valor {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  margin-left: auto;
}
.cb-extrato-card-status-tag {
  flex-shrink: 0;
}

/* ── Match card (right) ──────────────────────────────────────────────────── */
.cb-match-card {
  border-radius: 0.375rem;
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cb-match-card--conciliado {
  border-color: color-mix(in srgb, var(--p-green-500) 30%, transparent);
  background: color-mix(in srgb, var(--p-green-500) 4%, var(--p-surface-card));
}
.cb-match-card--sugestao {
  border-color: color-mix(in srgb, var(--p-yellow-400) 40%, transparent);
  background: color-mix(in srgb, var(--p-yellow-400) 6%, var(--p-surface-card));
}
.cb-match-card--ignorado {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
}
.cb-match-card--ignorado .pi { font-size: 1rem; opacity: 0.5; }

.cb-match-sug-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.cb-match-sug-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.cb-match-entity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.cb-match-entity-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.cb-match-entity-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cb-match-entity-meta {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}
.cb-match-entity-valor {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Match tabs (Buscar/Novo) ─────────────────────────────────────────────── */
.cb-match-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--p-surface-border);
  margin: -0.625rem -0.625rem 0;
  padding: 0 0.5rem;
}
.cb-match-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.625rem;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.cb-match-tab:hover { color: var(--p-text-color); }
.cb-match-tab--active {
  color: var(--p-primary-color);
  border-bottom-color: var(--p-primary-color);
  font-weight: 600;
}
.cb-match-tab .pi { font-size: 0.7rem; }

/* ── Match Buscar ────────────────────────────────────────────────────────── */
.cb-match-buscar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cb-match-search-field :deep(.p-inputtext) { width: 100%; }

.cb-match-candidates {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 180px;
  overflow-y: auto;
}
.cb-match-candidates-empty {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  padding: 0.375rem 0;
}

.cb-match-cand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.3rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.1s, border-color 0.1s;
}
.cb-match-cand:hover {
  background: var(--p-surface-hover);
}
.cb-match-cand--selected {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 6%, transparent);
}
.cb-match-cand-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}
.cb-match-cand-name {
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cb-match-cand-meta {
  font-size: 0.65rem;
  color: var(--p-text-muted-color);
}
.cb-match-cand-valor {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Match Novo ──────────────────────────────────────────────────────────── */
.cb-match-novo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cb-match-novo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.cb-match-novo-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}
.cb-match-novo-readonly {
  font-size: 0.825rem;
  font-weight: 700;
}
.cb-match-novo-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cb-match-novo-field :deep(.p-inputtext),
.cb-match-novo-field :deep(.p-select) {
  width: 100%;
}

/* ── Valores ─────────────────────────────────────────────────────────────────── */
.cb-val-credito { color: var(--p-green-500); font-weight: 600; }
.cb-val-debito  { color: var(--p-red-400);   font-weight: 600; }

/* ── Responsivo ──────────────────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .cb-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  .cb-row-left,
  .cb-row-right {
    width: 100%;
  }
  .cb-row-center {
    width: 100%;
    padding-top: 0;
    justify-content: center;
  }
  .cb-col-headers {
    flex-direction: column;
    gap: 0.5rem;
  }
  .cb-col-header-right {
    justify-content: flex-start;
  }
  .cb-col-header-center {
    width: 100%;
  }
}
</style>
