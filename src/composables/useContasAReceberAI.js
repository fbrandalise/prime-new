import { ref } from 'vue'

// ── Serializa resumo dos dados para contexto da IA ────────────────────────────
function buildContext(contas) {
  if (!contas.length) return 'Nenhuma conta no período filtrado.'

  const total     = contas.length
  const atrasadas = contas.filter(c => c.situacao === 'Atrasada')
  const sumTotal  = contas.reduce((s, c)  => s + (c._valorCentavos ?? 0) / 100, 0)
  const sumAtraso = atrasadas.reduce((s, c) => s + (c._valorCentavos ?? 0) / 100, 0)

  const clientMap = {}
  contas.forEach(c => {
    if (!clientMap[c.cliente]) clientMap[c.cliente] = { total: 0, atrasado: 0 }
    clientMap[c.cliente].total += (c._valorCentavos ?? 0) / 100
    if (c.situacao === 'Atrasada') clientMap[c.cliente].atrasado += (c._valorCentavos ?? 0) / 100
  })

  const topByTotal   = Object.entries(clientMap).sort(([, a], [, b]) => b.total - a.total).slice(0, 5)
  const topOverdue   = Object.entries(clientMap).filter(([, v]) => v.atrasado > 0).sort(([, a], [, b]) => b.atrasado - a.atrasado).slice(0, 5)
  const situacoes    = contas.reduce((acc, c) => { acc[c.situacao] = (acc[c.situacao] ?? 0) + 1; return acc }, {})
  const fmt          = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  return [
    '== CONTAS A RECEBER (período filtrado) ==',
    `Total: ${total} contas | Valor total: R$ ${fmt(sumTotal)}`,
    `Situações: ${Object.entries(situacoes).map(([s, n]) => `${s}: ${n}`).join(' | ')}`,
    `Em atraso: ${atrasadas.length} contas (${total > 0 ? (atrasadas.length / total * 100).toFixed(1) : 0}%) = R$ ${fmt(sumAtraso)}`,
    topByTotal.length  ? `Top clientes por valor: ${topByTotal.map(([c, v]) => `${c} (R$ ${fmt(v.total)})`).join(', ')}`       : '',
    topOverdue.length  ? `Top inadimplentes: ${topOverdue.map(([c, v]) => `${c} (R$ ${fmt(v.atrasado)})`).join(', ')}`         : '',
  ].filter(Boolean).join('\n')
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useContasAReceberAI() {
  const loading  = ref(false)
  // AVISO: a chave fica exposta no bundle — usar apenas em protótipo
  const apiKey   = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''
  const hasApiKey = !!apiKey

  const send = async (question, contas) => {
    if (!apiKey) throw new Error('Configure VITE_ANTHROPIC_API_KEY no .env para usar este recurso.')
    loading.value = true
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'content-type':                      'application/json',
          'x-api-key':                         apiKey,
          'anthropic-version':                 '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system:     'Você é um assistente financeiro especializado em análise de contas a receber para PMEs brasileiras. Responda em português, de forma concisa e prática, usando os dados concretos fornecidos. Não invente informações além do contexto.',
          messages:   [{ role: 'user', content: `${buildContext(contas)}\n\nPergunta: ${question}` }],
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error?.message ?? `Erro HTTP ${res.status}`)
      }
      const json = await res.json()
      return json.content[0].text
    } finally {
      loading.value = false
    }
  }

  return { loading, send, hasApiKey }
}
