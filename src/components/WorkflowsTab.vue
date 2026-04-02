<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useWorkflows, NODE_TYPES, NODE_DEFAULTS, PALETTE_GROUPS } from '../composables/useWorkflows.js'
import { useGmailAuth } from '../composables/useGmailAuth.js'
import { getMcpCatalogGrouped, formatMcpWorkflowLogLine } from '../composables/blingMcpWorkflowCatalog.js'

const { workflows, saveWf, removeWf, toggleWf, newWf } = useWorkflows()
const { clientId, token: gmailToken, userEmail: gmailEmail, connecting: gmailConnecting, connectError: gmailError, connect: connectGmail, disconnect: disconnectGmail, sendEmail: gmailSend } = useGmailAuth()

// ── View ───────────────────────────────────────────────────────────────────────
const view = ref('list') // 'list' | 'nl-prompt' | 'editor'
const draft = ref(null)

// ── NL Prompt ──────────────────────────────────────────────────────────────────
const nlText = ref('')

// ── Config panel resize ────────────────────────────────────────────────────────
const configHeight = ref(200)

// ── Canvas constants ───────────────────────────────────────────────────────────
const NODE_W = 180
const NODE_H = 64

// ── Canvas state ───────────────────────────────────────────────────────────────
const canvasRef = ref(null)
const selectedNodeId = ref(null)
const dragging = ref(null)    // { nodeId, startX, startY, origX, origY }
const connecting = ref(null)  // { fromId, x1, y1 }
const tempEnd = ref({ x: 0, y: 0 })
const hoveredInPort = ref(null)
const confirmDeleteId = ref(null)

// ── Computed ───────────────────────────────────────────────────────────────────
const paletteGroups = computed(() =>
  PALETTE_GROUPS.map(g => ({
    ...g,
    types: Object.entries(NODE_TYPES).filter(([, v]) => v.category === g.key),
  }))
)

const mcpCatalogGrouped = computed(() => getMcpCatalogGrouped())

const selectedNode = computed(() =>
  draft.value?.nodes.find(n => n.id === selectedNodeId.value) ?? null
)

const canvasW = computed(() => {
  if (!draft.value?.nodes.length) return 1200
  return Math.max(1200, ...draft.value.nodes.map(n => n.x + NODE_W + 240))
})

const canvasH = computed(() => {
  if (!draft.value?.nodes.length) return 420
  return Math.max(420, ...draft.value.nodes.map(n => n.y + NODE_H + 140))
})

const computedEdges = computed(() => {
  if (!draft.value) return []
  return draft.value.edges.map(e => {
    const fn = draft.value.nodes.find(n => n.id === e.from)
    const tn = draft.value.nodes.find(n => n.id === e.to)
    if (!fn || !tn) return null
    const from = outPortPos(fn)
    const to = inPortPos(tn)
    return { ...e, path: edgePath(from, to), mx: (from.x + to.x) / 2, my: (from.y + to.y) / 2 }
  }).filter(Boolean)
})

const tempEdgePath = computed(() => {
  if (!connecting.value) return ''
  return edgePath({ x: connecting.value.x1, y: connecting.value.y1 }, tempEnd.value)
})

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function canvasPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left + canvasRef.value.scrollLeft,
    y: e.clientY - rect.top + canvasRef.value.scrollTop,
  }
}

function outPortPos(node) { return { x: node.x + NODE_W, y: node.y + NODE_H / 2 } }
function inPortPos(node)  { return { x: node.x,          y: node.y + NODE_H / 2 } }

function edgePath(from, to) {
  const dx = Math.max(60, Math.abs(to.x - from.x) * 0.45)
  return `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`
}

// ── Drag node ──────────────────────────────────────────────────────────────────
function onNodeMousedown(e, nodeId) {
  if (e.button !== 0 || e.target.closest('.wf-port') || e.target.closest('.wf-node-del')) return
  e.preventDefault()
  e.stopPropagation()
  selectedNodeId.value = nodeId
  const node = draft.value.nodes.find(n => n.id === nodeId)
  dragging.value = { nodeId, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y }
  window.addEventListener('mousemove', onWindowMousemove)
  window.addEventListener('mouseup', onWindowMouseup)
}

// ── Drag port (connect) ────────────────────────────────────────────────────────
function onOutPortMousedown(e, nodeId) {
  e.preventDefault()
  e.stopPropagation()
  const node = draft.value.nodes.find(n => n.id === nodeId)
  const pos = outPortPos(node)
  connecting.value = { fromId: nodeId, x1: pos.x, y1: pos.y }
  tempEnd.value = canvasPos(e)
  window.addEventListener('mousemove', onWindowMousemove)
  window.addEventListener('mouseup', onWindowMouseup)
}

// ── Window-level listeners ─────────────────────────────────────────────────────
function onWindowMousemove(e) {
  if (dragging.value) {
    const dx = e.clientX - dragging.value.startX
    const dy = e.clientY - dragging.value.startY
    const node = draft.value.nodes.find(n => n.id === dragging.value.nodeId)
    if (node) {
      node.x = Math.max(0, dragging.value.origX + dx)
      node.y = Math.max(0, dragging.value.origY + dy)
    }
  }
  if (connecting.value && canvasRef.value) {
    tempEnd.value = canvasPos(e)
    const pos = tempEnd.value
    const hovered = draft.value.nodes.find(n => {
      if (n.id === connecting.value.fromId) return false
      if (NODE_TYPES[n.type]?.category === 'trigger') return false
      const ip = inPortPos(n)
      return Math.hypot(pos.x - ip.x, pos.y - ip.y) < 14
    })
    hoveredInPort.value = hovered?.id ?? null
  }
}

function onWindowMouseup() {
  if (connecting.value) {
    if (hoveredInPort.value) {
      const exists = draft.value.edges.some(
        ed => ed.from === connecting.value.fromId && ed.to === hoveredInPort.value
      )
      if (!exists && hoveredInPort.value !== connecting.value.fromId) {
        draft.value.edges.push({
          id: Date.now().toString(),
          from: connecting.value.fromId,
          to: hoveredInPort.value,
        })
      }
    }
    connecting.value = null
    hoveredInPort.value = null
  }
  dragging.value = null
  window.removeEventListener('mousemove', onWindowMousemove)
  window.removeEventListener('mouseup', onWindowMouseup)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onWindowMousemove)
  window.removeEventListener('mouseup', onWindowMouseup)
})

// ── Node / Edge actions ────────────────────────────────────────────────────────
function deleteNode(nodeId) {
  draft.value.nodes = draft.value.nodes.filter(n => n.id !== nodeId)
  draft.value.edges = draft.value.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
  if (selectedNodeId.value === nodeId) selectedNodeId.value = null
}

function deleteEdge(edgeId) {
  draft.value.edges = draft.value.edges.filter(e => e.id !== edgeId)
}

function addNode(type) {
  const count = draft.value.nodes.length
  draft.value.nodes.push({
    id: Date.now().toString(),
    type,
    label: NODE_TYPES[type].label,
    x: Math.max(20, count * 230),
    y: 90 + (count % 3) * 20,
    config: { ...(NODE_DEFAULTS[type] || {}) },
  })
  selectedNodeId.value = draft.value.nodes[draft.value.nodes.length - 1].id
}

function onCanvasClick(e) {
  if (e.target === canvasRef.value || e.target.tagName === 'svg' || e.target.tagName === 'rect') {
    selectedNodeId.value = null
  }
}

