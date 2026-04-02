import { supabase } from '@/lib/supabase'

const TABLE = 'fornecedores'

export async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('nome', { ascending: true })
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
