import { computed } from 'vue'
import { useLancamentosStore } from '@/stores/lancamentos'

/**
 * Estrutura DRE completa conforme CPC 26 / Lei 6.404
 * tipo: 'grupo' | 'item' | 'subtotal' | 'total'
 * sinal: '+' | '-' | '=' | '+/-'
 */
const dreStructure = [
  { id: 'rob', label: 'RECEITA OPERACIONAL BRUTA', tipo: 'grupo', sinal: '+', indent: 0 },
  { id: 'rob_prod', label: '(+) Receita de vendas de produtos', tipo: 'item', sinal: '+', indent: 1 },
  { id: 'rob_merc', label: '(+) Receita de vendas de mercadorias', tipo: 'item', sinal: '+', indent: 1 },
  { id: 'rob_serv', label: '(+) Receita de prestação de serviços', tipo: 'item', sinal: '+', indent: 1 },

  { id: 'ded', label: '(-) DEDUÇÕES DA RECEITA BRUTA', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'ded_dev', label: '(-) Devoluções de vendas', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'ded_abat', label: '(-) Abatimentos', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'ded_imp', label: '(-) Impostos sobre vendas (ICMS, ISS, PIS, COFINS)', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'ded_desc', label: '(-) Descontos incondicionais concedidos', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'rol', label: '(=) RECEITA OPERACIONAL LÍQUIDA', tipo: 'subtotal', sinal: '=', indent: 0 },

  { id: 'cv', label: '(-) CUSTOS DAS VENDAS', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'cv_cmv', label: '(-) Custo das mercadorias vendidas (CMV)', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'cv_cpv', label: '(-) Custo dos produtos vendidos (CPV)', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'cv_csp', label: '(-) Custo dos serviços prestados (CSP)', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'rob_lucro', label: '(=) RESULTADO OPERACIONAL BRUTO (Lucro Bruto)', tipo: 'subtotal', sinal: '=', indent: 0 },

  { id: 'desp_op', label: '(-) DESPESAS OPERACIONAIS', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'desp_vend', label: '(-) Despesas com vendas', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'desp_adm', label: '(-) Despesas administrativas', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'desp_ger', label: '(-) Despesas gerais', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'res_fin', label: '(+/-) RESULTADO FINANCEIRO', tipo: 'grupo', sinal: '+/-', indent: 0 },
  { id: 'desp_fin', label: '(-) Despesas financeiras', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'rec_fin', label: '(+) Receitas financeiras', tipo: 'item', sinal: '+', indent: 1 },

  { id: 'out_desp_op', label: '(-) OUTRAS DESPESAS OPERACIONAIS', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'out_desp', label: '(-) Outras despesas operacionais', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'out_rec', label: '(+) Outras receitas operacionais', tipo: 'item', sinal: '+', indent: 1 },

  { id: 'ebit', label: '(=) RESULTADO OPERACIONAL (EBIT)', tipo: 'subtotal', sinal: '=', indent: 0 },

  { id: 'res_nop', label: '(+/-) RESULTADO NÃO OPERACIONAL', tipo: 'grupo', sinal: '+/-', indent: 0 },
  { id: 'rec_nop', label: '(+) Receitas não operacionais', tipo: 'item', sinal: '+', indent: 1 },
  { id: 'desp_nop', label: '(-) Despesas não operacionais', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'lair', label: '(=) RESULTADO ANTES DO IR E CSLL (LAIR)', tipo: 'subtotal', sinal: '=', indent: 0 },

  { id: 'trib', label: '(-) PROVISÕES PARA TRIBUTOS', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'trib_ir', label: '(-) Provisão para IR', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'trib_csll', label: '(-) Provisão para CSLL', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'res_liq_antes', label: '(=) RESULTADO LÍQUIDO ANTES DAS PARTICIPAÇÕES', tipo: 'subtotal', sinal: '=', indent: 0 },

  { id: 'part', label: '(-) PARTICIPAÇÕES E CONTRIBUIÇÕES', tipo: 'grupo', sinal: '-', indent: 0 },
  { id: 'part_deb', label: '(-) Debêntures', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'part_emp', label: '(-) Empregados', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'part_adm', label: '(-) Administradores', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'part_ben', label: '(-) Partes beneficiárias', tipo: 'item', sinal: '-', indent: 1 },
  { id: 'part_inst', label: '(-) Contribuições para instituições', tipo: 'item', sinal: '-', indent: 1 },

  { id: 'res_liq', label: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', tipo: 'total', sinal: '=', indent: 0 },
]

// ── Mapeamento categoria → linha DRE ───────────────────────────────────────
// Entradas (tipo === 'Entrada')
const categoriaEntradaMap = {
  // 1.1 Receitas de Vendas
  'Vendas de Mercadorias':       'rob_merc',
  'Vendas de Serviços':          'rob_serv',
  // 1.2 Receitas Financeiras
  'Juros Recebidos':             'rec_fin',
  'Descontos Obtidos':           'rec_fin',
  'Rendimentos Financeiros':     'rec_fin',
  'Multas Recebidas':            'rec_fin',
  'Tarifas Recebidas':           'rec_fin',
  // 1.3 Outras Receitas Operacionais
  'Frete Recebido':              'out_rec',
  'Reembolso de Entrega':        'out_rec',
  'Indenizações':                'out_rec',
  'Recebimentos de Empréstimos': 'out_rec',
  'Aportes / Capitalização':     'out_rec',
  'Outras Receitas Eventuais':   'out_rec',
  // 1.4 Outras Receitas Não Operacionais
  'Empréstimos Recebidos':       'rec_nop',
  'Aporte dos Sócios':           'rec_nop',
}

// Saídas (tipo === 'Saída')
const categoriaSaidaMap = {
  // 2.1 Compras e Custos Diretos
  'Compras de Mercadorias':                             'cv_cmv',
  'Matérias-primas e Insumos':                          'cv_cmv',
  'Embalagens e Materiais de Envio':                    'cv_cmv',
  'Serviços de Produção / Industrialização':            'cv_csp',
  'Ferramentas, Equipamentos e Manutenção de Produção': 'cv_cmv',
  'Frete sobre Compras':                                'cv_cmv',
  // 2.2 Logística e Entregas
  'Fretes Pagos':                                       'desp_vend',
  'Transportadoras / Correios / Coletas':               'desp_vend',
  'Logística Reversa (Devoluções e Trocas)':            'desp_vend',
  'Armazenagem / Centros de Distribuição':              'desp_vend',
  // 2.3 Marketing, Vendas e Marketplaces
  'Taxas de Marketplaces (comissão, tarifas por venda)':'desp_vend',
  'Taxas de Intermediação de Canal':                    'desp_vend',
  'Ads Internos de Marketplace':                        'desp_vend',
  'Promoções e Incentivos de Canal':                    'desp_vend',
  'Comissões de Vendedores / Representantes / Afiliados':'desp_vend',
  'Anúncios Externos (Meta, Google, TikTok etc.)':     'desp_vend',
  'Marketing de Performance e Campanhas':               'desp_vend',
  'Ferramentas de Marketing / Automação':               'desp_vend',
  'Materiais Promocionais / Brindes':                   'desp_vend',
  // 2.4 Serviços Operacionais e Tecnologia
  'Plataformas e Assinaturas (ERP, E-commerce, CRM)':  'desp_ger',
  'Ferramentas de Integração':                          'desp_ger',
  'Serviços Terceirizados':                             'desp_ger',
  'Hospedagem / Servidores / Cloud':                    'desp_ger',
  'Aplicativos e Licenças':                             'desp_ger',
  // 2.5 Despesas Administrativas
  'Aluguel':                                            'desp_adm',
  'Condomínio e Manutenção Predial':                    'desp_adm',
  'Água':                                               'desp_adm',
  'Luz':                                                'desp_adm',
  'Internet':                                           'desp_adm',
  'Telefonia':                                          'desp_adm',
  'Limpeza e Conservação':                              'desp_adm',
  'Segurança e Monitoramento':                          'desp_adm',
  'Contabilidade e Serviços Fiscais':                   'desp_adm',
  'Consultorias Administrativas / Financeiras':         'desp_adm',
  'Licenças, Registros e Taxas Empresariais':           'desp_adm',
  // 2.6 Pessoal e Folha
  'Salários':                                           'desp_adm',
  'Pró-labore':                                         'desp_adm',
  'INSS':                                               'desp_adm',
  'FGTS':                                               'desp_adm',
  'GPS':                                                'desp_adm',
  'Benefícios (VR, VA, Transporte, Saúde)':             'desp_adm',
  'Férias / 13º / Adiantamentos':                       'desp_adm',
  'Rescisões':                                          'desp_adm',
  'Treinamentos e Capacitações':                        'desp_adm',
  'Recrutamento e Seleção':                             'desp_adm',
  // 2.7 Despesas Financeiras
  'Tarifas Bancárias':                                  'desp_fin',
  'Taxas de Cartão / Gateway':                          'desp_fin',
  'Encargos de Gateway / Split / Saque':                'desp_fin',
  'Despesas de Antecipação de Recebíveis':              'desp_fin',
  'Juros Pagos':                                        'desp_fin',
  'Multas Pagas':                                       'desp_fin',
  'Tarifas de Boleto / PIX':                            'desp_fin',
  // 2.8 Impostos e Taxas
  'Impostos Federais (DAS, DARF, IRPJ/CSLL)':          'ded_imp',
  'Impostos Estaduais (ICMS, ST)':                      'ded_imp',
  'Impostos Municipais (ISS, Alvará, Fiscalização)':    'ded_imp',
  'Encargos sobre Folha (INSS, FGTS)':                  'ded_imp',
  'Multas e Juros Tributários':                          'ded_imp',
  'Parcelamentos e REFIS':                               'ded_imp',
  'Diferenças e Ajustes de Apuração':                    'ded_imp',
  'Custas e Honorários Fiscais':                         'ded_imp',
  // 2.9 Outras Despesas
  'Reembolsos / Perdas':                                'out_desp',
  'Doações / Patrocínios':                              'out_desp',
  'Ajustes Contábeis':                                  'out_desp',
  'Despesas Eventuais Não Recorrentes':                 'out_desp',
  // 2.9 Outras Despesas Não Operacionais
  'Empréstimos Concedidos':                             'desp_nop',
  'Retirada de Sócios':                                 'desp_nop',
}

// ── Mapa de filhos por linha DRE (para drill-down) ───────────────────────
const dreChildrenMap = (() => {
  const map = {}
  let currentGroup = null
  for (const row of dreStructure) {
    if (row.tipo === 'item') {
      if (currentGroup) {
        if (!map[currentGroup]) map[currentGroup] = []
        map[currentGroup].push(row.id)
      }
    } else {
      currentGroup = row.tipo === 'grupo' ? row.id : null
    }
  }
  // Subtotais e totais — composição acumulada
  map['rol'] = [...(map['rob'] || []), ...(map['ded'] || [])]
  map['cv'] = map['cv'] || []
  map['rob_lucro'] = [...(map['rol'] || []), ...(map['cv'] || [])]
  map['desp_op'] = map['desp_op'] || []
  map['res_fin'] = map['res_fin'] || []
  map['out_desp_op'] = map['out_desp_op'] || []
  map['ebit'] = [...(map['rob_lucro'] || []), ...(map['desp_op'] || []), ...(map['res_fin'] || []), ...(map['out_desp_op'] || [])]
  map['res_nop'] = map['res_nop'] || []
  map['lair'] = [...(map['ebit'] || []), ...(map['res_nop'] || [])]
  map['trib'] = map['trib'] || []
  map['res_liq_antes'] = [...(map['lair'] || []), ...(map['trib'] || [])]
  map['part'] = map['part'] || []
  map['res_liq'] = [...(map['res_liq_antes'] || []), ...(map['part'] || [])]
  return map
})()

/**
 * Retorna o dreId de um lançamento baseado no seu tipo e categoria
 */
export function getLancamentosDreId(lancamento) {
  if (lancamento.tipo === 'Entrada') return categoriaEntradaMap[lancamento.categoria] ?? null
  if (lancamento.tipo === 'Saída') return categoriaSaidaMap[lancamento.categoria] ?? null
  return null
}

export { dreStructure, categoriaEntradaMap, categoriaSaidaMap, dreChildrenMap, toYearMonth, formatBRL }

// ── Helpers ────────────────────────────────────────────────────────────────
/** Converte "1.234,56" → 1234.56 */
function parseValor(str) {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

/** Converte "DD/MM/YYYY" → "YYYY-MM" */
function toYearMonth(dateStr) {
  if (!dateStr || dateStr.length < 10) return null
  const parts = dateStr.split('/')
  return `${parts[2]}-${parts[1]}`
}

function formatBRL(value) {
  if (value === 0 || value === null || value === undefined) return '0,00'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value < 0 ? `-${formatted}` : formatted
}

function getMonthLabel(year, month) {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
}

function generatePeriods(mode, baseDate, span) {
  const periods = []
  const base = baseDate ? new Date(baseDate) : new Date()
  const baseYear = base.getFullYear()
  const baseMonth = base.getMonth()

  if (mode === 'vertical') {
    periods.push({ year: baseYear, month: baseMonth, key: `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}` })
  } else {
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(baseYear, baseMonth - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      periods.push({ year: y, month: m, key: `${y}-${String(m + 1).padStart(2, '0')}` })
    }
  }
  return periods
}

// ── Cálculo dos valores por período ────────────────────────────────────────
function buildItemValues(lancamentos, periods) {
  // Inicializa valores por id e período
  const vals = {}
  for (const row of dreStructure) {
    vals[row.id] = {}
    for (const p of periods) {
      vals[row.id][p.key] = 0
    }
  }

  const periodKeys = new Set(periods.map(p => p.key))

  // Distribui lançamentos nas linhas de item
  for (const l of lancamentos) {
    const ym = toYearMonth(l.data)
    if (!ym || !periodKeys.has(ym)) continue

    const valor = parseValor(l.valor)
    if (valor === 0) continue

    let dreId = null
    if (l.tipo === 'Entrada') {
      dreId = categoriaEntradaMap[l.categoria]
    } else if (l.tipo === 'Saída') {
      dreId = categoriaSaidaMap[l.categoria]
    }

    if (dreId && vals[dreId]) {
      vals[dreId][ym] += valor
    }
  }

  // Calcula grupos e subtotais para cada período
  for (const p of periods) {
    const k = p.key
    const v = (id) => vals[id][k]

    // RECEITA OPERACIONAL BRUTA (soma dos itens)
    vals['rob'][k] = v('rob_prod') + v('rob_merc') + v('rob_serv')

    // DEDUÇÕES DA RECEITA BRUTA (soma dos itens, já são negativos conceitualmente)
    vals['ded'][k] = v('ded_dev') + v('ded_abat') + v('ded_imp') + v('ded_desc')

    // RECEITA OPERACIONAL LÍQUIDA = ROB - Deduções
    vals['rol'][k] = vals['rob'][k] - vals['ded'][k]

    // CUSTOS DAS VENDAS
    vals['cv'][k] = v('cv_cmv') + v('cv_cpv') + v('cv_csp')

    // RESULTADO OPERACIONAL BRUTO (Lucro Bruto) = ROL - Custos
    vals['rob_lucro'][k] = vals['rol'][k] - vals['cv'][k]

    // DESPESAS OPERACIONAIS
    vals['desp_op'][k] = v('desp_vend') + v('desp_adm') + v('desp_ger')

    // RESULTADO FINANCEIRO = Receitas financeiras - Despesas financeiras
    vals['res_fin'][k] = v('rec_fin') - v('desp_fin')

    // OUTRAS DESPESAS OPERACIONAIS = Outras receitas - Outras despesas
    vals['out_desp_op'][k] = v('out_rec') - v('out_desp')

    // EBIT = Lucro Bruto - Desp Operacionais + Resultado Financeiro + Outras
    vals['ebit'][k] = vals['rob_lucro'][k] - vals['desp_op'][k] + vals['res_fin'][k] + vals['out_desp_op'][k]

    // RESULTADO NÃO OPERACIONAL
    vals['res_nop'][k] = v('rec_nop') - v('desp_nop')

    // LAIR = EBIT + Resultado não operacional
    vals['lair'][k] = vals['ebit'][k] + vals['res_nop'][k]

    // PROVISÕES PARA TRIBUTOS
    vals['trib'][k] = v('trib_ir') + v('trib_csll')

    // RESULTADO LÍQUIDO ANTES DAS PARTICIPAÇÕES = LAIR - Tributos
    vals['res_liq_antes'][k] = vals['lair'][k] - vals['trib'][k]

    // PARTICIPAÇÕES E CONTRIBUIÇÕES
    vals['part'][k] = v('part_deb') + v('part_emp') + v('part_adm') + v('part_ben') + v('part_inst')

    // RESULTADO LÍQUIDO DO EXERCÍCIO = Res Líq Antes - Participações
    vals['res_liq'][k] = vals['res_liq_antes'][k] - vals['part'][k]
  }

  return vals
}

export function useDreData(mode, baseDate, span) {
  const lancamentosStore = useLancamentosStore()
  const periods = computed(() => generatePeriods(mode.value, baseDate.value, span.value))

  const dreRows = computed(() => {
    const vals = buildItemValues(lancamentosStore.items, periods.value)

    return dreStructure.map(row => {
      const data = { _id: row.id, descricao: row.label, _tipo: row.tipo, _indent: row.indent }
      for (const p of periods.value) {
        data[p.key] = vals[row.id][p.key]
      }
      if (mode.value === 'vertical') {
        const p = periods.value[0]
        if (p) {
          const rol = vals['rol'][p.key]
          const val = vals[row.id][p.key]
          if (rol !== 0 && val !== 0) {
            data._av = ((val / rol) * 100).toFixed(2).replace('.', ',') + '%'
          } else {
            data._av = '0,00%'
          }
        } else {
          data._av = '0,00%'
        }
      }
      return data
    })
  })

  const dreColumns = computed(() => {
    const cols = [
      {
        field: 'descricao',
        headerName: 'Descrição',
        pinned: 'left',
        minWidth: 380,
        flex: 2,
        sortable: false,
        cellStyle: (params) => {
          const style = { paddingLeft: `${(params.data._indent || 0) * 20 + 12}px` }
          if (['grupo', 'subtotal', 'total'].includes(params.data._tipo)) {
            style.fontWeight = '700'
          }
          return style
        },
      },
    ]

    if (mode.value === 'vertical') {
      const p = periods.value[0]
      if (p) {
        cols.push({
          field: p.key,
          headerName: getMonthLabel(p.year, p.month),
          minWidth: 140,
          flex: 1,
          sortable: false,
          type: 'rightAligned',
          valueFormatter: (params) => formatBRL(params.value),
          cellClassRules: {
            'dre-negative': (params) => params.value < 0,
          },
        })
        cols.push({
          field: '_av',
          headerName: 'AV%',
          minWidth: 90,
          width: 90,
          sortable: false,
          type: 'rightAligned',
        })
      }
    } else {
      for (const p of periods.value) {
        cols.push({
          field: p.key,
          headerName: getMonthLabel(p.year, p.month),
          minWidth: 120,
          flex: 1,
          sortable: false,
          type: 'rightAligned',
          valueFormatter: (params) => formatBRL(params.value),
          cellClassRules: {
            'dre-negative': (params) => params.value < 0,
          },
        })
      }
    }

    return cols
  })

  const getRowClass = (params) => {
    const tipo = params.data?._tipo
    if (tipo === 'grupo') return 'dre-row-grupo'
    if (tipo === 'subtotal') return 'dre-row-subtotal'
    if (tipo === 'total') return 'dre-row-total'
    return ''
  }

  return { dreRows, dreColumns, getRowClass }
}
