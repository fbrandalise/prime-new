/**
 * Catálogo espelhando operações Bling (API) como “ferramentas” no estilo MCP.
 * Cada entrada liga um id de tool (snake_case) ao tipo de nó do editor de workflows.
 * Não há servidor MCP no browser — isto documenta e alinha UX/execução com o que um MCP Bling exporia.
 */

import { NODE_TYPES, PALETTE_GROUPS } from './useWorkflows.js'

export const MCP_TOOL_BY_NODE = {
  'trigger-manual': {
    mcpTool: 'workflow.trigger_manual',
    summary: 'Disparo iniciado pelo usuário no painel de workflows.',
  },
  'trigger-cron': {
    mcpTool: 'workflow.trigger_schedule',
    summary: 'Agendamento recorrente (dia do mês + hora).',
  },
  'trigger-overdue': {
    mcpTool: 'contas.trigger_overdue',
    summary: 'Evento quando existem contas a receber ou a pagar em atraso.',
  },
  'trigger-low-stock': {
    mcpTool: 'estoque.trigger_low_stock',
    summary: 'Evento quando o saldo de um SKU fica abaixo do mínimo configurado.',
  },
  'trigger-new-order': {
    mcpTool: 'pedidos.trigger_new_order',
    summary: 'Evento ao detectar novo pedido de venda em situação configurada.',
  },
  'action-filter': {
    mcpTool: 'contas.filter',
    summary: 'Filtra lançamentos financeiros por tipo e situação (pré-processamento).',
  },
  'action-condition': {
    mcpTool: 'workflow.branch_condition',
    summary: 'Ramificação por campo (valor, atraso, situação).',
  },
  'action-wait': {
    mcpTool: 'workflow.wait',
    summary: 'Pausa o fluxo por N dias.',
  },
  'action-list-receivables': {
    mcpTool: 'contas_receber.listar',
    summary: 'GET contas a receber com filtros de situação e vencidos.',
  },
  'action-list-payables': {
    mcpTool: 'contas_pagar.listar',
    summary: 'GET contas a pagar com filtros de situação e vencidos.',
  },
  'action-create-receivable': {
    mcpTool: 'contas_receber.criar',
    summary: 'POST lançamento a receber (vencimento, valor, histórico).',
  },
  'action-cash-flow': {
    mcpTool: 'financeiro.fluxo_caixa',
    summary: 'Consolida entradas/saídas e opcionalmente pedidos atendidos no período.',
  },
  'action-receive': {
    mcpTool: 'contas_receber.baixar',
    summary: 'Baixa (recebimento) sobre itens filtrados anteriormente.',
  },
  'action-pay': {
    mcpTool: 'contas_pagar.baixar',
    summary: 'Baixa (pagamento) sobre itens filtrados anteriormente.',
  },
  'action-list-orders': {
    mcpTool: 'pedidos_venda.listar',
    summary: 'GET pedidos de venda por situação.',
  },
  'action-update-order': {
    mcpTool: 'pedidos_venda.atualizar_situacao',
    summary: 'PATCH situação do pedido (em aberto, atendido, cancelado, etc.).',
  },
  'action-apply-discount': {
    mcpTool: 'produtos.aplicar_desconto_pedido',
    summary: 'Aplica percentual de desconto em itens (IDs vindos do fluxo).',
  },
  'action-margin': {
    mcpTool: 'pedidos_venda.margem_contribuicao',
    summary: 'Calcula margem bruta do pedido; opcionalmente inclui frete como custo.',
  },
  'action-list-nfe': {
    mcpTool: 'nfe.listar',
    summary: 'Lista notas fiscais; filtro opcional por pedido.',
  },
  'action-nfe-status': {
    mcpTool: 'nfe.consultar_status',
    summary: 'Consulta autorização / status de uma NFe pelo id interno.',
  },
  'action-check-stock': {
    mcpTool: 'estoque.consultar_saldo',
    summary: 'Saldo por SKU e depósito opcional.',
  },
  'action-sales-velocity': {
    mcpTool: 'estoque.velocidade_vendas',
    summary: 'Média de saída do produto no período em dias.',
  },
  'action-replenishment': {
    mcpTool: 'estoque.sugerir_reposicao',
    summary: 'Sugestão de compra por cobertura e lead time.',
  },
  'action-purchase-order': {
    mcpTool: 'pedidos_compra.criar',
    summary: 'Cria pedido de compra para fornecedor.',
  },
  'action-list-purchase-orders': {
    mcpTool: 'pedidos_compra.listar',
    summary: 'Lista pedidos de compra por situação e fornecedor.',
  },
  'action-recurrent-products': {
    mcpTool: 'produtos.ranking_vendas',
    summary: 'Ranking dos produtos mais vendidos (top N).',
  },
  'action-update-prices': {
    mcpTool: 'produtos.atualizar_precos',
    summary: 'Atualização em lote de preços (payload JSON).',
  },
  'action-update-product': {
    mcpTool: 'produtos.atualizar_situacao',
    summary: 'Ativa, inativa ou exclui produtos por ids.',
  },
  'action-search-contacts': {
    mcpTool: 'contatos.buscar',
    summary: 'Pesquisa clientes/fornecedores por nome, e-mail ou documento.',
  },
  'action-list-suppliers': {
    mcpTool: 'fornecedores.listar',
    summary: 'Lista fornecedores; filtro opcional por nome.',
  },
  'action-email': {
    mcpTool: 'comunicacao.email',
    summary: 'Envio de e-mail (no protótipo: Gmail OAuth no cliente).',
  },
  'action-notify': {
    mcpTool: 'comunicacao.notificacao_interna',
    summary: 'Notificação in-app / registro de aviso no sistema.',
  },
}

export function mcpToolId(nodeType) {
  return MCP_TOOL_BY_NODE[nodeType]?.mcpTool ?? nodeType
}

export function mcpSummary(nodeType) {
  return MCP_TOOL_BY_NODE[nodeType]?.summary ?? ''
}

/** Linha de log alinhada ao que um runner MCP reportaria */
export function formatMcpWorkflowLogLine(node) {
  const id = mcpToolId(node.type)
  const label = node.label || id
  return `[${id}] ${label}`
}

/** Lista agrupada para a UI (catálogo expansível) */
export function getMcpCatalogGrouped() {
  return PALETTE_GROUPS.map(g => ({
    key: g.key,
    label: g.label,
    tools: Object.entries(NODE_TYPES)
      .filter(([, v]) => v.category === g.key)
      .map(([nodeType, meta]) => ({
        nodeType,
        mcpTool: mcpToolId(nodeType),
        label: meta.label,
        desc: meta.desc,
        summary: mcpSummary(nodeType),
      })),
  })).filter(g => g.tools.length > 0)
}
