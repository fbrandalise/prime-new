// Opções de período para views retrospectivas (Contas a Receber, Contas a Pagar)
export const PERIODO_OPTIONS = [
  { label: 'Este mês', value: 'mes' },
  { label: '7 dias',   value: '7d'  },
  { label: '15 dias',  value: '15d' },
  { label: '30 dias',  value: '30d' },
  { label: '3 meses',  value: '3m'  },
]

// Opções de período para a Agenda Financeira e Contas a Receber (prospectivo)
export const PERIODO_OPTIONS_AGENDA = [
  { label: 'Próximos 7d',  value: 'next7d'  },
  { label: 'Próximos 30d', value: 'next30d' },
  { label: 'Próximos 3m',  value: 'next3m'  },
]

// Opções de período para Contas a Pagar (misto: retrospectivo + prospectivo)
export const PERIODO_OPTIONS_PAGAR = [
  { label: 'Últ. 30d',  value: '30d'     },
  { label: 'Este mês',  value: 'mes'     },
  { label: 'Próx. 30d', value: 'next30d' },
  { label: 'Próx. 3m',  value: 'next3m'  },
]

/**
 * Retorna { from, to } dado um valor de período.
 * Cobre tanto variantes retrospectivas (mes, 7d, 15d, 30d, 3m)
 * quanto prospectivas (next7d, next30d, next3m) para a Agenda.
 */
export function buildDateRange(period) {
  if (!period) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const endOf = (d) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e }
  const endOfToday = endOf(new Date())

  switch (period) {
    case 'mes': {
      const s = new Date(endOfToday.getFullYear(), endOfToday.getMonth(), 1)
      s.setHours(0, 0, 0, 0)
      const e = new Date(endOfToday.getFullYear(), endOfToday.getMonth() + 1, 0)
      e.setHours(23, 59, 59, 999)
      return { from: s, to: e }
    }
    case '7d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 6)
      return { from: s, to: endOfToday }
    }
    case '15d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 14)
      return { from: s, to: endOfToday }
    }
    case '30d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 29)
      return { from: s, to: endOfToday }
    }
    case '3m': {
      const s = new Date(startOfToday); s.setMonth(s.getMonth() - 3)
      return { from: s, to: endOfToday }
    }
    // Prospectivos — usados pela Agenda Financeira
    case 'next7d': {
      const to = new Date(startOfToday); to.setDate(to.getDate() + 7)
      return { from: startOfToday, to: endOf(to) }
    }
    case 'next30d': {
      const to = new Date(startOfToday); to.setDate(to.getDate() + 30)
      return { from: startOfToday, to: endOf(to) }
    }
    case 'next3m': {
      const to = new Date(startOfToday); to.setMonth(to.getMonth() + 3)
      return { from: startOfToday, to: endOf(to) }
    }
    default:
      return null
  }
}

/**
 * Períodos do filtro de data estilo CAR (popover com presets).
 * Retorna { from, to } em horário local (início/fim do dia).
 */
export function buildContasReceberCarDateRange(period) {
  if (!period) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOf = (d) => {
    const e = new Date(d)
    e.setHours(23, 59, 59, 999)
    return e
  }
  const endOfToday = endOf(new Date())

  const mondayStart = (ref) => {
    const d = new Date(ref)
    d.setHours(0, 0, 0, 0)
    const dow = d.getDay()
    const monOffset = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + monOffset)
    return d
  }
  const sundayEnd = (monday) => {
    const e = new Date(monday)
    e.setDate(monday.getDate() + 6)
    return endOf(e)
  }

  switch (period) {
    case 'hoje':
      return { from: new Date(startOfToday), to: endOfToday }
    case 'estaSemana': {
      const mon = mondayStart(startOfToday)
      return { from: mon, to: sundayEnd(mon) }
    }
    case 'semanaPassada': {
      const thisMon = mondayStart(startOfToday)
      const prevMon = new Date(thisMon)
      prevMon.setDate(prevMon.getDate() - 7)
      return { from: prevMon, to: sundayEnd(prevMon) }
    }
    case 'mes': {
      const s = new Date(endOfToday.getFullYear(), endOfToday.getMonth(), 1)
      s.setHours(0, 0, 0, 0)
      const e = new Date(endOfToday.getFullYear(), endOfToday.getMonth() + 1, 0)
      e.setHours(23, 59, 59, 999)
      return { from: s, to: e }
    }
    case 'mesPassado': {
      const ref = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1)
      const s = new Date(ref.getFullYear(), ref.getMonth(), 1)
      s.setHours(0, 0, 0, 0)
      const e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      e.setHours(23, 59, 59, 999)
      return { from: s, to: e }
    }
    case '30d':
    case 'next30d':
    case 'next3m':
    case '7d':
    case '15d':
    case '3m':
    case 'next7d':
      return buildDateRange(period)
    default:
      return buildDateRange(period)
  }
}

/** True se [from,to] cobre exatamente um mês civil inteiro. */
export function isFullCalendarMonthRange(from, to) {
  if (!from || !to) return false
  const f = new Date(from)
  f.setHours(0, 0, 0, 0)
  const t = new Date(to)
  t.setHours(0, 0, 0, 0)
  const start = new Date(f.getFullYear(), f.getMonth(), 1)
  const end = new Date(f.getFullYear(), f.getMonth() + 1, 0)
  return f.getTime() === start.getTime() && t.getTime() === end.getTime()
}
