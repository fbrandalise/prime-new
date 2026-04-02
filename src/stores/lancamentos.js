import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as service from '@/services/lancamentosService'
import * as contasAReceberService from '@/services/contasAReceberService'
import * as contasAPagarService from '@/services/contasAPagarService'

function isOverdue(isoDate) {
  if (!isoDate) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(isoDate + 'T00:00:00') < hoje
}

function mapItem(raw) {
  const isPendente = raw.situacao === 'A receber' || raw.situacao === 'A pagar'
  const situacao = isPendente && isOverdue(raw.data)
    ? 'Atrasada'
    : raw.situacao

  return {
    id:                   raw.id,
    data:                 service.dateToDisplay(raw.data),
    descricao:            raw.descricao,
    categoria:            raw.categoria,
    tipo:                 raw.tipo,
    valor:                service.fromCents(raw.valor ?? 0)
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    situacao,
    canalVenda:           raw.canal_venda ?? null,
    conta_financeira_id:  raw.conta_financeira_id,
    conta_a_receber_id:   raw.conta_a_receber_id,
    conta_a_pagar_id:     raw.conta_a_pagar_id,
  }
}

export const useLancamentosStore = defineStore('lancamentos', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const data = await service.getAll()
      items.value = data.map(mapItem)

      // Atualiza no banco os itens vencidos que ainda estão como 'A receber' ou 'A pagar'
      const vencidos = data.filter(r => (r.situacao === 'A receber' || r.situacao === 'A pagar') && isOverdue(r.data))
      if (vencidos.length) {
        await Promise.all(
          vencidos.map(r => service.update(r.id, { situacao: 'Atrasada' }))
        )
      }
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  function _novoStatusPendente(vencimentoISO) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return new Date(vencimentoISO + 'T00:00:00') < hoje ? 'Atrasada' : null
  }

  async function estornar(id) {
    const lanc = items.value.find(l => l.id === id)
    if (!lanc) return

    if (lanc.conta_a_receber_id) {
      // Busca a conta direto do DB (store pode não estar carregado)
      const conta = await contasAReceberService.getById(lanc.conta_a_receber_id)
      const novoStatus = _novoStatusPendente(conta.vencimento) ?? 'A receber'

      await contasAReceberService.update(conta.id, { situacao: novoStatus })
      await service.update(id, { situacao: novoStatus })

      // Sincroniza store do lançamento
      const lancIdx = items.value.findIndex(l => l.id === id)
      if (lancIdx !== -1) items.value[lancIdx] = { ...items.value[lancIdx], situacao: novoStatus }

      // Sincroniza store de contas a receber se estiver carregado
      const { useContasAReceberStore } = await import('./contasAReceber')
      const receberStore = useContasAReceberStore()
      const storeIdx = receberStore.items.findIndex(i => i.id === conta.id)
      if (storeIdx !== -1) {
        receberStore.items[storeIdx] = { ...receberStore.items[storeIdx], situacao: novoStatus }
      }

    } else if (lanc.conta_a_pagar_id) {
      const conta = await contasAPagarService.getById(lanc.conta_a_pagar_id)
      const novoStatus = _novoStatusPendente(conta.vencimento) ?? 'A pagar'

      await contasAPagarService.update(conta.id, { situacao: novoStatus })
      await service.update(id, { situacao: novoStatus })

      const lancIdx = items.value.findIndex(l => l.id === id)
      if (lancIdx !== -1) items.value[lancIdx] = { ...items.value[lancIdx], situacao: novoStatus }

      const { useContasAPagarStore } = await import('./contasAPagar')
      const pagarStore = useContasAPagarStore()
      const storeIdx = pagarStore.items.findIndex(i => i.id === conta.id)
      if (storeIdx !== -1) {
        pagarStore.items[storeIdx] = { ...pagarStore.items[storeIdx], situacao: novoStatus }
      }

    } else {
      await remove(id)
    }
  }

  const byContaFinanceira = computed(() => {
    const map = new Map()
    items.value.forEach(l => {
      if (!l.conta_financeira_id) return
      if (!map.has(l.conta_financeira_id)) map.set(l.conta_financeira_id, [])
      map.get(l.conta_financeira_id).push(l)
    })
    return map
  })

  return { items, loading, fetchAll, remove, estornar, byContaFinanceira }
})
