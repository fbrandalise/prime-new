import { ref, watch } from 'vue'

const STORAGE_KEY = 'bling_workflows_v2'

// ── Node type registry ────────────────────────────────────────────────────────
export const NODE_TYPES = {
  // Gatilhos
  'trigger-manual':    { label: 'Manual',            icon: 'pi pi-play',                color: '#f97316', category: 'trigger',     desc: 'Iniciar manualmente' },
  'trigger-cron':      { label: 'Agendamento',        icon: 'pi pi-calendar',            color: '#f97316', category: 'trigger',     desc: 'Executar em horário fixo' },
  'trigger-overdue':   { label: 'Conta vencida',      icon: 'pi pi-exclamation-circle',  color: '#ef4444', category: 'trigger',     desc: 'Disparar quando há contas em atraso' },
  'trigger-low-stock': { label: 'Estoque crítico',    icon: 'pi pi-exclamation-triangle',color: '#ef4444', category: 'trigger',     desc: 'Disparar quando SKU abaixo do mínimo' },
  'trigger-new-order': { label: 'Novo pedido',        icon: 'pi pi-shopping-bag',        color: '#6366f1', category: 'trigger',     desc: 'Disparar quando novo pedido for detectado' },

  // Lógica
  'action-filter':     { label: 'Filtrar',            icon: 'pi pi-filter',              color: '#3b82f6', category: 'logica',      desc: 'Filtrar contas por critério' },
  'action-condition':  { label: 'Condição',           icon: 'pi pi-code-branch',         color: '#eab308', category: 'logica',      desc: 'Bifurcar por condição' },
  'action-wait':       { label: 'Aguardar',           icon: 'pi pi-clock',               color: '#6b7280', category: 'logica',      desc: 'Aguardar N dias' },

  // Financeiro
  'action-list-receivables':  { label: 'Listar recebíveis',  icon: 'pi pi-arrow-down',  color: '#22c55e', category: 'financeiro',  desc: 'Buscar contas a receber no Bling' },
  'action-list-payables':     { label: 'Listar pagamentos',  icon: 'pi pi-arrow-up',    color: '#ef4444', category: 'financeiro',  desc: 'Buscar contas a pagar no Bling' },
  'action-create-receivable': { label: 'Criar recebível',    icon: 'pi pi-plus-circle', color: '#22c55e', category: 'financeiro',  desc: 'Registrar conta a receber no Bling' },
  'action-cash-flow':         { label: 'Fluxo de caixa',     icon: 'pi pi-chart-line',  color: '#3b82f6', category: 'financeiro',  desc: 'Analisar fluxo de caixa no Bling' },
  'action-receive':           { label: 'Baixar recebível',   icon: 'pi pi-dollar',      color: '#22c55e', category: 'financeiro',  desc: 'Baixar conta a receber' },
  'action-pay':               { label: 'Pagar conta',        icon: 'pi pi-check-circle',color: '#16a34a', category: 'financeiro',  desc: 'Baixar conta a pagar' },

  // Pedidos
  'action-list-orders':    { label: 'Listar pedidos',      icon: 'pi pi-list',          color: '#6366f1', category: 'pedidos',     desc: 'Buscar pedidos de venda no Bling' },
  'action-update-order':   { label: 'Atualizar pedido',    icon: 'pi pi-pencil',        color: '#6366f1', category: 'pedidos',     desc: 'Mudar situação de pedido no Bling' },
  'action-apply-discount': { label: 'Aplicar desconto',    icon: 'pi pi-percentage',    color: '#8b5cf6', category: 'pedidos',     desc: 'Aplicar % de desconto em produtos' },
  'action-margin':         { label: 'Margem de contrib.',  icon: 'pi pi-chart-pie',     color: '#6366f1', category: 'pedidos',     desc: 'Calcular margem bruta de pedido' },
  'action-list-nfe':       { label: 'Listar NFes',         icon: 'pi pi-file',          color: '#64748b', category: 'pedidos',     desc: 'Listar notas fiscais no Bling' },
  'action-nfe-status':     { label: 'Status da NFe',       icon: 'pi pi-file-check',    color: '#64748b', category: 'pedidos',     desc: 'Verificar autorização de NFe' },

  // Estoque
  'action-check-stock':         { label: 'Verificar estoque',    icon: 'pi pi-box',              color: '#f59e0b', category: 'estoque',    desc: 'Consultar saldo em estoque por SKU' },
  'action-sales-velocity':      { label: 'Velocidade de vendas', icon: 'pi pi-chart-bar',        color: '#f59e0b', category: 'estoque',    desc: 'Calcular giro de produto' },
  'action-replenishment':       { label: 'Sugerir reposição',    icon: 'pi pi-arrow-circle-up',  color: '#f59e0b', category: 'estoque',    desc: 'Sugerir quantidade a comprar' },
  'action-purchase-order':      { label: 'Pedido de compra',     icon: 'pi pi-shopping-cart',    color: '#f59e0b', category: 'estoque',    desc: 'Criar pedido de compra no Bling' },
  'action-list-purchase-orders':{ label: 'Pedidos de compra',    icon: 'pi pi-shopping-bag',     color: '#f59e0b', category: 'estoque',    desc: 'Listar pedidos de compra' },
  'action-recurrent-products':  { label: 'Produtos recorrentes', icon: 'pi pi-star',             color: '#f59e0b', category: 'estoque',    desc: 'Ranking dos produtos mais vendidos' },
  'action-update-prices':       { label: 'Atualizar preços',     icon: 'pi pi-tag',              color: '#f59e0b', category: 'estoque',    desc: 'Reajustar preços de produtos' },
  'action-update-product':      { label: 'Status do produto',    icon: 'pi pi-toggle-on',        color: '#f59e0b', category: 'estoque',    desc: 'Ativar / inativar produto' },

  // Contatos
  'action-search-contacts': { label: 'Buscar contatos',     icon: 'pi pi-users',   color: '#06b6d4', category: 'contatos',   desc: 'Pesquisar clientes ou fornecedores' },
  'action-list-suppliers':  { label: 'Listar fornecedores', icon: 'pi pi-truck',   color: '#06b6d4', category: 'contatos',   desc: 'Listar fornecedores cadastrados' },

  // Comunicação
  'action-email':  { label: 'E-mail',      icon: 'pi pi-envelope', color: '#8b5cf6', category: 'comunicacao', desc: 'Enviar e-mail via Gmail' },
  'action-notify': { label: 'Notificação', icon: 'pi pi-bell',     color: '#06b6d4', category: 'comunicacao', desc: 'Notificação interna no sistema' },
}

