import { supabase } from '@/lib/supabase'

const TABLE = 'contas_financeiras'

// ── Helpers de conversão ──────────────────────────────────────────────────────
export const toCents   = (v) => Math.round((v ?? 0) * 100)
export const fromCents = (n) => (n ?? 0) / 100

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: true })
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

export async function remove(id) {
  const { error } = await supabase
    .from(TABLE)
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}
