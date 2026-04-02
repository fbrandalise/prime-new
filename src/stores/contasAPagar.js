import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/contasAPagarService'
import * as lancamentosService from '@/services/lancamentosService'
import { useLancamentosStore } from './lancamentos'
import { deleteDocument } from '@/composables/useDocumentAI'

function isOverdue(isoDate) {
  if (!isoDate) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(isoDate + 'T00:00:00') < hoje
}

function mapItem(raw) {
  const situacao = raw.situacao === 'A pagar' && isOverdue(raw.vencimento)
    ? 'Atrasada'
    : raw.situacao

  return {
    id:                  raw.id,
    fornecedor:          raw.fornecedor,
    vencimento:          service.dateToDisplay(raw.vencimento),
    valor:               service.fromCents(raw.valor ?? 0)
                           .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    situacao,
    categoria:           raw.categoria,
    formaPagamento:      raw.forma_pagamento,
    conta_financeira_id: raw.conta_financeira_id,
    lancamento_id:       raw.lancamento_id,
    documento_url:       raw.documento_url ?? null,
    // Campos raw para o fluxo de baixa
    _valorCentavos:      raw.valor ?? 0,
    _vencimentoRaw:      raw.vencimento,
  }
}

export const useContasAPagarStore = defineStore('contasAPagar', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const data = await service.getAll()
      items.value = data.map(mapItem)

      const vencidos = data.filter(r => r.situacao === 'A pagar' && isOverdue(r.vencimento))
      if (vencidos.length) {
        await Promise.all(
          vencidos.flatMap(r => {
            const ops = [service.update(r.id, { situacao: 'Atrasada' })]
            if (r.lancamento_id) ops.push(lancamentosService.update(r.lancamento_id, { situacao: 'Atrasada' }))
            return ops
          })
        )
      }
    } finally {
      loading.value = false
    }
  }

  async function create(formData) {
    const valorCentavos = service.toCents(formData.valor)
    const vencimentoISO = service.dateToISO(formData.vencimento)

    const payload = {
      fornecedor:          formData.fornecedor,
      valor:               valorCentavos,
      data_emissao:        service.dateToISO(formData.dataEmissao),
      competencia:         service.dateToISO(formData.competencia),
      vencimento:          vencimentoISO,
      historico:           formData.historico || null,
      nro_documento:       formData.nroDocumento || null,
      ocorrencia:          formData.ocorrencia,
      frequencia:          formData.frequencia || null,
      parcelas:            formData.parcelas || null,
      forma_pagamento:     formData.formaPagamento || null,
      conta_financeira_id: formData.contaFinanceiraId || null,
      nro_banco:           formData.nroBanco || null,
      categoria:           formData.categoria || null,
      juros_mensal:        formData.jurosMensal || null,
      multa:               formData.multa || null,
      multa_tipo:          formData.multaTipo || null,
      situacao:            'A pagar',
      documento_url:       formData.documentoUrl || null,
    }
    const raw = await service.create(payload)

    // Cria lançamento "A pagar" na Agenda Financeira imediatamente
    const lancamentoRaw = await lancamentosService.create({
      tipo:                'Saída',
      valor:               valorCentavos,
      data:                vencimentoISO,
      descricao:           formData.fornecedor,
      categoria:           formData.categoria || null,
      conta_financeira_id: formData.contaFinanceiraId || null,
      conta_a_pagar_id:    raw.id,
      situacao:            'A pagar',
    })

    // Vincula lancamento_id à conta
    await service.update(raw.id, { lancamento_id: lancamentoRaw.id })
    raw.lancamento_id = lancamentoRaw.id

    const mapped = mapItem(raw)
    items.value.unshift(mapped)

    // Insere na Agenda em tempo real
    const lancamentosStore = useLancamentosStore()
    lancamentosStore.items.unshift({
      id:                  lancamentoRaw.id,
      data:                lancamentosService.dateToDisplay(lancamentoRaw.data),
      descricao:           lancamentoRaw.descricao,
      categoria:           lancamentoRaw.categoria,
      tipo:                lancamentoRaw.tipo,
      valor:               lancamentosService.fromCents(lancamentoRaw.valor ?? 0)
                             .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      situacao:            'A pagar',
      canalVenda:          null,
      conta_financeira_id: lancamentoRaw.conta_financeira_id,
      conta_a_receber_id:  null,
      conta_a_pagar_id:    raw.id,
    })

    return mapped
  }

  async function baixar(id, situacao = 'Paga') {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    // 1. Atualiza situação da conta
    await service.update(id, { situacao })

    const lancamentosStore = useLancamentosStore()

    if (item.lancamento_id) {
      // 2a. Lançamento já existe — apenas atualiza situação
      await lancamentosService.update(item.lancamento_id, { situacao })
      const lancIdx = lancamentosStore.items.findIndex(l => l.id === item.lancamento_id)
      if (lancIdx !== -1) {
        lancamentosStore.items[lancIdx] = { ...lancamentosStore.items[lancIdx], situacao }
      }
    } else {
      // 2b. Fallback: cria lançamento (contas antigas sem lancamento_id)
      const lancamentoRaw = await lancamentosService.create({
        tipo:                'Saída',
        valor:               item._valorCentavos,
        data:                item._vencimentoRaw,
        descricao:           item.fornecedor,
        categoria:           item.categoria ?? null,
        conta_financeira_id: item.conta_financeira_id ?? null,
        conta_a_pagar_id:    id,
        situacao,
      })
      await service.update(id, { lancamento_id: lancamentoRaw.id })
      lancamentosStore.items.unshift({
        id:                  lancamentoRaw.id,
        data:                lancamentosService.dateToDisplay(lancamentoRaw.data),
        descricao:           lancamentoRaw.descricao,
        categoria:           lancamentoRaw.categoria,
        tipo:                lancamentoRaw.tipo,
        valor:               lancamentosService.fromCents(lancamentoRaw.valor ?? 0)
                               .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        situacao,
        canalVenda:          null,
        conta_financeira_id: lancamentoRaw.conta_financeira_id,
        conta_a_receber_id:  null,
        conta_a_pagar_id:    id,
      })
      item.lancamento_id = lancamentoRaw.id
    }

    // 3. Atualiza store local
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], situacao }
    }
  }

  async function update(id, formData) {
    const valorCentavos = service.toCents(formData.valor)
    const vencimentoISO = service.dateToISO(formData.vencimento)

    const payload = {
      fornecedor:          formData.fornecedor,
      valor:               valorCentavos,
      data_emissao:        service.dateToISO(formData.dataEmissao),
      competencia:         service.dateToISO(formData.competencia),
      vencimento:          vencimentoISO,
      historico:           formData.historico || null,
      nro_documento:       formData.nroDocumento || null,
      ocorrencia:          formData.ocorrencia,
      frequencia:          formData.frequencia || null,
      parcelas:            formData.parcelas || null,
      forma_pagamento:     formData.formaPagamento || null,
      conta_financeira_id: formData.contaFinanceiraId || null,
      nro_banco:           formData.nroBanco || null,
      categoria:           formData.categoria || null,
      juros_mensal:        formData.jurosMensal || null,
      multa:               formData.multa || null,
      multa_tipo:          formData.multaTipo || null,
    }
    const raw = await service.update(id, payload)
    const mapped = mapItem(raw)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = mapped
    return mapped
  }

  async function remove(id) {
    const item = items.value.find(i => i.id === id)
    // Remove o lançamento vinculado antes de deletar a conta (evita violação de FK)
    if (item?.lancamento_id) {
      await lancamentosService.remove(item.lancamento_id)
      const lancamentosStore = useLancamentosStore()
      lancamentosStore.items = lancamentosStore.items.filter(l => l.id !== item.lancamento_id)
    }
    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  /** Cria conta com situacao='Para Aprovação' sem gerar lançamento. */
  async function createParaAprovacao(dados, documentoUrl) {
    const today = new Date().toISOString().split('T')[0]
    const valorCentavos = service.toCents(dados.valor ?? 0)
    // Se vencimento vier null do AI, usa 7 dias a partir de hoje
    let vencimento = dados.vencimento ?? null
    if (!vencimento) {
      const d = new Date(); d.setDate(d.getDate() + 7)
      vencimento = d.toISOString().split('T')[0]
    }

    const payload = {
      fornecedor:    dados.fornecedor ?? 'Desconhecido',
      valor:         valorCentavos,
      vencimento,
      data_emissao:  today,
      competencia:   today,
      historico:     dados.historico || null,
      nro_documento: dados.nro_documento || null,
      ocorrencia:    'Única',
      situacao:      'Para Aprovação',
      documento_url: documentoUrl || null,
    }

    const raw = await service.create(payload)
    const mapped = mapItem(raw)
    items.value.unshift(mapped)
    return mapped
  }

  /** Aprova uma conta 'Para Aprovação': muda para 'A pagar' e cria lançamento. */
  async function aprovar(id) {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    await service.update(id, { situacao: 'A pagar' })

    const lancamentoRaw = await lancamentosService.create({
      tipo:                'Saída',
      valor:               item._valorCentavos,
      data:                item._vencimentoRaw,
      descricao:           item.fornecedor,
      categoria:           item.categoria ?? null,
      conta_financeira_id: item.conta_financeira_id ?? null,
      conta_a_pagar_id:    id,
      situacao:            'A pagar',
    })

    await service.update(id, { lancamento_id: lancamentoRaw.id })

    const lancamentosStore = useLancamentosStore()
    lancamentosStore.items.unshift({
      id:                  lancamentoRaw.id,
      data:                lancamentosService.dateToDisplay(lancamentoRaw.data),
      descricao:           lancamentoRaw.descricao,
      categoria:           lancamentoRaw.categoria,
      tipo:                lancamentoRaw.tipo,
      valor:               lancamentosService.fromCents(lancamentoRaw.valor ?? 0)
                             .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      situacao:            'A pagar',
      canalVenda:          null,
      conta_financeira_id: lancamentoRaw.conta_financeira_id,
      conta_a_receber_id:  null,
      conta_a_pagar_id:    id,
    })

    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], situacao: 'A pagar', lancamento_id: lancamentoRaw.id }
    }
  }

  /** Rejeita e remove uma conta 'Para Aprovação' (deleta arquivo e registro). */
  async function rejeitar(id) {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    // Remove o arquivo do storage se houver
    if (item.documento_url) {
      try { await deleteDocument(item.documento_url) } catch (_) { /* ignora erros de storage */ }
    }

    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function cancelarPagamento(id) {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const [d, m, y] = item.vencimento.split('/')
    const venc = new Date(+y, +m - 1, +d)
    const novoStatus = venc < hoje ? 'Atrasada' : 'A pagar'

    await service.update(id, { situacao: novoStatus })

    const lancamentosStore = useLancamentosStore()
    if (item.lancamento_id) {
      await lancamentosService.update(item.lancamento_id, { situacao: novoStatus })
      const lancIdx = lancamentosStore.items.findIndex(l => l.id === item.lancamento_id)
      if (lancIdx !== -1) {
        lancamentosStore.items[lancIdx] = { ...lancamentosStore.items[lancIdx], situacao: novoStatus }
      }
    }

    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], situacao: novoStatus }
    }

    return novoStatus
  }

  return { items, loading, fetchAll, create, update, baixar, cancelarPagamento, remove, createParaAprovacao, aprovar, rejeitar }
})
