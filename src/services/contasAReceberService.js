import { supabase } from '@/lib/supabase'
import {
  ensureDemoContasCache,
  getDemoRawById,
  demoMutateRow,
  demoRemoveRow,
  demoPrependRow,
  DEMO_CONTAS_COUNT,
} from '@/data/contasReceberDemoData.js'

const TABLE = 'contas_a_receber'

/**
 * Lista com 400 itens demo em memória.
 * Dev: ligado por padrão. `.env`: `VITE_CONTAS_RECEBER_DEMO=false` → Supabase.
 * Produção: só com `VITE_CONTAS_RECEBER_DEMO=true`.
 */
export function isContasReceberDemoMode() {
  const v = import.meta.env.VITE_CONTAS_RECEBER_DEMO
  if (v === 'false') return false
  if (v === 'true') return true
  return import.meta.env.DEV
}

export const toCents      = (v) => Math.round((v ?? 0) * 100)
export const fromCents    = (n) => (n ?? 0) / 100
export const dateToISO    = (d) => d instanceof Date ? d.toISOString().split('T')[0] : (d ?? null)
export const dateToDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export async function getById(id) {
  if (isContasReceberDemoMode()) {
    ensureDemoContasCache(DEMO_CONTAS_COUNT)
    const row = getDemoRawById(id)
    if (!row) throw new Error('Conta não encontrada')
    return { ...row }
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getAll() {
  if (isContasReceberDemoMode()) {
    const rows = ensureDemoContasCache(DEMO_CONTAS_COUNT)
    return [...rows].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('vencimento', { ascending: true })
  if (error) throw error
  return data
}

export async function create(payload) {
  if (isContasReceberDemoMode()) {
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const row = { id, ...payload, lancamento_id: payload.lancamento_id ?? null }
    demoPrependRow(row)
    return { ...row }
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function update(id, payload) {
  if (isContasReceberDemoMode()) {
    ensureDemoContasCache(DEMO_CONTAS_COUNT)
    const updated = demoMutateRow(id, payload)
    if (!updated) throw new Error('Conta não encontrada')
    return updated
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function remove(id) {
  if (isContasReceberDemoMode()) {
    demoRemoveRow(id)
    return
  }
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
  if (error) throw error
}