// ── NL parser ──────────────────────────────────────────────────────────────────
function parseNLToWorkflow(text) {
  const t = text.toLowerCase()

  // Name from first clause
  const firstClause = text.split(/[.,;!?\n]/)[0].trim()
  draft.value.name = firstClause.length > 0 && firstClause.length <= 60
    ? firstClause
    : text.trim().slice(0, 55) + (text.length > 55 ? '…' : '')

  let idSeed = Date.now()
  const nodes = []
  const edges = []

  // ── Trigger ──────────────────────────────────────────────────────────────────
  let triggerType = 'trigger-manual'
  let triggerConfig = { ...NODE_DEFAULTS['trigger-manual'] }
  let triggerLabel = 'Manual'

  if (/sempre\s+que\s+o\s+estoque|estoque\s+cr[ií]tico|saldo\s+baixo\s+no\s+estoque|sku\s+abaixo\s+do\s+m[ií]nimo/i.test(t)) {
    triggerType = 'trigger-low-stock'
    const skuM = t.match(/sku\s*[:\s]+([a-z0-9._-]+)/i)
    triggerConfig = { sku: skuM ? skuM[1] : '' }
    triggerLabel = 'Estoque crítico'
  } else if (/quando\s+houver\s+conta[s]?\s+vencid|contas?\s+vencidas?\s+como\s+gatilho|gatilho.*vencid|ao\s+detectar\s+inadimpl/i.test(t)) {
    triggerType = 'trigger-overdue'
    const tipo = /a\s+pagar|pagar/i.test(t) && !/a\s+receber|receb/i.test(t) ? 'pagar' : 'receber'
    triggerConfig = { tipo }
    triggerLabel = tipo === 'pagar' ? 'Contas a pagar vencidas' : 'Contas a receber vencidas'
  } else if (/novo\s+pedido\s+de\s+venda|a\s+cada\s+novo\s+pedido|quando\s+chegar\s+pedido/i.test(t)) {
    triggerType = 'trigger-new-order'
    triggerConfig = { ...NODE_DEFAULTS['trigger-new-order'] }
    triggerLabel = 'Novo pedido'
  }

  const dayMatch = t.match(/todo[s]?\s+dia[s]?\s+(\d+)|dia\s+(\d+)/)
  const hourMatch = t.match(/[àa]s?\s+(\d+)\s*h/)
  const isScheduled =
    triggerType === 'trigger-manual' &&
    (dayMatch || /agendad|todo[s]?\s+dia|toda\s+semana|todo\s+m[eê]s|periodicamente|de manhã|segunda|terça|quarta|quinta|sexta|sábado|domingo/i.test(t))

  if (isScheduled) {
    triggerType = 'trigger-cron'
    const day = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) || 5 : 5
    const hour = hourMatch ? parseInt(hourMatch[1]) || 9 : 9
    triggerConfig = { day, hour }
    triggerLabel = `Dia ${day} às ${hour}h`
  }

  nodes.push({ id: `n${idSeed++}`, type: triggerType, label: triggerLabel, x: 40, y: 90, config: triggerConfig })

  // ── Actions ───────────────────────────────────────────────────────────────────
  const actions = []

  // Fluxo de caixa
  if (/fluxo\s+de\s+caixa|cash\s+flow|saldo\s+(projetado|realizado)/i.test(t)) {
    actions.push({ type: 'action-cash-flow', label: 'Fluxo de caixa', config: { ...NODE_DEFAULTS['action-cash-flow'] } })
  }

  // Listar recebíveis (Bling API)
  if (/listar?\s+receb[ií]veis?|buscar?\s+receb[ií]veis?|contas?\s+a\s+receber\s+(vencidas?|em\s+aberto|atrasadas?)/i.test(t)) {
    const overdue = /vencid[ao]s?|atrasad[ao]s?/i.test(t)
    actions.push({ type: 'action-list-receivables', label: 'Listar recebíveis', config: { situacao_id: overdue ? '1' : '', overdue } })
  } else if (/receb[ií]veis?|contas?\s+a\s+receber/i.test(t) && !/criar?\s+receb[ií]vel/i.test(t)) {
    const overdue = /vencid[ao]s?|atrasad[ao]s?/i.test(t)
    actions.push({ type: 'action-list-receivables', label: 'Listar recebíveis', config: { situacao_id: '', overdue } })
  }

  // Criar recebível
  if (/criar?\s+receb[ií]vel|registrar?\s+recebimento|lançar?\s+receb/i.test(t)) {
    actions.push({ type: 'action-create-receivable', label: 'Criar recebível', config: { ...NODE_DEFAULTS['action-create-receivable'] } })
  }

  // Listar pagamentos (contas a pagar)
  if (/listar?\s+pagamentos?|contas?\s+a\s+pagar\s+(vencidas?|em\s+aberto|atrasadas?)/i.test(t)) {
    const overdue = /vencid[ao]s?|atrasad[ao]s?/i.test(t)
    actions.push({ type: 'action-list-payables', label: 'Listar pagamentos', config: { situacao_id: '', overdue } })
  }

  // Listar pedidos
  if (/listar?\s+pedidos?|buscar?\s+pedidos?/i.test(t)) {
    actions.push({ type: 'action-list-orders', label: 'Listar pedidos', config: { ...NODE_DEFAULTS['action-list-orders'] } })
  }

  // Atualizar status pedido
  if (/atualizar?\s+pedido|mudar?\s+(status|situação)\s+do\s+pedido|marcar?\s+pedido\s+como/i.test(t)) {
    actions.push({ type: 'action-update-order', label: 'Atualizar pedido', config: { ...NODE_DEFAULTS['action-update-order'] } })
  }

  // Aplicar desconto
  if (/aplicar?\s+desconto|desconto\s+de\s+\d|promoção|liquidação/i.test(t)) {
    const pctMatch = t.match(/(\d+)\s*%/)
    const desconto_percentual = pctMatch ? parseInt(pctMatch[1]) : 10
    actions.push({ type: 'action-apply-discount', label: `Desconto ${desconto_percentual}%`, config: { desconto_percentual } })
  }

  // Verificar estoque
  if (/verificar?\s+estoque|checar?\s+estoque|saldo\s+(em\s+)?estoque/i.test(t)) {
    actions.push({ type: 'action-check-stock', label: 'Verificar estoque', config: { ...NODE_DEFAULTS['action-check-stock'] } })
  }

  // Velocidade de vendas / giro
  if (/velocidade\s+de\s+vendas?|giro\s+de\s+produto|média\s+di[aá]ria\s+de\s+saída/i.test(t)) {
    actions.push({ type: 'action-sales-velocity', label: 'Velocidade de vendas', config: { ...NODE_DEFAULTS['action-sales-velocity'] } })
  }

  // Sugerir reposição
  if (/sugerir?\s+reposição|repor?\s+estoque|reposição\s+automática|quanto\s+comprar/i.test(t)) {
    actions.push({ type: 'action-replenishment', label: 'Sugerir reposição', config: { ...NODE_DEFAULTS['action-replenishment'] } })
  }

  // Pedido de compra
  if (/pedido\s+de\s+compra|criar?\s+compra|gerar?\s+pedido\s+de\s+compra/i.test(t)) {
    actions.push({ type: 'action-purchase-order', label: 'Pedido de compra', config: { ...NODE_DEFAULTS['action-purchase-order'] } })
  }

  // Atualizar preços
  if (/atualizar?\s+preço[s]?|reajust[ae]\s+preço[s]?|ajustar?\s+preço[s]?/i.test(t)) {
    actions.push({ type: 'action-update-prices', label: 'Atualizar preços', config: { ...NODE_DEFAULTS['action-update-prices'] } })
  }

  // NFe — listar vs status
  if (/listar\s+nfe|listar\s+notas?\s+fisc|notas?\s+fiscais\s+do\s+pedido/i.test(t)) {
    actions.push({ type: 'action-list-nfe', label: 'Listar NFes', config: { ...NODE_DEFAULTS['action-list-nfe'] } })
  } else if (/status\s+(da\s+)?nfe|consultar\s+nfe|autoriza(ç|c)ão\s+da\s+nf/i.test(t)) {
    actions.push({ type: 'action-nfe-status', label: 'Status da NFe', config: { ...NODE_DEFAULTS['action-nfe-status'] } })
  } else if (/nfe|nota\s+fiscal/i.test(t)) {
    actions.push({ type: 'action-list-nfe', label: 'Listar NFes', config: { ...NODE_DEFAULTS['action-list-nfe'] } })
  }

  // Pedidos de compra / fornecedores / ranking
  if (/listar\s+pedidos?\s+de\s+compra|pedidos?\s+de\s+compra/i.test(t)) {
    actions.push({ type: 'action-list-purchase-orders', label: 'Pedidos de compra', config: { ...NODE_DEFAULTS['action-list-purchase-orders'] } })
  }
  if (/listar\s+fornecedores?|fornecedores?\s+cadastrados/i.test(t)) {
    actions.push({ type: 'action-list-suppliers', label: 'Listar fornecedores', config: { ...NODE_DEFAULTS['action-list-suppliers'] } })
  }
  if (/produtos?\s+mais\s+vendidos?|ranking\s+de\s+produtos?|top\s+\d+\s+produtos/i.test(t)) {
    const topM = t.match(/top\s+(\d+)/i)
    actions.push({
      type: 'action-recurrent-products',
      label: 'Produtos mais vendidos',
      config: { ...NODE_DEFAULTS['action-recurrent-products'], top_n: topM ? parseInt(topM[1], 10) : 10 },
    })
  }
  if (/margem\s+(de\s+)?contrib|margem\s+bruta\s+do\s+pedido/i.test(t)) {
    actions.push({ type: 'action-margin', label: 'Margem de contribuição', config: { ...NODE_DEFAULTS['action-margin'] } })
  }

  // Buscar contatos
  if (/buscar?\s+contato[s]?|pesquisar?\s+cliente[s]?|encontrar?\s+contato/i.test(t)) {
    actions.push({ type: 'action-search-contacts', label: 'Buscar contatos', config: { ...NODE_DEFAULTS['action-search-contacts'] } })
  }

  // Filter (legado interno)
  if (/filtrar\s+contas?/i.test(t) && !actions.some(a => a.type.includes('list-') || a.type.includes('receivable') || a.type.includes('payable'))) {
    const tipo = /receb/i.test(t) ? 'receber' : 'pagar'
    let situacao = 'todas'
    if (/vencidas?|atrasadas?|atraso/i.test(t)) situacao = 'vencidas'
    actions.push({ type: 'action-filter', label: 'Filtrar contas', config: { tipo, situacao } })
  }

  // Condition
  if (/condição|se\s+.{2,30}\s+(maior|menor|igual|diferente)|valor\s+(maior|menor|acima|abaixo)/i.test(t)) {
    actions.push({ type: 'action-condition', label: 'Condição', config: { ...NODE_DEFAULTS['action-condition'] } })
  }

  // Wait
  const waitMatch = t.match(/aguard[ae]r?\s+(\d+)\s*dia|esperar?\s+(\d+)\s*dia/)
  if (waitMatch) {
    const days = parseInt(waitMatch[1] || waitMatch[2]) || 3
    actions.push({ type: 'action-wait', label: `Aguardar ${days}d`, config: { days } })
  }

  // Pay
  if (/baixar\s+conta[s]?\s+a\s+pagar|pagar\s+(todas?|as)\s+conta[s]?|efetuar\s+pagamento/i.test(t)) {
    actions.push({ type: 'action-pay', label: 'Pagar contas', config: {} })
  }

  // Receive
  if (/baixar\s+receb[ií]veis?|baixar\s+conta[s]?\s+a\s+receber|registrar\s+recebimento/i.test(t) && !actions.some(a => a.type === 'action-create-receivable')) {
    actions.push({ type: 'action-receive', label: 'Baixar recebível', config: {} })
  }

  // Email
  if (/e-?mail|enviar\s+mensagem|envio\s+de\s+e/i.test(t)) {
    const subjectMatch = text.match(/assunto[:\s]+["']?([^"'\n,]+?)["']?(?:[,\n]|$)/i)
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Notificação automática'
    actions.push({ type: 'action-email', label: 'Enviar e-mail', config: { ...NODE_DEFAULTS['action-email'], subject } })
  }

  // Notify (only if no email)
  if (/notif[ica]|alerta|aviso/i.test(t) && !/e-?mail/i.test(t)) {
    actions.push({ type: 'action-notify', label: 'Notificação', config: { message: '' } })
  }

  // Fallback
  if (!actions.length) {
    actions.push({ type: 'action-notify', label: 'Ação', config: { ...NODE_DEFAULTS['action-notify'], message: text.slice(0, 100) } })
  }

  actions.forEach((a, i) => {
    nodes.push({
      id: `n${idSeed++}`,
      type: a.type,
      label: a.label,
      x: 40 + (i + 1) * 250,
      y: 90,
      config: a.config,
    })
  })

  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: `e${i}`, from: nodes[i].id, to: nodes[i + 1].id })
  }

  draft.value.nodes = nodes
  draft.value.edges = edges
}

