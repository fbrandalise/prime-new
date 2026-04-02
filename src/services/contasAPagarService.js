import { supabase } from '@/lib/supabase'

const TABLE = 'contas_a_pagar'

// ── Helpers de conversão ──────────────────────────────────────────────────────
export const toCents      = (v) => Math.round((v ?? 0) * 100)
export const fromCents    = (n) => (n ?? 0) / 100
export const dateToISO    = (d) => d instanceof Date ? d.toISOString().split('T')[0] : (d ?? null)
export const dateToDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('vencimento', { ascending: true })
  if (error) throw error
  return data
}

export async function create(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function update(id, payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function remove(id) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
  if (error) throw error
}
