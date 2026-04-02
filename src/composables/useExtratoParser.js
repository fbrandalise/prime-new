/**
 * Parser de extrato bancário — suporta OFX (SGML e XML) e CSV.
 * Retorna Array<{ data: Date, descricao: string, valor: number (centavos), tipo: 'Crédito'|'Débito' }>
 */

export function parseExtrato(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const ext = file.name.split('.').pop().toLowerCase()
        if (ext === 'ofx') {
          resolve(parseOFX(text))
        } else {
          resolve(parseCSV(text))
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    // latin1 para compatibilidade com OFX brasileiro
    reader.readAsText(file, 'latin1')
  })
}

// ── OFX ───────────────────────────────────────────────────────────────────────

function parseOFX(text) {
  // Tenta XML primeiro (tags fechadas)
  const xmlItems = parseOFXXML(text)
  if (xmlItems.length > 0) return xmlItems
  // Fallback SGML (sem tags de fechamento)
  return parseOFXSGML(text)
}

function parseOFXXML(text) {
  const items = []
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  for (const match of text.matchAll(regex)) {
    const block = match[1]
    const item = extractOFXBlock(block, (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<]+)`, 'i'))
      return m ? m[1].trim() : null
    })
    if (item) items.push(item)
  }
  return items
}

function parseOFXSGML(text) {
  const items = []
  const parts = text.split(/<STMTTRN>/i)
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const item = extractOFXBlock(block, (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^\\r\\n<]+)`, 'i'))
      return m ? m[1].trim() : null
    })
    if (item) items.push(item)
  }
  return items
}

function extractOFXBlock(block, getTag) {
  const dtposted = getTag('DTPOSTED')
  const trnamt   = getTag('TRNAMT')
  const memo     = getTag('MEMO') || getTag('NAME') || ''
  if (!dtposted || !trnamt) return null

  const date = parseOFXDate(dtposted)
  if (!date) return null

  const amountRaw = parseFloat(trnamt.replace(',', '.'))
  const valor = Math.round(Math.abs(amountRaw) * 100)
  const tipo  = amountRaw >= 0 ? 'Crédito' : 'Débito'

  return { data: date, descricao: decodeOFXStr(memo).trim(), valor, tipo }
}

function parseOFXDate(s) {
  // Formato: YYYYMMDD[HHMMSS...]
  if (!s || s.length < 8) return null
  const y = parseInt(s.substring(0, 4))
  const m = parseInt(s.substring(4, 6))
  const d = parseInt(s.substring(6, 8))
  return new Date(y, m - 1, d)
}

function decodeOFXStr(s) {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase())

  const dataIdx   = headers.findIndex(h => /^data/.test(h) || h === 'date')
  const descIdx   = headers.findIndex(h => /desc|memo|hist|lancamento/.test(h))
  const valorIdx  = headers.findIndex(h => /^valor$/.test(h) || h === 'amount' || h === 'value')
  const entIdx    = headers.findIndex(h => /entrada|cr[eé]dito|credit/.test(h))
  const saidaIdx  = headers.findIndex(h => /sa[íi]da|d[eé]bito|debit/.test(h))

  if (dataIdx === -1) return []

  const items = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCsvLine(line, sep)
    const dataStr = cols[dataIdx]?.replace(/"/g, '').trim()
    const descStr = descIdx !== -1 ? cols[descIdx]?.replace(/"/g, '').trim() : ''

    let amountRaw = 0
    let tipo = 'Crédito'

    if (entIdx !== -1 || saidaIdx !== -1) {
      const entrada = entIdx   !== -1 ? parseValorBR(cols[entIdx]?.replace(/"/g, '').trim())   : 0
      const saida   = saidaIdx !== -1 ? parseValorBR(cols[saidaIdx]?.replace(/"/g, '').trim()) : 0
      if (saida > 0) {
        amountRaw = -saida
        tipo = 'Débito'
      } else {
        amountRaw = entrada
        tipo = 'Crédito'
      }
    } else if (valorIdx !== -1) {
      amountRaw = parseValorBR(cols[valorIdx]?.replace(/"/g, '').trim())
      tipo = amountRaw >= 0 ? 'Crédito' : 'Débito'
    }

    const date = parseCSVDate(dataStr)
    if (!date) continue

    const valor = Math.round(Math.abs(amountRaw) * 100)
    if (valor === 0) continue

    items.push({ data: date, descricao: descStr || '', valor, tipo })
  }

  return items
}

function parseCsvLine(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseValorBR(str) {
  if (!str) return 0
  let s = str.replace(/\s/g, '')
  const neg = s.startsWith('-')
  s = s.replace(/^[+-]/, '')

  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    s = parts[1]?.length <= 2 ? s.replace(',', '.') : s.replace(',', '')
  }

  const val = parseFloat(s) || 0
  return neg ? -val : val
}

function parseCSVDate(str) {
  if (!str) return null
  let m
  m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1])
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1])
  return null
}
