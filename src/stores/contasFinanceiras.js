import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as service from '@/services/contasFinanceirasService'
import { useLancamentosStore } from './lancamentos'

// Mapeia tipo do DB para lowercase usado no template
const TIPO_TO_DISPLAY = {
  'Banco':            'banco',
  'Carteira virtual': 'carteira',
  'Caixa':            'caixa',
  'Outro':            'outro',
}

// Mapeia valor do SelectButton (form) de volta para o DB
const TIPO_TO_DB = {
  'Banco':            'Banco',
  'Carteira virtual': 'Carteira virtual',
  'Caixa':            'Caixa',
  'Outro':            'Outro',
}

function mapItem(raw) {
  return {
    id:               raw.id,
    nome:             raw.nome,
    tipo:             TIPO_TO_DISPLAY[raw.tipo] ?? 'outro',
    banco:            raw.banco,
    agencia:          raw.agencia,
    conta:            raw.conta,
    saldo:            service.fromCents(raw.saldo_inicial ?? 0),
    saldoInicial:     service.fromCents(raw.saldo_inicial ?? 0),
    entradasPrevistas: 0,
    saidasPrevistas:   0,
    ativo:            raw.ativo,
  }
}

export const useContasFinanceirasStore = defineStore('contasFinanceiras', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const data = await service.getAll()
      items.value = data.map(mapItem)
    } finally {
      loading.value = false
    }
  }

  async function create(formData) {
    const payload = {
      nome:         formData.nome,
      tipo:         TIPO_TO_DB[formData.tipo] ?? formData.tipo,
      banco:        formData.banco ?? null,
      agencia:      formData.agencia || null,
      conta:        formData.conta || null,
      digito_conta: formData.digitoConta || null,
      saldo_inicial: service.toCents(formData.saldoInicial),
    }
    const raw    = await service.create(payload)
    const mapped = mapItem(raw)
    items.value.push(mapped)
    return mapped
  }

  async function remove(id) {
    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  const parseValor = (str) => {
    if (typeof str === 'number') return str
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }

  const SITUACOES_LIQUIDADAS = new Set(['Recebida', 'Paga', 'Antecipada'])
  const SITUACOES_PENDENTES  = new Set(['A receber', 'A pagar', 'Atrasada'])

  const enrichedItems = computed(() => {
    const lancStore = useLancamentosStore()
    const byContaMap = lancStore.byContaFinanceira

    return items.value.map(conta => {
      const lancs = byContaMap.get(conta.id) ?? []
      let entLiq = 0, saiLiq = 0, entPrev = 0, saiPrev = 0

      lancs.forEach(l => {
        const v = parseValor(l.valor)
        if (SITUACOES_LIQUIDADAS.has(l.situacao)) {
          if (l.tipo === 'Entrada') entLiq += v
          else saiLiq += v
        } else if (SITUACOES_PENDENTES.has(l.situacao)) {
          if (l.tipo === 'Entrada') entPrev += v
          else saiPrev += v
        }
      })

      return {
        ...conta,
        saldo: conta.saldoInicial + entLiq - saiLiq,
        entradasPrevistas: entPrev,
        saidasPrevistas: saiPrev,
      }
    })
  })

  return { items, loading, fetchAll, create, remove, enrichedItems }
})
