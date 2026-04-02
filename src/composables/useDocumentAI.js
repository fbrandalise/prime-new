import { supabase } from '@/lib/supabase'

/**
 * Converte um File para string base64 (sem o prefixo data URL).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Envia o documento para a edge function process-document (Gemini).
 * Retorna: { fornecedor, valor, vencimento, nro_documento, historico }
 */
export async function processDocument(file) {
  const fileBase64 = await fileToBase64(file)

  const { data, error } = await supabase.functions.invoke('process-document', {
    body: { fileBase64, mimeType: file.type },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

/**
 * Faz upload do arquivo para o bucket documentos-financeiros.
 * Retorna a URL pública do arquivo.
 */
export async function uploadDocument(file) {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('documentos-financeiros')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('documentos-financeiros')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Remove arquivo do storage dado o URL público.
 */
export async function deleteDocument(publicUrl) {
  if (!publicUrl) return
  const parts = publicUrl.split('/documentos-financeiros/')
  if (parts.length < 2) return
  const path = parts[1]
  await supabase.storage.from('documentos-financeiros').remove([path])
}
