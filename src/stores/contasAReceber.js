import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/contasAReceberService'
import * as lancamentosService from '@/services/lancamentosService'
import { useLancamentosStore } from './lancamentos'

function isOverdue(isoDate) {
  if (!isoDate) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(isoDate + 'T00:00:00') < hoje
}

function mapItem(raw) {
  const situacao = raw.situacao === 'A receber' && isOverdue(raw.vencimento)
    ? 'Atrasada'
    : raw.situacao

  return {
    id:                  raw.id,
    cliente:             raw.cliente,
    vencimento:          service.dateToDisplay(raw.vencimento),
    dataEmissao:         raw.data_emissao ? service.dateToDisplay(raw.data_emissao) : '',
    valor:               service.fromCents(raw.valor ?? 0)
                           .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    situacao,
    categoria:           raw.categoria,
    formaPagamento:      raw.forma_pagamento,
    vendedor:            raw.vendedor,
    nro_documento:       raw.nro_documento ?? null,
    conta_financeira_id: raw.conta_financeira_id,
    lancamento_id:       raw.lancamento_id,
    _valorCentavos:      raw.valor ?? 0,
    _vencimentoRaw:      raw.vencimento,
    _dataEmissaoRaw:     raw.data_emissao ?? null,
  }
}

export const useContasAReceberStore = defineStore('contasAReceber', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll(opts = {}) {
    const skipProgress = opts.skipProgress === true
    if (!skipProgress) loading.value = true
    try {
      const data = await service.getAll()
      items.value = data.map(mapItem)

      if (!service.isContasReceberDemoMode()) {
        const vencidos = data.filter(r => r.situacao === 'A receber' && isOverdue(r.vencimento))
        if (vencidos.length) {
          await Promise.all(
            vencidos.flatMap(r => {
              const ops = [service.update(r.id, { situacao: 'Atrasada' })]
              if (r.lancamento_id) ops.push(lancamentosService.update(r.lancamento_id, { situacao: 'Atrasada' }))
              return ops
            })
          )
        }
      }
    } finally {
      if (!skipProgress) loading.value = false
    }
  }

  async function create(formData) {
    const valorCentavos  = service.toCents(formData.valor)
    const vencimentoISO  = service.dateToISO(formData.vencimento)

    const payload = {
      cliente:             formData.cliente,
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
      vendedor:            formData.vendedor || null,
      juros_mensal:        formData.jurosMensal || null,
      multa:               formData.multa || null,
      multa_tipo:          formData.multaTipo || null,
      anexos:              formData.anexos || [],
      situacao:            'A receber',
    }

    if (service.isContasReceberDemoMode()) {
      const raw = await service.create(payload)
      const mapped = mapItem(raw)
      items.value.unshift(mapped)
      return mapped
    }

    const raw = await service.create(payload)

    // Cria lançamento "A receber" na Agenda Financeira imediatamente
    const lancamentoRaw = await lancamentosService.create({
      tipo:                'Entrada',
      valor:               valorCentavos,
      data:                vencimentoISO,
      descricao:           formData.cliente,
      categoria:           formData.categoria || null,
      conta_financeira_id: formData.contaFinanceiraId || null,
      conta_a_receber_id:  raw.id,
      situacao:            'A receber',
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
      situacao:            'A receber',
      canalVenda:          null,
      conta_financeira_id: lancamentoRaw.conta_financeira_id,
      conta_a_receber_id:  raw.id,
      conta_a_pagar_id:    null,
    })

    return mapped
  }

  async function baixar(id, situacao = 'Recebida') {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    await service.update(id, { situacao })

    if (service.isContasReceberDemoMode()) {
      const idx = items.value.findIndex(i => i.id === id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], situacao }
      return
    }

    const lancamentosStore = useLancamentosStore()

    if (item.lancamento_id) {
      // 2a. Lançamento já existe (criado ao salvar) — apenas atualiza situação
      await lancamentosService.update(item.lancamento_id, { situacao })
      const lancIdx = lancamentosStore.items.findIndex(l => l.id === item.lancamento_id)
      if (lancIdx !== -1) {
        lancamentosStore.items[lancIdx] = { ...lancamentosStore.items[lancIdx], situacao }
      }
    } else {
      // 2b. Fallback: cria lançamento (contas antigas sem lancamento_id)
      const lancamentoRaw = await lancamentosService.create({
        tipo:                'Entrada',
        valor:               item._valorCentavos,
        data:                item._vencimentoRaw,
        descricao:           item.cliente,
        categoria:           item.categoria ?? null,
        conta_financeira_id: item.conta_financeira_id ?? null,
        conta_a_receber_id:  id,
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
        conta_a_receber_id:  id,
        conta_a_pagar_id:    null,
      })
      item.lancamento_id = lancamentoRaw.id
    }

    // 3. Atualiza store local
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], situacao }
    }
  }

  async function cancelarRecebimento(id) {
    const item = items.value.find(i => i.id === id)
    if (!item) return

    // Volta para Atrasada se vencimento já passou, senão A receber
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const [d, m, y] = item.vencimento.split('/')
    const venc = new Date(+y, +m - 1, +d)
    const novoStatus = venc < hoje ? 'Atrasada' : 'A receber'

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

  async function update(id, formData) {
    const valorCentavos = service.toCents(formData.valor)
    const vencimentoISO = service.dateToISO(formData.vencimento)

    const payload = {
      cliente:             formData.cliente,
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
      vendedor:            formData.vendedor || null,
      juros_mensal:        formData.jurosMensal || null,
      multa:               formData.multa || null,
      multa_tipo:          formData.multaTipo || null,
      anexos:              formData.anexos || [],
    }

    const raw = await service.update(id, payload)

    // Sincroniza lançamento vinculado
    const item = items.value.find(i => i.id === id)
    if (item?.lancamento_id) {
      await lancamentosService.update(item.lancamento_id, {
        valor:               valorCentavos,
        data:                vencimentoISO,
        descricao:           formData.cliente,
        categoria:           formData.categoria || null,
        conta_financeira_id: formData.contaFinanceiraId || null,
      })
      const lancamentosStore = useLancamentosStore()
      const lancIdx = lancamentosStore.items.findIndex(l => l.id === item.lancamento_id)
      if (lancIdx !== -1) {
        lancamentosStore.items[lancIdx] = {
          ...lancamentosStore.items[lancIdx],
          data:                lancamentosService.dateToDisplay(vencimentoISO),
          descricao:           formData.cliente,
          categoria:           formData.categoria || null,
          valor:               lancamentosService.fromCents(valorCentavos)
                                 .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          conta_financeira_id: formData.contaFinanceiraId || null,
        }
      }
    }

    // Atualiza store local
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      items.value[idx] = mapItem(raw)
    }
  }

  async function remove(id) {
    const item = items.value.find(i => i.id === id)

    // Remove lançamento vinculado
    if (item?.lancamento_id) {
      await lancamentosService.remove(item.lancamento_id)
      const lancamentosStore = useLancamentosStore()
      lancamentosStore.items = lancamentosStore.items.filter(l => l.id !== item.lancamento_id)
    }

    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function antecipar(ids, { custoTotal }) {
    if (service.isContasReceberDemoMode()) {
      for (const id of ids) {
        await service.update(id, { situacao: 'Antecipada' })
        const idx = items.value.findIndex(i => i.id === id)
        if (idx !== -1) items.value[idx] = { ...items.value[idx], situacao: 'Antecipada' }
      }
      return
    }

    const hoje = new Date().toISOString().split('T')[0]
    const lancamentosStore = useLancamentosStore()

    const mapLan = (raw) => ({
      id:                  raw.id,
      data:                lancamentosService.dateToDisplay(raw.data),
      descricao:           raw.descricao,
      categoria:           raw.categoria,
      tipo:                raw.tipo,
      valor:               lancamentosService.fromCents(raw.valor ?? 0)
                             .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      situacao:            raw.situacao,
      canalVenda:          null,
      conta_financeira_id: raw.conta_financeira_id,
      conta_a_receber_id:  raw.conta_a_receber_id,
      conta_a_pagar_id:    null,
    })

    for (const id of ids) {
      const item = items.value.find(i => i.id === id)
      if (!item) continue

      await service.update(id, { situacao: 'Antecipada' })

      // Se já tem lançamento vinculado (A receber), atualiza situação
      if (item.lancamento_id) {
        await lancamentosService.update(item.lancamento_id, { situacao: 'Antecipada' })
        const lancIdx = lancamentosStore.items.findIndex(l => l.id === item.lancamento_id)
        if (lancIdx !== -1) {
          lancamentosStore.items[lancIdx] = { ...lancamentosStore.items[lancIdx], situacao: 'Antecipada' }
        }
      } else {
        // Fallback: cria lançamento de Entrada
        const lan = await lancamentosService.create({
          tipo:               'Entrada',
          descricao:          `Antecipação: ${item.cliente}`,
          categoria:          item.categoria ?? null,
          valor:              item._valorCentavos,
          data:               hoje,
          conta_a_receber_id: id,
          situacao:           'Antecipada',
        })
        await service.update(id, { lancamento_id: lan.id })
        lancamentosStore.items.unshift(mapLan(lan))
        item.lancamento_id = lan.id
      }

      // Atualiza store local
      const idx = items.value.findIndex(i => i.id === id)
      if (idx !== -1) {
        items.value[idx] = { ...items.value[idx], situacao: 'Antecipada' }
      }
    }

    // 1 lançamento de Saída para o custo total
    const custoLan = await lancamentosService.create({
      tipo:      'Saída',
      descricao: `Custo de antecipação (${ids.length} recebível${ids.length !== 1 ? 'is' : ''})`,
      categoria: 'Despesa financeira',
      valor:     Math.round(custoTotal * 100),
      data:      hoje,
      situacao:  'Recebida',
    })
    lancamentosStore.items.unshift(mapLan(custoLan))
  }

  async function patchField(id, dbField, dbValue) {
    await service.update(id, { [dbField]: dbValue })
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const cur = items.value[idx]
    const fieldMap = {
      cliente:         () => ({ cliente: dbValue }),
      forma_pagamento: () => ({ formaPagamento: dbValue }),
      situacao:        () => ({ situacao: dbValue }),
      vencimento:      () => ({ vencimento: service.dateToDisplay(dbValue), _vencimentoRaw: dbValue }),
    }
    const patch = fieldMap[dbField]?.()
    if (patch) items.value[idx] = { ...cur, ...patch }
  }

  async function bulkUpdate(ids, patch) {
    await Promise.all(ids.map(id => service.update(id, patch)))
    await fetchAll({ skipProgress: true })
  }

  return { items, loading, fetchAll, create, update, baixar, cancelarRecebimento, remove, antecipar, patchField, bulkUpdate }
})