// ── Palette groups (order matters for the sidebar) ────────────────────────────
export const PALETTE_GROUPS = [
  { key: 'trigger',     label: 'Gatilhos' },
  { key: 'logica',      label: 'Lógica' },
  { key: 'financeiro',  label: 'Financeiro' },
  { key: 'pedidos',     label: 'Pedidos' },
  { key: 'estoque',     label: 'Estoque' },
  { key: 'contatos',    label: 'Contatos' },
  { key: 'comunicacao', label: 'Comunicação' },
]

// ── Default configs ───────────────────────────────────────────────────────────
export const NODE_DEFAULTS = {
  'trigger-manual':    {},
  'trigger-cron':      { day: 5, hour: 9 },
  'trigger-overdue':   { tipo: 'receber' },
  'trigger-low-stock': { sku: '' },
  'trigger-new-order': { situacao_id: 6 },

  'action-filter':     { tipo: 'pagar', situacao: 'todas' },
  'action-condition':  { field: 'valor', op: 'gt', value: '' },
  'action-wait':       { days: 1 },

  'action-list-receivables':  { situacao_id: '', overdue: false },
  'action-list-payables':     { situacao_id: '', overdue: false },
  'action-create-receivable': { vencimento: '', valor: '', historico: '', situacao_id: 1 },
  'action-cash-flow':         { date_from: '', date_to: '', include_orders: true },
  'action-receive':           {},
  'action-pay':               {},

  'action-list-orders':    { situacao_id: '' },
  'action-update-order':   { order_id: '', situacao: 'atendido' },
  'action-apply-discount': { desconto_percentual: 10 },
  'action-margin':         { order_id: '', incluir_frete: false },
  'action-list-nfe':       { order_id: '' },
  'action-nfe-status':     { nfe_id: '' },

  'action-check-stock':          { sku: '', deposito_id: '' },
  'action-sales-velocity':       { product_id: '', days: 90 },
  'action-replenishment':        { product_id: '', coverage_days: 30, lead_time_days: 7 },
  'action-purchase-order':       { supplier_contact_id: '', data_prevista: '', observacoes: '' },
  'action-list-purchase-orders': { situacao_id: '', supplier_id: '' },
  'action-recurrent-products':   { top_n: 10 },
  'action-update-prices':        { updates: '' },
  'action-update-product':       { product_ids: '', situacao: 'A' },

  'action-search-contacts': { nome: '', email: '', cpf_cnpj: '' },
  'action-list-suppliers':  { nome: '' },

  'action-email':  { to: '', subject: '', body: '' },
  'action-notify': { message: '' },
}