function submitNL() {
  if (!nlText.value.trim()) return
  parseNLToWorkflow(nlText.value)
  selectedNodeId.value = null
  view.value = 'editor'
}

// ── Config panel resize ────────────────────────────────────────────────────────
function startConfigResize(e) {
  e.preventDefault()
  const startY = e.clientY
  const startH = configHeight.value
  function onMove(ev) {
    configHeight.value = Math.max(80, Math.min(500, startH - (ev.clientY - startY)))
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Editor open / save ─────────────────────────────────────────────────────────
function openNew() {
  draft.value = newWf()
  selectedNodeId.value = null
  nlText.value = ''
  view.value = 'nl-prompt'
}

function openEdit(wf) {
  draft.value = JSON.parse(JSON.stringify(wf))
  selectedNodeId.value = null
  view.value = 'editor'
}

function saveAndBack() {
  if (!draft.value?.name?.trim()) return
  saveWf(draft.value)
  view.value = 'list'
  draft.value = null
}

function cancelEditor() {
  view.value = 'list'
  draft.value = null
}

// ── Execução de workflow ───────────────────────────────────────────────────────
function topoSort(nodes, edges) {
  const result = []
  const visited = new Set()
  function visit(id) {
    if (visited.has(id)) return
    visited.add(id)
    const node = nodes.find(n => n.id === id)
    if (node) result.push(node)
    edges.filter(e => e.from === id).forEach(e => visit(e.to))
  }
  nodes.filter(n => NODE_TYPES[n.type]?.category === 'trigger').forEach(t => visit(t.id))
  nodes.forEach(n => { if (!visited.has(n.id)) result.push(n) })
  return result
}

async function executeWorkflow(wfId) {
  const wf = workflows.value.find(w => w.id === wfId)
  if (!wf || !wf.nodes.length) return

  const r = {
    id: Date.now().toString(),
    startedAt: new Date().toISOString(),
    status: 'running',
    duration: null,
    nodesRun: 0,
    log: [],
    error: null,
  }
  wf.runs.unshift(r)

  const t0 = Date.now()
  try {
    const ordered = topoSort(wf.nodes, wf.edges)
    for (const node of ordered) {
      await new Promise(res => setTimeout(res, 120 + Math.random() * 180))

      if (node.type === 'action-email') {
        const { to, subject, body } = node.config
        await gmailSend({ to, subject, body })
        r.log.push(`✓ ${formatMcpWorkflowLogLine(node)} → ${to || '(sem destinatário)'}`)
      } else {
        r.log.push(`✓ ${formatMcpWorkflowLogLine(node)}`)
      }
      r.nodesRun++
    }
    r.status = 'success'
  } catch (err) {
    r.status = 'error'
    r.error = err.message
  }
  r.duration = ((Date.now() - t0) / 1000).toFixed(1)
}

// ── Utils ──────────────────────────────────────────────────────────────────────
function lastRun(wf) { return wf.runs?.[0] ?? null }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function nodeCount(wf) {
  const n = wf.nodes.length
  return `${n} nó${n !== 1 ? 's' : ''}`
}

const origin = window.location.origin
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════════════════════
       LISTA DE WORKFLOWS
  ══════════════════════════════════════════════════════════════════════════════ -->
  <div v-if="view === 'list'" class="wf-list-root">
    <div class="wf-list-header">
      <span class="wf-list-title">Workflows</span>
      <Button icon="pi pi-plus" label="Novo" size="small" @click="openNew" />
    </div>

    <details class="wf-mcp-catalog">
      <summary class="wf-mcp-catalog-summary">
        <i class="pi pi-bolt" aria-hidden="true" />
        Ferramentas Bling (espelho MCP)
        <span class="wf-mcp-catalog-badge">{{ mcpCatalogGrouped.reduce((n, g) => n + g.tools.length, 0) }}</span>
      </summary>
      <p class="wf-mcp-catalog-intro">
        Cada linha é o mesmo escopo que um servidor MCP da API Bling exporia: id da tool, rótulo no editor e resumo.
        A execução local ainda é simulada (exceto e-mail via Gmail, se conectado).
      </p>
      <div class="wf-mcp-catalog-scroll">
        <div v-for="grp in mcpCatalogGrouped" :key="grp.key" class="wf-mcp-grp">
          <div class="wf-mcp-grp-title">{{ grp.label }}</div>
          <ul class="wf-mcp-list">
            <li v-for="tool in grp.tools" :key="tool.nodeType" class="wf-mcp-item">
              <code class="wf-mcp-id">{{ tool.mcpTool }}</code>
              <span class="wf-mcp-name">{{ tool.label }}</span>
              <span class="wf-mcp-desc">{{ tool.summary || tool.desc }}</span>
            </li>
          </ul>
        </div>
      </div>
    </details>

    <div v-if="!workflows.length" class="wf-empty">
      <i class="pi pi-sitemap wf-empty-icon" />
      <p>Nenhum workflow criado ainda.</p>
      <Button label="Criar primeiro workflow" size="small" outlined @click="openNew" />
    </div>

    <div v-else class="wf-cards">
      <div
        v-for="wf in workflows"
        :key="wf.id"
        class="wf-card"
        :class="{ 'wf-card--active': wf.active }"
      >
        <!-- Top row -->
        <div class="wf-card-top">
          <div class="wf-card-info">
            <span class="wf-card-name">{{ wf.name }}</span>
            <span class="wf-card-meta">
              {{ nodeCount(wf) }} · {{ lastRun(wf) ? formatDate(lastRun(wf).startedAt) : 'nunca executado' }}
            </span>
          </div>
          <div class="wf-card-btns">
            <button class="wf-icon-btn" title="Executar agora" @click="executeWorkflow(wf.id)">
              <i class="pi pi-play" />
            </button>
            <button class="wf-icon-btn" title="Editar" @click="openEdit(wf)">
              <i class="pi pi-pencil" />
            </button>
            <button
              v-if="confirmDeleteId !== wf.id"
              class="wf-icon-btn wf-icon-btn--danger"
              title="Excluir"
              @click="confirmDeleteId = wf.id"
            >
              <i class="pi pi-trash" />
            </button>
            <template v-else>
              <button class="wf-icon-btn wf-icon-btn--confirm" @click="removeWf(wf.id); confirmDeleteId = null">
                <i class="pi pi-check" />
              </button>
              <button class="wf-icon-btn" @click="confirmDeleteId = null">
                <i class="pi pi-times" />
              </button>
            </template>
          </div>
        </div>

        <!-- Node chips -->
        <div class="wf-card-chips">
          <span
            v-for="(node, ni) in wf.nodes.slice(0, 5)"
            :key="node.id"
            class="wf-chip"
            :style="{ '--chip-color': NODE_TYPES[node.type]?.color }"
          >
            <i :class="NODE_TYPES[node.type]?.icon" />
            {{ node.label }}
            <i v-if="ni < Math.min(wf.nodes.length, 5) - 1" class="pi pi-arrow-right wf-chip-arrow" />
          </span>
          <span v-if="wf.nodes.length > 5" class="wf-chip wf-chip--more">+{{ wf.nodes.length - 5 }}</span>
        </div>

        <!-- Bottom row: toggle + last run -->
        <div class="wf-card-bottom">
          <label class="wf-toggle" :class="{ 'wf-toggle--on': wf.active }">
            <input type="checkbox" :checked="wf.active" @change="toggleWf(wf.id)" />
            <span class="wf-toggle-track"><span class="wf-toggle-thumb" /></span>
            <span class="wf-toggle-lbl">{{ wf.active ? 'Ativo' : 'Inativo' }}</span>
          </label>

          <span
            v-if="lastRun(wf)"
            class="wf-run-badge"
            :class="`wf-run-badge--${lastRun(wf).status}`"
          >
            <i :class="{
              'pi pi-check-circle': lastRun(wf).status === 'success',
              'pi pi-spin pi-spinner': lastRun(wf).status === 'running',
              'pi pi-times-circle': lastRun(wf).status === 'error',
            }" />
            {{ lastRun(wf).status === 'running' ? 'Executando…'
               : lastRun(wf).status === 'success' ? `${lastRun(wf).duration}s · ${lastRun(wf).nodesRun} nós`
               : lastRun(wf).error || 'Erro' }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       PROMPT LINGUAGEM NATURAL
  ══════════════════════════════════════════════════════════════════════════════ -->
  <div v-else-if="view === 'nl-prompt'" class="wf-nl-root">
    <div class="wf-toolbar">
      <Button
        icon="pi pi-arrow-left"
        variant="text" size="small" rounded severity="secondary"
        v-tooltip.bottom="'Voltar'"
        @click="view = 'list'; draft = null"
      />
      <span class="wf-nl-toolbar-title">Novo workflow</span>
    </div>

    <div class="wf-nl-body">
      <div class="wf-nl-icon-wrap">
        <i class="pi pi-sparkles wf-nl-icon" />
      </div>
      <h3 class="wf-nl-title">Descreva seu workflow</h3>
      <p class="wf-nl-hint">
        Explique em linguagem natural o que o workflow deve fazer.         Você pode citar as mesmas operações do catálogo «Ferramentas Bling (espelho MCP)» na lista de workflows: listar recebíveis, pedidos de compra,
        NFes, estoque, fornecedores, margem, etc.<br>
        <em>Exemplo: "Todo dia 5 às 9h, filtrar contas a receber vencidas e enviar e-mail de cobrança"</em>
      </p>
      <textarea
        v-model="nlText"
        class="wf-nl-textarea"
        rows="4"
        placeholder="Ex: Todo dia 5, filtrar as contas a pagar vencidas e enviar um e-mail de alerta..."
        @keydown.ctrl.enter.prevent="submitNL"
        @keydown.meta.enter.prevent="submitNL"
      />
      <div class="wf-nl-actions">
        <Button
          label="Criar workflow"
          icon="pi pi-sitemap"
          :disabled="!nlText.trim()"
          @click="submitNL"
        />
        <Button
          label="Criar do zero"
          variant="text"
          severity="secondary"
          @click="view = 'editor'"
        />
      </div>
      <p class="wf-nl-note">
        <i class="pi pi-info-circle" />
        Após criar, você poderá ajustar os nós no editor visual.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       EDITOR DE WORKFLOW
  ══════════════════════════════════════════════════════════════════════════════ -->
  <div v-else-if="view === 'editor'" class="wf-editor">

    <!-- Toolbar -->
    <div class="wf-toolbar">
      <Button
        icon="pi pi-arrow-left"
        variant="text" size="small" rounded severity="secondary"
        v-tooltip.bottom="'Voltar'"
        @click="cancelEditor"
      />
      <input v-model="draft.name" class="wf-name-input" placeholder="Nome do workflow" />
      <Button icon="pi pi-save" label="Salvar" size="small" @click="saveAndBack" />
    </div>

    <!-- Canvas area: palette + canvas -->
    <div class="wf-workspace">

      <!-- Node palette -->
      <div class="wf-palette">
        <template v-for="group in paletteGroups" :key="group.key">
          <div class="wf-palette-group">{{ group.label }}</div>
          <div
            v-for="[type, meta] in group.types"
            :key="type"
            class="wf-palette-item"
            :style="{ '--nt-color': meta.color }"
            :title="meta.desc"
            @click="addNode(type)"
          >
            <span class="wf-palette-dot"><i :class="meta.icon" /></span>
            <span>{{ meta.label }}</span>
          </div>
        </template>
      </div>

      <!-- Canvas -->
      <div
        ref="canvasRef"
        class="wf-canvas"
        @click="onCanvasClick"
      >
        <!-- Dot-grid background -->
        <svg class="wf-grid" :width="canvasW" :height="canvasH">
          <defs>
            <pattern id="wf-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="0.75" cy="0.75" r="0.75" fill="var(--p-surface-border)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wf-dots)" />
        </svg>

        <!-- SVG edges layer -->
        <svg class="wf-edges-svg" :width="canvasW" :height="canvasH">
          <g
            v-for="edge in computedEdges"
            :key="edge.id"
            class="wf-edge-g"
          >
            <!-- Wide invisible hit area -->
            <path :d="edge.path" class="wf-edge-hit" @click.stop="deleteEdge(edge.id)" />
            <!-- Visible line -->
            <path :d="edge.path" class="wf-edge-line" />
            <!-- Delete badge at midpoint -->
            <g
              class="wf-edge-del"
              :transform="`translate(${edge.mx},${edge.my})`"
              @click.stop="deleteEdge(edge.id)"
            >
              <circle r="9" class="wf-edge-del-circle" />
              <text text-anchor="middle" dominant-baseline="central" font-size="12" class="wf-edge-del-x">×</text>
            </g>
          </g>

          <!-- Temp edge while dragging a connection -->
          <path
            v-if="connecting"
            :d="tempEdgePath"
            class="wf-temp-edge"
          />
        </svg>

        <!-- Nodes -->
        <div
          v-for="node in draft.nodes"
          :key="node.id"
          class="wf-node"
          :class="{ 'wf-node--selected': selectedNodeId === node.id }"
          :style="{
            left: node.x + 'px',
            top: node.y + 'px',
            '--nc': NODE_TYPES[node.type]?.color,
          }"
          @mousedown="onNodeMousedown($event, node.id)"
          @click.stop="selectedNodeId = node.id"
        >
          <!-- Input port (not on triggers) -->
          <div
            v-if="NODE_TYPES[node.type]?.category !== 'trigger'"
            class="wf-port wf-port--in"
            :class="{ 'wf-port--hover': hoveredInPort === node.id }"
            @mouseup.stop="hoveredInPort = node.id; onWindowMouseup()"
          />

          <!-- Icon header -->
          <div class="wf-node-icon" :style="{ background: NODE_TYPES[node.type]?.color }">
            <i :class="NODE_TYPES[node.type]?.icon" />
          </div>

          <!-- Label -->
          <div class="wf-node-body">
            <span class="wf-node-label">{{ node.label }}</span>
            <span class="wf-node-type">{{ NODE_TYPES[node.type]?.label }}</span>
          </div>

          <!-- Delete -->
          <button class="wf-node-del" @click.stop="deleteNode(node.id)" title="Remover nó">×</button>

          <!-- Output port -->
          <div
            class="wf-port wf-port--out"
            @mousedown.stop="onOutPortMousedown($event, node.id)"
          />
        </div>

        <!-- Empty canvas hint -->
        <div v-if="!draft.nodes.length" class="wf-canvas-hint">
          <i class="pi pi-arrow-left" />
          <p>Clique nos blocos ao lado para adicionar ao workflow</p>
        </div>
      </div>
    </div>

    <!-- Config panel (below canvas, when node selected) -->
    <transition name="cfg-slide">
      <div v-if="selectedNode" class="wf-config" :style="{ height: configHeight + 'px' }">
        <div class="wf-config-resize-handle" @mousedown.prevent="startConfigResize" />
        <div class="wf-config-header">
          <i :class="NODE_TYPES[selectedNode.type]?.icon" :style="{ color: NODE_TYPES[selectedNode.type]?.color }" />
          <input v-model="selectedNode.label" class="wf-config-name" placeholder="Rótulo do nó" />
          <button class="wf-config-close" @click="selectedNodeId = null">×</button>
        </div>
        <div class="wf-config-body">

          <!-- ── GATILHOS ──────────────────────────────────────────────────── -->
          <template v-if="selectedNode.type === 'trigger-manual'">
            <p class="wf-no-config">Executado manualmente. Nenhuma configuração necessária.</p>
          </template>

          <template v-else-if="selectedNode.type === 'trigger-cron'">
            <div class="wf-field">
              <label>Dia do mês</label>
              <input v-model.number="selectedNode.config.day" type="number" min="1" max="31" class="wf-input" placeholder="1–31" />
            </div>
            <div class="wf-field">
              <label>Hora</label>
              <input v-model.number="selectedNode.config.hour" type="number" min="0" max="23" class="wf-input" placeholder="0–23" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'trigger-overdue'">
            <div class="wf-field">
              <label>Tipo de conta</label>
              <select v-model="selectedNode.config.tipo" class="wf-select">
                <option value="receber">Contas a receber</option>
                <option value="pagar">Contas a pagar</option>
              </select>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'trigger-low-stock'">
            <div class="wf-field wf-field--full">
              <label>SKU monitorado</label>
              <input v-model="selectedNode.config.sku" class="wf-input" placeholder="Ex: PROD-001" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'trigger-new-order'">
            <div class="wf-field">
              <label>Situação inicial</label>
              <select v-model.number="selectedNode.config.situacao_id" class="wf-select">
                <option :value="6">Em aberto</option>
                <option :value="15">Em andamento</option>
                <option :value="0">Qualquer</option>
              </select>
            </div>
          </template>

          <!-- ── LÓGICA ────────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-filter'">
            <div class="wf-field">
              <label>Tipo</label>
              <select v-model="selectedNode.config.tipo" class="wf-select">
                <option value="pagar">Contas a pagar</option>
                <option value="receber">Contas a receber</option>
              </select>
            </div>
            <div class="wf-field">
              <label>Situação</label>
              <select v-model="selectedNode.config.situacao" class="wf-select">
                <option value="todas">Todas</option>
                <option value="vencidas">Vencidas / Atrasadas</option>
                <option value="a-vencer">A vencer (hoje)</option>
                <option value="pagas">Pagas / Recebidas</option>
              </select>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-condition'">
            <div class="wf-field">
              <label>Campo</label>
              <select v-model="selectedNode.config.field" class="wf-select">
                <option value="valor">Valor total</option>
                <option value="atraso">Dias em atraso</option>
                <option value="situacao">Situação</option>
              </select>
            </div>
            <div class="wf-field">
              <label>Operador</label>
              <select v-model="selectedNode.config.op" class="wf-select">
                <option value="gt">Maior que</option>
                <option value="lt">Menor que</option>
                <option value="eq">Igual a</option>
                <option value="neq">Diferente de</option>
              </select>
            </div>
            <div class="wf-field">
              <label>Valor</label>
              <input v-model="selectedNode.config.value" class="wf-input" placeholder="Ex: 1000" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-wait'">
            <div class="wf-field">
              <label>Aguardar (dias)</label>
              <input v-model.number="selectedNode.config.days" type="number" min="1" class="wf-input" placeholder="Número de dias" />
            </div>
          </template>

          <!-- ── FINANCEIRO ─────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-list-receivables'">
            <div class="wf-field">
              <label>Situação</label>
              <select v-model="selectedNode.config.situacao_id" class="wf-select">
                <option value="">Todas</option>
                <option value="1">Em aberto (1)</option>
                <option value="2">Recebido (2)</option>
                <option value="3">Parcialmente recebido (3)</option>
                <option value="9">Cancelado (9)</option>
              </select>
            </div>
            <div class="wf-field">
              <label class="wf-checkbox-label">
                <input type="checkbox" v-model="selectedNode.config.overdue" />
                Somente vencidos
              </label>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-list-payables'">
            <div class="wf-field">
              <label>Situação</label>
              <select v-model="selectedNode.config.situacao_id" class="wf-select">
                <option value="">Todas</option>
                <option value="1">Em aberto (1)</option>
                <option value="2">Pago (2)</option>
                <option value="3">Parcialmente pago (3)</option>
                <option value="9">Cancelado (9)</option>
              </select>
            </div>
            <div class="wf-field">
              <label class="wf-checkbox-label">
                <input type="checkbox" v-model="selectedNode.config.overdue" />
                Somente vencidos
              </label>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-create-receivable'">
            <div class="wf-field">
              <label>Vencimento</label>
              <input v-model="selectedNode.config.vencimento" type="date" class="wf-input" />
            </div>
            <div class="wf-field">
              <label>Valor (R$)</label>
              <input v-model="selectedNode.config.valor" type="number" min="0" step="0.01" class="wf-input" placeholder="0,00" />
            </div>
            <div class="wf-field wf-field--full">
              <label>Histórico</label>
              <input v-model="selectedNode.config.historico" class="wf-input" placeholder="Ex: Mensalidade abril/2026" />
            </div>
            <div class="wf-field">
              <label>Situação inicial</label>
              <select v-model.number="selectedNode.config.situacao_id" class="wf-select">
                <option :value="1">Em aberto</option>
                <option :value="2">Já recebido</option>
              </select>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-cash-flow'">
            <div class="wf-field">
              <label>Data início</label>
              <input v-model="selectedNode.config.date_from" type="date" class="wf-input" />
            </div>
            <div class="wf-field">
              <label>Data fim</label>
              <input v-model="selectedNode.config.date_to" type="date" class="wf-input" />
            </div>
            <div class="wf-field">
              <label class="wf-checkbox-label">
                <input type="checkbox" v-model="selectedNode.config.include_orders" />
                Incluir pedidos atendidos
              </label>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-pay' || selectedNode.type === 'action-receive'">
            <p class="wf-no-config">Aplicado sobre os registros filtrados anteriormente.</p>
          </template>

          <!-- ── PEDIDOS ────────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-list-orders'">
            <div class="wf-field">
              <label>Situação</label>
              <select v-model="selectedNode.config.situacao_id" class="wf-select">
                <option value="">Todas</option>
                <option value="6">Em aberto (6)</option>
                <option value="9">Atendido (9)</option>
                <option value="12">Cancelado (12)</option>
                <option value="15">Em andamento (15)</option>
                <option value="24">Verificado (24)</option>
              </select>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-update-order'">
            <div class="wf-field">
              <label>ID do pedido</label>
              <input v-model="selectedNode.config.order_id" class="wf-input" placeholder="ID interno Bling" />
            </div>
            <div class="wf-field">
              <label>Nova situação</label>
              <select v-model="selectedNode.config.situacao" class="wf-select">
                <option value="em aberto">Em aberto</option>
                <option value="atendido">Atendido</option>
                <option value="cancelado">Cancelado</option>
                <option value="em andamento">Em andamento</option>
                <option value="verificado">Verificado</option>
              </select>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-apply-discount'">
            <div class="wf-field">
              <label>Desconto (%)</label>
              <input v-model.number="selectedNode.config.desconto_percentual" type="number" min="0" max="100" step="0.5" class="wf-input" placeholder="Ex: 10" />
            </div>
            <p class="wf-no-config">Os IDs dos produtos serão recebidos dos nós anteriores.</p>
          </template>

          <template v-else-if="selectedNode.type === 'action-margin'">
            <div class="wf-field">
              <label>ID do pedido</label>
              <input v-model="selectedNode.config.order_id" class="wf-input" placeholder="ID interno Bling" />
            </div>
            <div class="wf-field">
              <label class="wf-checkbox-label">
                <input type="checkbox" v-model="selectedNode.config.incluir_frete" />
                Incluir frete como custo
              </label>
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-list-nfe'">
            <div class="wf-field">
              <label>ID do pedido (opcional)</label>
              <input v-model="selectedNode.config.order_id" class="wf-input" placeholder="Filtra NFes de um pedido" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-nfe-status'">
            <div class="wf-field">
              <label>ID da NFe</label>
              <input v-model="selectedNode.config.nfe_id" class="wf-input" placeholder="ID interno Bling" />
            </div>
          </template>

          <!-- ── ESTOQUE ────────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-check-stock'">
            <div class="wf-field">
              <label>SKU</label>
              <input v-model="selectedNode.config.sku" class="wf-input" placeholder="Código exato no Bling" />
            </div>
            <div class="wf-field">
              <label>ID depósito (opcional)</label>
              <input v-model="selectedNode.config.deposito_id" class="wf-input" placeholder="ID do depósito" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-sales-velocity'">
            <div class="wf-field">
              <label>ID do produto</label>
              <input v-model="selectedNode.config.product_id" class="wf-input" placeholder="ID interno Bling" />
            </div>
            <div class="wf-field">
              <label>Período de análise (dias)</label>
              <input v-model.number="selectedNode.config.days" type="number" min="7" class="wf-input" placeholder="90" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-replenishment'">
            <div class="wf-field">
              <label>ID do produto</label>
              <input v-model="selectedNode.config.product_id" class="wf-input" placeholder="ID interno Bling" />
            </div>
            <div class="wf-field">
              <label>Cobertura desejada (dias)</label>
              <input v-model.number="selectedNode.config.coverage_days" type="number" min="1" class="wf-input" placeholder="30" />
            </div>
            <div class="wf-field">
              <label>Lead time fornecedor (dias)</label>
              <input v-model.number="selectedNode.config.lead_time_days" type="number" min="0" class="wf-input" placeholder="7" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-purchase-order'">
            <div class="wf-field">
              <label>ID do fornecedor</label>
              <input v-model="selectedNode.config.supplier_contact_id" class="wf-input" placeholder="ID contato Bling" />
            </div>
            <div class="wf-field">
              <label>Entrega prevista</label>
              <input v-model="selectedNode.config.data_prevista" type="date" class="wf-input" />
            </div>
            <div class="wf-field wf-field--full">
              <label>Observações</label>
              <input v-model="selectedNode.config.observacoes" class="wf-input" placeholder="Observações internas" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-list-purchase-orders'">
            <div class="wf-field">
              <label>Situação</label>
              <select v-model="selectedNode.config.situacao_id" class="wf-select">
                <option value="">Todas</option>
                <option value="6">Em aberto</option>
                <option value="9">Atendido</option>
                <option value="12">Cancelado</option>
              </select>
            </div>
            <div class="wf-field">
              <label>ID fornecedor (opcional)</label>
              <input v-model="selectedNode.config.supplier_id" class="wf-input" placeholder="ID contato Bling" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-recurrent-products'">
            <div class="wf-field">
              <label>Top N produtos</label>
              <input v-model.number="selectedNode.config.top_n" type="number" min="1" max="50" class="wf-input" placeholder="10" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-update-prices'">
            <div class="wf-field wf-field--full">
              <label>Atualizações (JSON)</label>
              <textarea v-model="selectedNode.config.updates" class="wf-textarea" rows="3"
                placeholder='[{"id": 12345, "preco": 29.90}]' />
            </div>
            <p class="wf-no-config">Formato: array de objetos com id e preco.</p>
          </template>

          <template v-else-if="selectedNode.type === 'action-update-product'">
            <div class="wf-field wf-field--full">
              <label>IDs dos produtos (JSON)</label>
              <input v-model="selectedNode.config.product_ids" class="wf-input" placeholder='[12345, 67890]' />
            </div>
            <div class="wf-field">
              <label>Nova situação</label>
              <select v-model="selectedNode.config.situacao" class="wf-select">
                <option value="A">Ativo</option>
                <option value="I">Inativo</option>
                <option value="E">Excluído</option>
              </select>
            </div>
          </template>

          <!-- ── CONTATOS ───────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-search-contacts'">
            <div class="wf-field">
              <label>Nome</label>
              <input v-model="selectedNode.config.nome" class="wf-input" placeholder="Busca parcial por nome" />
            </div>
            <div class="wf-field">
              <label>E-mail</label>
              <input v-model="selectedNode.config.email" type="email" class="wf-input" placeholder="email@empresa.com" />
            </div>
            <div class="wf-field">
              <label>CPF / CNPJ</label>
              <input v-model="selectedNode.config.cpf_cnpj" class="wf-input" placeholder="Somente dígitos" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-list-suppliers'">
            <div class="wf-field">
              <label>Nome (opcional)</label>
              <input v-model="selectedNode.config.nome" class="wf-input" placeholder="Filtrar por nome" />
            </div>
          </template>

          <!-- ── COMUNICAÇÃO ────────────────────────────────────────────────── -->
          <template v-else-if="selectedNode.type === 'action-email'">
            <div class="wf-gmail-block">
              <div class="wf-gmail-header">
                <i class="pi pi-envelope" style="color:#ea4335" />
                <span class="wf-gmail-title">Conta Gmail</span>
                <span v-if="gmailToken" class="wf-gmail-badge wf-gmail-badge--ok">
                  <i class="pi pi-check-circle" /> {{ gmailEmail || 'Conectado' }}
                </span>
              </div>
              <template v-if="!gmailToken">
                <div class="wf-field">
                  <label>Google Client ID</label>
                  <input v-model="clientId" class="wf-input wf-input--mono" placeholder="xxxxxxxx.apps.googleusercontent.com" />
                </div>
                <details class="wf-gmail-help">
                  <summary>Como configurar?</summary>
                  <ol>
                    <li>Acesse <strong>console.cloud.google.com</strong></li>
                    <li>Crie um projeto e ative a <strong>Gmail API</strong></li>
                    <li>Em <em>Credenciais → OAuth 2.0</em>, crie credencial <strong>Aplicativo da web</strong></li>
                    <li>Adicione <code>{{ origin }}/oauth-callback.html</code> como URI autorizado</li>
                    <li>Copie o <strong>Client ID</strong> e clique em Conectar</li>
                  </ol>
                </details>
                <Button icon="pi pi-google" label="Conectar Gmail" size="small" outlined :loading="gmailConnecting" @click="connectGmail" />
                <p v-if="gmailError" class="wf-gmail-error">{{ gmailError }}</p>
              </template>
              <template v-else>
                <Button icon="pi pi-sign-out" label="Desconectar" size="small" severity="secondary" outlined @click="disconnectGmail" />
              </template>
            </div>
            <div class="wf-field">
              <label>Destinatário</label>
              <input v-model="selectedNode.config.to" type="email" class="wf-input" placeholder="email@empresa.com" />
            </div>
            <div class="wf-field">
              <label>Assunto</label>
              <input v-model="selectedNode.config.subject" class="wf-input" placeholder="Assunto do e-mail" />
            </div>
            <div class="wf-field wf-field--full">
              <label>Mensagem</label>
              <textarea v-model="selectedNode.config.body" class="wf-textarea" rows="3" placeholder="Corpo do e-mail…" />
            </div>
          </template>

          <template v-else-if="selectedNode.type === 'action-notify'">
            <div class="wf-field">
              <label>Mensagem</label>
              <input v-model="selectedNode.config.message" class="wf-input" placeholder="Texto da notificação" />
            </div>
          </template>

          <template v-else>
            <p class="wf-no-config">Nenhuma configuração disponível para este nó.</p>
          </template>

        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ── Root containers ──────────────────────────────────────────────────────── */
