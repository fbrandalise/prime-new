import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

const SUGGESTED_QUESTIONS = {
  'contas': [
    'Quanto tenho a receber este mês?',
    'Quais contas estão atrasadas?',
    'Qual cliente deve mais?',
  ],
  'contas-pagar': [
    'Quanto tenho a pagar esta semana?',
    'Quais contas vencem amanhã?',
    'Qual fornecedor tem mais contas?',
  ],
  'agenda': [
    'Qual o saldo previsto para o fim do mês?',
    'Quais lançamentos estão atrasados?',
    'Resumo do mês',
  ],
  'contas-financeiras': [
    'Qual banco tem maior saldo?',
    'Qual foi o total de saídas este mês?',
    'Fluxo de caixa da semana',
  ],
  'conciliacao': [
    'Quantos itens ainda não foram conciliados?',
    'Qual o total de créditos não conciliados?',
    'Resumo da conciliação',
  ],
  'relatorios': [
    'Qual foi o lucro do mês passado?',
    'Comparar receitas e despesas deste mês',
    'Quais categorias tiveram mais gastos?',
  ],
}

const DEFAULT_QUESTIONS = [
  'Como está meu financeiro?',
  'Resumo geral das finanças',
  'Quais são minhas prioridades?',
]

// Singleton state (shared across components)
const messages = ref([])
const loading = ref(false)
const error = ref(null)

export function useAIChat() {
  const suggestedQuestions = computed(() => (view) => {
    return SUGGESTED_QUESTIONS[view] || DEFAULT_QUESTIONS
  })

  function clearChat() {
    messages.value = []
    error.value = null
  }

  async function sendMessage(text, currentView) {
    if (!text.trim() || loading.value) return

    // Add user message
    messages.value.push({ role: 'user', content: text.trim() })

    // Add placeholder for assistant
    const assistantMsg = { role: 'assistant', content: '', loading: true }
    messages.value.push(assistantMsg)

    loading.value = true
    error.value = null

    try {
      // Build messages for API — exclude the loading placeholder
      const apiMessages = messages.value
        .filter(m => m.content && !m.loading)
        .map(m => ({ role: m.role, content: m.content }))

      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            messages: apiMessages,
            currentView,
          }),
        }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errData.error || `Erro ${res.status}`)
      }

      // Handle SSE streaming
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      assistantMsg.loading = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            // Handle different event types from Claude streaming
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if (delta?.type === 'text_delta' && delta.text) {
                assistantMsg.content += delta.text
              }
            } else if (event.type === 'message_stop') {
              // Message complete
            } else if (event.type === 'error') {
              throw new Error(event.error?.message || 'Erro no streaming')
            }
          } catch (e) {
            // Skip non-JSON lines (like event: types)
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      // Check if response is a clarification
      const content = assistantMsg.content.trim()
      if (content.startsWith('{') && content.includes('"type":"clarification"')) {
        try {
          const clarification = JSON.parse(content)
          if (clarification.type === 'clarification') {
            assistantMsg.clarification = clarification
            assistantMsg.content = '' // hide raw JSON
          }
        } catch {
          // Not valid JSON, keep as regular message
        }
      }
    } catch (err) {
      error.value = err.message
      // Remove the failed assistant message
      const idx = messages.value.indexOf(assistantMsg)
      if (idx !== -1) messages.value.splice(idx, 1)
    } finally {
      loading.value = false
      assistantMsg.loading = false
    }
  }

  return {
    messages,
    loading,
    error,
    suggestedQuestions,
    sendMessage,
    clearChat,
  }
}