// ── Seed data ─────────────────────────────────────────────────────────────────
function seed() {
  return [
    {
      id: 'demo-1',
      name: 'Pagar contas no dia 5',
      active: true,
      nodes: [
        { id: 'n1', type: 'trigger-cron',           label: 'Dia 5 às 9h',       x: 40,  y: 90, config: { day: 5, hour: 9 } },
        { id: 'n2', type: 'action-list-payables',   label: 'Contas em aberto',  x: 290, y: 90, config: { situacao_id: 1, overdue: false } },
        { id: 'n3', type: 'action-pay',             label: 'Pagar todas',       x: 540, y: 90, config: {} },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' },
      ],
      runs: [
        { id: 'r1', startedAt: '2026-03-05T09:01:00Z', status: 'success', duration: '1.4', nodesRun: 3, log: [] },
      ],
      createdAt: '2026-03-01T00:00:00Z',
    },
    {
      id: 'demo-2',
      name: 'Relatório semanal de inadimplência',
      active: false,
      nodes: [
        { id: 'n1', type: 'trigger-cron',           label: 'Segunda às 8h',     x: 40,  y: 90, config: { day: 0, hour: 8 } },
        { id: 'n2', type: 'action-list-receivables',label: 'Recebíveis vencidos',x: 290, y: 90, config: { overdue: true } },
        { id: 'n3', type: 'action-email',           label: 'Enviar relatório',  x: 540, y: 90, config: { to: '', subject: 'Inadimplência semanal', body: '' } },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' },
      ],
      runs: [],
      createdAt: '2026-03-10T00:00:00Z',
    },
    {
      id: 'demo-3',
      name: 'Reposição automática de estoque crítico',
      active: false,
      nodes: [
        { id: 'n1', type: 'trigger-low-stock',    label: 'Estoque crítico',    x: 40,  y: 90, config: { sku: '' } },
        { id: 'n2', type: 'action-replenishment', label: 'Sugerir reposição',  x: 290, y: 90, config: { product_id: '', coverage_days: 30, lead_time_days: 7 } },
        { id: 'n3', type: 'action-purchase-order',label: 'Criar pedido compra',x: 540, y: 90, config: { supplier_contact_id: '', data_prevista: '' } },
        { id: 'n4', type: 'action-notify',        label: 'Notificar equipe',   x: 790, y: 90, config: { message: 'Pedido de compra criado automaticamente.' } },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' },
        { id: 'e3', from: 'n3', to: 'n4' },
      ],
      runs: [],
      createdAt: '2026-03-15T00:00:00Z',
    },
  ]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : seed()
  } catch {
    return seed()
  }
}

// Singleton reactive state
const workflows = ref(load())
watch(workflows, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

export function useWorkflows() {
  function saveWf(wf) {
    const i = workflows.value.findIndex(w => w.id === wf.id)
    if (i >= 0) workflows.value[i] = { ...wf }
    else workflows.value.push({ ...wf })
  }

  function removeWf(id) {
    workflows.value = workflows.value.filter(w => w.id !== id)
  }

  function toggleWf(id) {
    const w = workflows.value.find(w => w.id === id)
    if (w) w.active = !w.active
  }

  function runWf(id) {
    const w = workflows.value.find(w => w.id === id)
    if (!w || !w.nodes.length) return false
    const r = {
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
      status: 'running',
      duration: null,
      nodesRun: 0,
    }
    w.runs.unshift(r)
    const delay = 1200 + Math.random() * 1000
    setTimeout(() => {
      r.status = 'success'
      r.duration = (delay / 1000).toFixed(1)
      r.nodesRun = w.nodes.length
    }, delay)
    return true
  }

  function newWf(name = 'Novo workflow') {
    return {
      id: Date.now().toString(),
      name,
      active: false,
      nodes: [],
      edges: [],
      runs: [],
      createdAt: new Date().toISOString(),
    }
  }

  return { workflows, saveWf, removeWf, toggleWf, runWf, newWf }
}
