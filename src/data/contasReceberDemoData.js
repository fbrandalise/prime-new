/** 400 contas sintéticas (`demo-*`) para alimentar a listagem em desenvolvimento. */

const N = 400

const CLIENTES = [
  'Alpha Comércio Ltda', 'Beta Serviços', 'Gama Indústria', 'Delta Logística', 'Epsilon Tech',
  'Zeta Alimentos', 'Eta Construções', 'Theta Móveis', 'Iota Digital', 'Kappa Saúde',
  'Lambda Varejo', 'Mu Agro', 'Nu Transportes', 'Xi Energia', 'Omicron Educação',
  'Pi Hotelaria', 'Rho Moda', 'Sigma Autopeças', 'Tau Bebidas', 'Upsilon Cosméticos',
  'Pharma Norte', 'Metal Sul', 'Papelaria Central', 'InfoWest', 'Clean Pro',
  'Safe Guard', 'Green Farm', 'Blue Ocean', 'Red Star', 'Gold Mine',
  'Silver Line', 'Bronze Art', 'Crystal Glass', 'Diamond Tools', 'Emerald Foods',
  'Ruby Shoes', 'Sapphire IT', 'Top Mídia', 'Mega Store', 'Super Box',
]

const FORMAS = ['Boleto', 'PIX', 'Cartão de crédito', 'Transferência', 'Dinheiro']
const CATEGORIAS = ['Vendas', 'Serviços', 'Aluguéis', 'Outros']
const VENDEDORES = ['Miguel Gaieski', 'Rodrigo R.', 'Ana Paula Silva', 'Fernando Alves', 'Juliana Martins']

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

let demoCache = null

export function ensureDemoContasCache(count = N) {
  if (demoCache) return demoCache
  demoCache = []
  const hoje = todayISO()
  for (let i = 0; i < count; i++) {
    const rand = mulberry32(i + 90210)
    const suffix = i >= CLIENTES.length ? ` (${1 + Math.floor(i / CLIENTES.length)})` : ''
    const cliente = `${CLIENTES[i % CLIENTES.length]}${suffix}`
    const offsetDias = Math.floor((rand() - 0.5) * 520)
    let vencimento = addDays(hoje, offsetDias)

    const r = rand()
    let situacao =
      r < 0.32 ? 'Recebida'
        : r < 0.42 ? 'Recebida parcialmente'
          : r < 0.52 ? 'Antecipada'
            : r < 0.78 ? 'A receber'
              : 'Atrasada'

    if (situacao === 'Recebida' || situacao === 'Recebida parcialmente') {
      vencimento = addDays(hoje, -Math.floor(rand() * 240) - 1)
    } else if (situacao === 'Atrasada') {
      vencimento = addDays(hoje, -Math.floor(rand() * 120) - 1)
    }

    const valorCentavos = Math.round((200 + rand() * 49800) * 100)

    demoCache.push({
      id:                  `demo-${i}`,
      cliente,
      valor:               valorCentavos,
      data_emissao:        addDays(vencimento, -Math.floor(rand() * 30) - 1),
      competencia:         vencimento,
      vencimento,
      historico:           `Ref. demo #${i + 1}`,
      nro_documento:       String(100000 + i),
      ocorrencia:          'Única',
      frequencia:          null,
      parcelas:            null,
      forma_pagamento:     FORMAS[Math.floor(rand() * FORMAS.length)],
      conta_financeira_id: rand() > 0.35 ? (Math.floor(rand() * 3) + 1) : null,
      nro_banco:           null,
      categoria:           CATEGORIAS[Math.floor(rand() * CATEGORIAS.length)],
      vendedor:            VENDEDORES[Math.floor(rand() * VENDEDORES.length)],
      juros_mensal:        null,
      multa:               null,
      multa_tipo:          null,
      anexos:              [],
      situacao,
      lancamento_id:       null,
    })
  }
  return demoCache
}

export function getDemoRawById(id) {
  return demoCache?.find(r => r.id === id) ?? null
}

export function demoMutateRow(id, patch) {
  const row = getDemoRawById(id)
  if (!row) return null
  Object.assign(row, patch)
  return { ...row }
}

export function demoRemoveRow(id) {
  if (!demoCache) return
  const idx = demoCache.findIndex(r => r.id === id)
  if (idx !== -1) demoCache.splice(idx, 1)
}

export function demoPrependRow(row) {
  ensureDemoContasCache()
  demoCache.unshift(row)
  return row
}

export const DEMO_CONTAS_COUNT = N