.wf-list-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.wf-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── List header ──────────────────────────────────────────────────────────── */
.wf-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.wf-list-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

/* Catálogo MCP (lista de workflows) */
.wf-mcp-catalog {
  margin: 0 0.75rem 0.5rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 10px;
  background: var(--p-surface-card);
  overflow: hidden;
}

.wf-mcp-catalog-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-color);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.wf-mcp-catalog-summary::-webkit-details-marker { display: none; }

.wf-mcp-catalog-summary .pi-bolt {
  color: var(--p-primary-color);
  font-size: 0.875rem;
}

.wf-mcp-catalog-badge {
  margin-left: auto;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
  color: var(--p-primary-color);
}

.wf-mcp-catalog-intro {
  margin: 0;
  padding: 0 0.75rem 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.55;
  color: var(--p-text-muted-color);
}

.wf-mcp-catalog-scroll {
  max-height: 220px;
  overflow-y: auto;
  border-top: 1px solid var(--p-surface-border);
  padding: 0.5rem 0.75rem 0.65rem;
}

.wf-mcp-grp + .wf-mcp-grp { margin-top: 0.65rem; }

.wf-mcp-grp-title {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--p-text-muted-color);
  margin-bottom: 0.35rem;
}

.wf-mcp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.wf-mcp-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.125rem;
  padding: 0.35rem 0;
  border-bottom: 1px dashed var(--p-surface-border);
  font-size: 0.6875rem;
}

