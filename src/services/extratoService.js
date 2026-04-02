import { supabase } from '@/lib/supabase'

const TABLE = 'extrato_itens'
const JUNCTION = 'extrato_conciliacoes'

// ── Helpers de conversão ──────────────────────────────────────────────────────
export const toCents       = (v) => Math.round((v ?? 0) * 100)
export const fromCents     = (n) => (n ?? 0) / 100
export const dateToISO     = (d) => d instanceof Date ? d.toISOString().split('T')[0] : (d ?? null)
export const dateToDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── CRUD extrato_itens ───────────────────────────────────────────────────────

export async function getByContaEPeriodo(contaId, from, to) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('conta_financeira_id', contaId)
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: true })
  if (error) throw error
  return data
}

export async function insertMany(itens) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(itens)
    .select()
  if (error) throw error
  return data
}

export async function update(id, payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function remove(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// ── CRUD extrato_conciliacoes (junction table) ───────────────────────────────

export async function getConciliacoesByExtrato(extratoItemId) {
  const { data, error } = await supabase
    .from(JUNCTION)
    .select('*')
    .eq('extrato_item_id', extratoItemId)
  if (error) throw error
  return data
}

export async function getConciliacoesByExtratoIds(extratoItemIds) {
  if (!extratoItemIds.length) return []
  const { data, error } = await supabase
    .from(JUNCTION)
    .select('*')
    .in('extrato_item_id', extratoItemIds)
  if (error) throw error
  return data
}

export async function insertConciliacao(row) {
  const { data, error } = await supabase
    .from(JUNCTION)
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertManyConciliacoes(rows) {
  if (!rows.length) return []
  const { data, error } = await supabase
    .from(JUNCTION)
    .insert(rows)
    .select()
  if (error) throw error
  return data
}

export async function deleteConciliacoesByExtrato(extratoItemId) {
  const { error } = await supabase
    .from(JUNCTION)
    .delete()
    .eq('extrato_item_id', extratoItemId)
  if (error) throw error
}
