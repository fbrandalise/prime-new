import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/extratoService'

function mapItem(raw, conciliacoes = []) {
  const itemConcs = conciliacoes.filter(c => c.extrato_item_id === raw.id)
  return {
    id:                  raw.id,
    conta_financeira_id: raw.conta_financeira_id,
    data:                raw.data,                   // YYYY-MM-DD
    dataDisplay:         service.dateToDisplay(raw.data),
    descricao:           raw.descricao ?? '',
    valor:               raw.valor ?? 0,             // centavos
    valorDisplay:        service.fromCents(raw.valor ?? 0)
                           .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    tipo:                raw.tipo,                   // 'Crédito' | 'Débito'
    conciliado:          raw.conciliado ?? false,
    ignorado:            raw.ignorado ?? false,
    // Junction-based links (array of linked conta IDs)
    conciliacoes:        itemConcs,
    contasAPagarIds:     itemConcs.filter(c => c.conta_a_pagar_id).map(c => c.conta_a_pagar_id),
    contasAReceberIds:   itemConcs.filter(c => c.conta_a_receber_id).map(c => c.conta_a_receber_id),
    // Legacy compat (first linked conta)
    conta_a_pagar_id:    raw.conta_a_pagar_id ?? itemConcs.find(c => c.conta_a_pagar_id)?.conta_a_pagar_id ?? null,
    conta_a_receber_id:  raw.conta_a_receber_id ?? itemConcs.find(c => c.conta_a_receber_id)?.conta_a_receber_id ?? null,
  }
}

export const useConciliacaoStore = defineStore('conciliacao', () => {
  const extrato = ref([])
  const loading = ref(false)

  async function fetchExtrato(contaId, from, to) {
    loading.value = true
    try {
      const data = await service.getByContaEPeriodo(contaId, from, to)
      // Fetch all conciliacoes for these extrato items
      const ids = data.map(d => d.id)
      const conciliacoes = await service.getConciliacoesByExtratoIds(ids)
      extrato.value = data.map(d => mapItem(d, conciliacoes))
    } finally {
      loading.value = false
    }
  }

  async function importar(itens, contaId) {
    const payload = itens.map(item => ({
      conta_financeira_id: contaId,
      data:                service.dateToISO(item.data),
      descricao:           item.descricao ?? '',
      valor:               item.valor,   // já em centavos
      tipo:                item.tipo,
      conciliado:          false,
      ignorado:            false,
    }))

    const inserted = await service.insertMany(payload)
    const mapped = inserted.map(d => mapItem(d, []))
    extrato.value.push(...mapped)
    extrato.value.sort((a, b) => a.data.localeCompare(b.data))
    return mapped
  }

  /**
   * Conciliar um item do extrato com N contas.
   * @param {string} extratoId
   * @param {{ contasAPagarIds?: string[], contasAReceberIds?: string[] }} contaIds
   */
  async function conciliar(extratoId, { contasAPagarIds = [], contasAReceberIds = [] } = {}) {
    // Build junction rows
    const rows = []
    for (const id of contasAPagarIds) {
      rows.push({ extrato_item_id: extratoId, conta_a_pagar_id: id, conta_a_receber_id: null })
    }
    for (const id of contasAReceberIds) {
      rows.push({ extrato_item_id: extratoId, conta_a_pagar_id: null, conta_a_receber_id: id })
    }

    // Insert junction rows
    const insertedConcs = rows.length ? await service.insertManyConciliacoes(rows) : []

    // Mark extrato item as conciliado
    const raw = await service.update(extratoId, {
      conciliado: true,
      ignorado:   false,
    })

    // Update local state
    const idx = extrato.value.findIndex(i => i.id === extratoId)
    if (idx !== -1) {
      const existingConcs = extrato.value[idx].conciliacoes || []
      extrato.value[idx] = mapItem(raw, [...existingConcs, ...insertedConcs])
    }
  }

  async function desconciliar(extratoId) {
    // Delete all junction rows for this extrato item
    await service.deleteConciliacoesByExtrato(extratoId)

    // Mark as not conciliado
    const raw = await service.update(extratoId, {
      conciliado: false,
    })

    const idx = extrato.value.findIndex(i => i.id === extratoId)
    if (idx !== -1) extrato.value[idx] = mapItem(raw, [])
  }

  async function ignorar(extratoId) {
    // Delete any existing conciliacoes
    await service.deleteConciliacoesByExtrato(extratoId)

    const raw = await service.update(extratoId, {
      ignorado:   true,
      conciliado: false,
    })
    const idx = extrato.value.findIndex(i => i.id === extratoId)
    if (idx !== -1) extrato.value[idx] = mapItem(raw, [])
  }

  async function restaurar(extratoId) {
    const raw = await service.update(extratoId, { ignorado: false })
    const idx = extrato.value.findIndex(i => i.id === extratoId)
    if (idx !== -1) {
      const existingConcs = extrato.value[idx].conciliacoes || []
      extrato.value[idx] = mapItem(raw, existingConcs)
    }
  }

  async function removerItem(extratoId) {
    await service.remove(extratoId)
    extrato.value = extrato.value.filter(i => i.id !== extratoId)
  }

  return { extrato, loading, fetchExtrato, importar, conciliar, desconciliar, ignorar, restaurar, removerItem }
})
