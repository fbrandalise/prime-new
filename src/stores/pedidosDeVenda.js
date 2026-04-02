import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ── helpers ───────────────────────────────────────────────────────────────────
function dateToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fromCents(v) {
  return (v ?? 0) / 100
}

// ── dados mock (substituir por query Supabase quando tabela existir) ───────────
const MOCK = [
  { id: 94, numero: 94, data: '2026-03-16', cliente: 'Leandra Martins', cliente_handle: 'mleandra812', total: 5799,  situacao: 'Em aberto',  loja: 'Mercado Livre', primeira_venda: false, rastreamento: 'Postado',    canal: 'marketplace' },
  { id: 93, numero: 93, data: '2026-03-15', cliente: 'Leandra Martins', cliente_handle: 'mleandra812', total: 7599,  situacao: 'Em aberto',  loja: 'Mercado Livre', primeira_venda: false, rastreamento: 'Em andamento', canal: 'marketplace' },
  { id: 91, numero: 91, data: '2026-03-13', cliente: 'Leandra Martins', cliente_handle: 'mleandra812', total: 3499,  situacao: 'Em aberto',  loja: 'Shopee',        primeira_venda: true,  rastreamento: 'Postado',    canal: 'marketplace' },
  { id: 90, numero: 90, data: '2026-03-13', cliente: 'Luciana Kabaze Prado', cliente_handle: 'vkl',   total: 9599,  situacao: 'Em aberto',  loja: 'Amazon',        primeira_venda: false, rastreamento: 'Postado',    canal: 'marketplace' },
  { id: 89, numero: 89, data: '2026-03-13', cliente: 'Luciana Kabaze Prado', cliente_handle: 'vkl',   total: 9599,  situacao: 'Em aberto',  loja: 'Amazon',        primeira_venda: false, rastreamento: 'Em andamento', canal: 'marketplace' },
  { id: 88, numero: 88, data: '2026-03-13', cliente: 'Luciana Kabaze Prado', cliente_handle: 'vkl',   total: 5799,  situacao: 'Em aberto',  loja: 'Shopee',        primeira_venda: true,  rastreamento: 'Entregue',   canal: 'marketplace' },
  { id: 85, numero: 85, data: '2026-03-10', cliente: 'Carlos Eduardo Silva', cliente_handle: 'carlosedu', total: 12490, situacao: 'Atendido', loja: 'Loja Virtual', primeira_venda: false, rastreamento: 'Entregue',   canal: 'loja_virtual' },
  { id: 83, numero: 83, data: '2026-03-09', cliente: 'Ana Paula Ferreira', cliente_handle: 'anapaula_f', total: 8700, situacao: 'Em andamento', loja: 'Mercado Livre', primeira_venda: false, rastreamento: 'Em andamento', canal: 'marketplace' },
  { id: 81, numero: 81, data: '2026-03-08', cliente: 'Roberto Santos',   cliente_handle: 'robertosan', total: 34500, situacao: 'Faturado parcialmente', loja: 'Loja Virtual', primeira_venda: false, rastreamento: 'Etiqueta disponível', canal: 'loja_virtual' },
  { id: 79, numero: 79, data: '2026-03-07', cliente: 'Fernanda Lima',    cliente_handle: 'ferlima99',  total: 6890,  situacao: 'Cancelado',  loja: 'Shopee',        primeira_venda: false, rastreamento: null,         canal: 'marketplace' },
  { id: 77, numero: 77, data: '2026-03-06', cliente: 'Marcos Oliveira',  cliente_handle: 'marcosoliv', total: 45000, situacao: 'Atendido',   loja: 'Amazon',        primeira_venda: false, rastreamento: 'Entregue',   canal: 'marketplace' },
  { id: 75, numero: 75, data: '2026-03-05', cliente: 'Juliana Costa',   cliente_handle: 'julicosta',  total: 9900,  situacao: 'Pagamento aprovado', loja: 'Loja Virtual', primeira_venda: true, rastreamento: 'Etiqueta disponível', canal: 'loja_virtual' },
  { id: 73, numero: 73, data: '2026-03-04', cliente: 'Diego Martins',   cliente_handle: 'diegomrt',   total: 18700, situacao: 'Em digitação', loja: 'Mercado Livre', primeira_venda: false, rastreamento: null,        canal: 'marketplace' },
  { id: 71, numero: 71, data: '2026-03-03', cliente: 'Patricia Alves',  cliente_handle: 'patalves',   total: 7250,  situacao: 'Verificado', loja: 'Shopee',        primeira_venda: false, rastreamento: 'Aguardando retirada', canal: 'marketplace' },
  { id: 69, numero: 69, data: '2026-03-02', cliente: 'Thiago Barbosa',  cliente_handle: 'thibarbosa', total: 5500,  situacao: 'Em devolução', loja: 'Amazon',      primeira_venda: false, rastreamento: 'Não Entregue', canal: 'marketplace' },
  { id: 67, numero: 67, data: '2026-03-01', cliente: 'Camila Ramos',    cliente_handle: 'camilinha',  total: 3290,  situacao: 'Atendido parcialmente', loja: 'Loja Virtual', primeira_venda: false, rastreamento: 'Entregue', canal: 'loja_virtual' },
  { id: 65, numero: 65, data: '2026-02-28', cliente: 'Eduardo Pinto',   cliente_handle: 'edupinto',   total: 11200, situacao: 'Checkout parcial', loja: 'Loja Virtual', primeira_venda: true, rastreamento: null,       canal: 'loja_virtual' },
  { id: 63, numero: 63, data: '2026-02-27', cliente: 'Beatriz Moreira', cliente_handle: 'beatrizm',   total: 8800,  situacao: 'Venda Agenciada', loja: 'Mercado Livre', primeira_venda: false, rastreamento: 'Postado', canal: 'marketplace' },
]

function mapItem(raw) {
  return {
    id:             raw.id,
    numero:         raw.numero,
    data:           raw.data ? dateToDisplay(raw.data) : '',
    _dataRaw:       raw.data,
    cliente:        raw.cliente,
    clienteHandle:  raw.cliente_handle,
    total:          fromCents(raw.total),
    totalDisplay:   fromCents(raw.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    situacao:       raw.situacao,
    loja:           raw.loja,
    primeiraVenda:  raw.primeira_venda ?? false,
    rastreamento:   raw.rastreamento,
    canal:          raw.canal,
  }
}

export const usePedidosDeVendaStore = defineStore('pedidosDeVenda', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      // TODO: substituir por query real quando tabela existir
      // const { data, error } = await supabase
      //   .from('pedidos_de_venda')
      //   .select('*')
      //   .order('numero', { ascending: false })
      // if (error) throw error
      // items.value = (data ?? []).map(mapItem)
      await new Promise(r => setTimeout(r, 400)) // simula latência
      items.value = MOCK.map(mapItem)
    } finally {
      loading.value = false
    }
  }

  async function mudarSituacao(id, novaSituacao) {
    // TODO: await supabase.from('pedidos_de_venda').update({ situacao: novaSituacao }).eq('id', id)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], situacao: novaSituacao }
  }

  async function remove(id) {
    // TODO: await supabase.from('pedidos_de_venda').delete().eq('id', id)
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, loading, fetchAll, mudarSituacao, remove }
})