.wf-mcp-item:last-child { border-bottom: none; }

.wf-mcp-id {
  font-family: ui-monospace, monospace;
  font-size: 0.625rem;
  color: var(--p-primary-color);
  font-weight: 600;
  word-break: break-all;
}

.wf-mcp-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.wf-mcp-desc {
  color: var(--p-text-muted-color);
  line-height: 1.45;
}

.wf-cards {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.wf-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: var(--p-text-muted-color);
  text-align: center;
}

.wf-empty-icon {
  font-size: 2.5rem;
  opacity: 0.3;
}

.wf-empty p { margin: 0; font-size: 0.875rem; }

/* ── Workflow card ────────────────────────────────────────────────────────── */
.wf-card {
  background: var(--p-surface-card);
  border: 1.5px solid var(--p-surface-border);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.wf-card--active {
  border-color: var(--p-primary-300, #93c5fd);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--p-primary-color) 15%, transparent);
}

.wf-card-top {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.wf-card-info { flex: 1; min-width: 0; }

.wf-card-name {
  display: block;
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-card-meta {
  display: block;
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  margin-top: 2px;
}

.wf-card-btns {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
}

.wf-icon-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  transition: background 0.15s, color 0.15s;
}

.wf-icon-btn:hover {
  background: var(--p-surface-hover);
  color: var(--p-text-color);
}

.wf-icon-btn--danger:hover { background: #fee2e2; color: #ef4444; }
.wf-icon-btn--confirm:hover { background: #dcfce7; color: #22c55e; }

/* ── Node chips ───────────────────────────────────────────────────────────── */
.wf-card-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.wf-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--chip-color, #6b7280) 12%, transparent);
  color: var(--chip-color, #6b7280);
  white-space: nowrap;
}

.wf-chip i { font-size: 0.625rem; }
.wf-chip-arrow { opacity: 0.4; font-size: 0.5rem !important; }
.wf-chip--more { background: var(--p-surface-hover); color: var(--p-text-muted-color); }

/* ── Card bottom ──────────────────────────────────────────────────────────── */
.wf-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Toggle */
.wf-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
}

.wf-toggle input { display: none; }

.wf-toggle-track {
  width: 30px;
  height: 17px;
  border-radius: 999px;
  background: var(--p-surface-border);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.wf-toggle--on .wf-toggle-track { background: var(--p-primary-color); }

.wf-toggle-thumb {
  position: absolute;
  width: 13px; height: 13px;
  border-radius: 50%;
  background: white;
  top: 2px; left: 2px;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}

.wf-toggle--on .wf-toggle-thumb { left: 15px; }
.wf-toggle-lbl { font-size: 0.6875rem; color: var(--p-text-muted-color); }

/* Run badge */
.wf-run-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.wf-run-badge--success { background: #dcfce7; color: #16a34a; }
.wf-run-badge--running { background: #dbeafe; color: #2563eb; }
.wf-run-badge--error   { background: #fee2e2; color: #dc2626; }

/* ── Editor toolbar ───────────────────────────────────────────────────────── */
.wf-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  background: var(--p-surface-card);
}

.wf-name-input {
  flex: 1;
  border: 1px solid var(--p-surface-border);
  border-radius: 6px;
  padding: 0.3125rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  outline: none;
  transition: border-color 0.15s;
}

.wf-name-input:focus { border-color: var(--p-primary-color); }

/* ── Workspace ────────────────────────────────────────────────────────────── */
.wf-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ── Palette ──────────────────────────────────────────────────────────────── */
.wf-palette {
  width: 130px;
  flex-shrink: 0;
  border-right: 1px solid var(--p-surface-border);
  overflow-y: auto;
  background: var(--p-surface-card);
  scrollbar-width: thin;
}

.wf-palette-group {
  padding: 0.5rem 0.625rem 0.25rem;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--p-text-muted-color);
  font-weight: 700;
  user-select: none;
}

.wf-palette-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.625rem;
  cursor: pointer;
  font-size: 0.7rem;
  color: var(--p-text-color);
  border-radius: 0;
  transition: background 0.12s;
  user-select: none;
}

.wf-palette-item:hover { background: var(--p-surface-hover); }

.wf-palette-dot {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--nt-color) 18%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wf-palette-dot i {
  color: var(--nt-color);
  font-size: 0.6875rem;
}

/* ── Canvas ───────────────────────────────────────────────────────────────── */
.wf-canvas {
  flex: 1;
  position: relative;
  overflow: auto;
  background: var(--p-surface-ground);
  cursor: default;
  scrollbar-width: thin;
}

.wf-grid {
  position: absolute;
  top: 0; left: 0;
  pointer-events: none;
  display: block;
}

.wf-edges-svg {
  position: absolute;
  top: 0; left: 0;
  overflow: visible;
  pointer-events: none;
}

/* ── Edges ────────────────────────────────────────────────────────────────── */
.wf-edge-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 14;
  cursor: pointer;
  pointer-events: stroke;
}

.wf-edge-line {
  fill: none;
  stroke: var(--p-surface-border);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 0.15s;
  pointer-events: none;
}

.wf-edge-g:hover .wf-edge-line {
  stroke: var(--p-primary-color);
}

.wf-edge-del {
  opacity: 0;
  pointer-events: all;
  cursor: pointer;
  transition: opacity 0.15s;
}

.wf-edge-g:hover .wf-edge-del {
  opacity: 1;
}

.wf-edge-del-circle {
  fill: var(--p-surface-card);
  stroke: var(--p-surface-border);
  stroke-width: 1.5;
  transition: fill 0.15s;
}

.wf-edge-del:hover .wf-edge-del-circle { fill: #fee2e2; stroke: #ef4444; }

.wf-edge-del-x {
  fill: var(--p-text-muted-color);
  font-family: inherit;
  pointer-events: none;
}

.wf-edge-del:hover .wf-edge-del-x { fill: #ef4444; }

.wf-temp-edge {
  fill: none;
  stroke: var(--p-primary-color);
  stroke-width: 2;
  stroke-dasharray: 7 4;
  pointer-events: none;
  opacity: 0.75;
}

/* ── Nodes ────────────────────────────────────────────────────────────────── */
.wf-node {
  position: absolute;
  width: 180px;
  height: 64px;
  display: flex;
  align-items: center;
  background: var(--p-surface-card);
  border: 1.5px solid var(--p-surface-border);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.07);
  cursor: grab;
  user-select: none;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.wf-node:active { cursor: grabbing; }

.wf-node--selected {
  border-color: var(--nc, var(--p-primary-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc, var(--p-primary-color)) 20%, transparent), 0 2px 8px rgba(0,0,0,0.1);
}

.wf-node-icon {
  width: 44px;
  height: 100%;
  border-radius: 8px 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 1rem;
}

.wf-node-body {
  flex: 1;
  padding: 0 0.625rem;
  min-width: 0;
}

.wf-node-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-node-type {
  display: block;
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
  margin-top: 1px;
}

.wf-node-del {
  position: absolute;
  top: -9px;
  right: -9px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--p-surface-ground);
  border: 1px solid var(--p-surface-border);
  color: var(--p-text-muted-color);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  z-index: 1;
}

.wf-node:hover .wf-node-del { opacity: 1; }
.wf-node-del:hover { background: #ef4444; color: white; border-color: #ef4444; }

/* ── Ports ────────────────────────────────────────────────────────────────── */
.wf-port {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--p-surface-card);
  border: 2px solid var(--p-surface-border);
  transition: border-color 0.12s, background 0.12s, transform 0.12s;
  z-index: 2;
}

.wf-port--in {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: crosshair;
}

.wf-port--out {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: crosshair;
}

.wf-port--out:hover {
  border-color: var(--p-primary-color);
  background: var(--p-primary-color);
  transform: translateY(-50%) scale(1.35);
}

.wf-port--in.wf-port--hover {
  border-color: var(--p-primary-color);
  background: var(--p-primary-color);
  transform: translateY(-50%) scale(1.35);
}

/* ── Canvas empty hint ────────────────────────────────────────────────────── */
.wf-canvas-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  opacity: 0.5;
  pointer-events: none;
  text-align: center;
}

.wf-canvas-hint i { font-size: 1.5rem; }
.wf-canvas-hint p { margin: 0; font-size: 0.8125rem; max-width: 180px; line-height: 1.5; }

/* ── Config panel ─────────────────────────────────────────────────────────── */
.wf-config {
  flex-shrink: 0;
  border-top: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
  overflow-y: auto;
  /* height controlled via :style binding */
}

.wf-config-resize-handle {
  position: sticky;
  top: 0;
  height: 6px;
  cursor: ns-resize;
  background: transparent;
  z-index: 5;
  transition: background 0.15s;
  margin-bottom: -6px; /* overlap so it doesn't shift content */
}
.wf-config-resize-handle:hover,
.wf-config-resize-handle:active {
  background: var(--p-primary-color);
  opacity: 0.35;
}

.wf-config-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  position: sticky;
  top: 0;
  background: var(--p-surface-card);
  z-index: 1;
}

.wf-config-header > i { font-size: 0.875rem; flex-shrink: 0; }

.wf-config-name {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--p-text-color);
  outline: none;
  min-width: 0;
}

.wf-config-close {
  width: 22px; height: 22px;
  border: none; background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  color: var(--p-text-muted-color);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
}
.wf-config-close:hover { background: var(--p-surface-hover); }

.wf-config-body {
  padding: 0.625rem 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.wf-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 120px;
}

.wf-field label {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wf-input,
.wf-select {
  border: 1px solid var(--p-surface-border);
  border-radius: 6px;
  padding: 0.3125rem 0.5rem;
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.wf-input:focus,
.wf-select:focus { border-color: var(--p-primary-color); }

.wf-no-config {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  font-style: italic;
}

/* ── Config panel slide transition ────────────────────────────────────────── */
.cfg-slide-enter-active,
.cfg-slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.cfg-slide-enter-from,
.cfg-slide-leave-to { opacity: 0; transform: translateY(12px); }
.cfg-slide-enter-to,
.cfg-slide-leave-from { opacity: 1; transform: translateY(0); }

/* ── Gmail block ──────────────────────────────────────────────────────────── */
.wf-gmail-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.625rem;
  background: color-mix(in srgb, #ea4335 6%, var(--p-surface-ground));
  border: 1px solid color-mix(in srgb, #ea4335 18%, var(--p-surface-border));
  border-radius: 8px;
}

.wf-gmail-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.wf-gmail-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-color);
  flex: 1;
}

.wf-gmail-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.wf-gmail-badge--ok { background: #dcfce7; color: #16a34a; }

.wf-gmail-error {
  margin: 0;
  font-size: 0.6875rem;
  color: #dc2626;
}

.wf-gmail-help {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  cursor: pointer;
}

.wf-gmail-help summary {
  user-select: none;
  font-weight: 600;
  color: var(--p-primary-color);
  margin-bottom: 0.25rem;
}

.wf-gmail-help ol {
  margin: 0.25rem 0 0;
  padding-left: 1.125rem;
  line-height: 1.7;
}

.wf-gmail-help code {
  background: var(--p-surface-ground);
  padding: 0.0625rem 0.25rem;
  border-radius: 3px;
  font-size: 0.65rem;
  word-break: break-all;
}

.wf-input--mono { font-family: monospace; font-size: 0.75rem; }

.wf-field--full { width: 100%; flex-basis: 100%; }

.wf-textarea {
  border: 1px solid var(--p-surface-border);
  border-radius: 6px;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  outline: none;
  resize: vertical;
  width: 100%;
  transition: border-color 0.15s;
}

.wf-textarea:focus { border-color: var(--p-primary-color); }

/* ── NL Prompt view ─────────────────────────────────────────────────────────── */
.wf-nl-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.wf-nl-toolbar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  flex: 1;
}

.wf-nl-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.75rem 1.25rem 1.25rem;
  overflow-y: auto;
  gap: 1rem;
}

.wf-nl-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wf-nl-icon {
  font-size: 1.5rem;
  color: var(--p-primary-color);
}

.wf-nl-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
  text-align: center;
}

.wf-nl-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  line-height: 1.65;
  text-align: center;
}

.wf-nl-textarea {
  width: 100%;
  border: 1.5px solid var(--p-surface-border);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  outline: none;
  resize: vertical;
  min-height: 90px;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.wf-nl-textarea:focus { border-color: var(--p-primary-color); }

.wf-nl-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.wf-nl-note {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
  opacity: 0.8;
}
.wf-nl-note i { font-size: 0.75rem; }
</style>
