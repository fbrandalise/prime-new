<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useContasAReceberAI } from '@/composables/useContasAReceberAI'

const props = defineProps({
  visible: { type: Boolean, default: false },
  contas:  { type: Array,   default: () => [] },
})
const emit = defineEmits(['close'])

const { loading: aiLoading, send: aiSend, hasApiKey } = useContasAReceberAI()

// ── Insights automáticos (regras) ─────────────────────────────────────────────
const insights = computed(() => {
  const result = []
  const data   = props.contas
  if (!data.length) return result

  const total        = data.length
  const atrasadas    = data.filter(c => c.situacao === 'Atrasada')
  const overdueRate  = total > 0 ? (atrasadas.length / total * 100) : 0
  const sumAtrasadas = atrasadas.reduce((s, c) => s + (c._valorCentavos ?? 0) / 100, 0)

  // 1. Taxa de inadimplência
  if (overdueRate >= 40) {
    result.push({ type: 'danger',  icon: 'pi pi-exclamation-circle',  title: 'Inadimplência crítica',     body: `${overdueRate.toFixed(0)}% das contas (${atrasadas.length} de ${total}) estão em atraso.` })
  } else if (overdueRate >= 15) {
    result.push({ type: 'warning', icon: 'pi pi-exclamation-triangle', title: 'Inadimplência elevada',     body: `${overdueRate.toFixed(0)}% das contas em atraso — acima da faixa saudável (< 15%).` })
  } else if (atrasadas.length > 0) {
    result.push({ type: 'success', icon: 'pi pi-check-circle',         title: 'Inadimplência controlada', body: `Apenas ${overdueRate.toFixed(1)}% em atraso — dentro da faixa saudável.` })
  } else {
    result.push({ type: 'success', icon: 'pi pi-check-circle',         title: 'Sem inadimplência',        body: 'Nenhuma conta em atraso no período filtrado.' })
  }

  // 2. Concentração de risco
  const clientMap   = {}
  atrasadas.forEach(c => { clientMap[c.cliente] = (clientMap[c.cliente] ?? 0) + (c._valorCentavos ?? 0) / 100 })
  const topOverdue  = Object.entries(clientMap).sort(([, a], [, b]) => b - a).slice(0, 3)
  const top3Sum     = topOverdue.reduce((s, [, v]) => s + v, 0)

  if (sumAtrasadas > 0 && topOverdue.length > 0) {
    const concentration = top3Sum / sumAtrasadas * 100
    if (concentration >= 65) {
      result.push({ type: 'warning', icon: 'pi pi-users', title: 'Risco concentrado', body: `${topOverdue.length} cliente(s) representam ${concentration.toFixed(0)}% do valor em atraso: ${topOverdue.map(([c]) => c).join(', ')}.` })
    }
  }

  // 3. Conta mais antiga em atraso
  if (atrasadas.length > 0) {
    const oldest = atrasadas.reduce((min, c) => {
      const a = c._vencimentoRaw ?? '', b = min._vencimentoRaw ?? ''
      return a && a < b ? c : min
    })
    if (oldest._vencimentoRaw) {
      const daysOld = Math.floor((Date.now() - new Date(oldest._vencimentoRaw + 'T00:00:00')) / 86400000)
      if (daysOld >= 30) {
        result.push({ type: 'danger', icon: 'pi pi-clock', title: `Conta vencida há ${daysOld} dias`, body: `${oldest.cliente} — ${oldest.valor}, vencida em ${oldest.vencimento}.` })
      }
    }
  }

  // 4. Concentração em forma de pagamento
  if (total >= 5) {
    const fCount = {}
    data.forEach(c => { const f = c.formaPagamento ?? 'Não informado'; fCount[f] = (fCount[f] ?? 0) + 1 })
    const dominant = Object.entries(fCount).sort(([, a], [, b]) => b - a)[0]
    if (dominant[1] / total >= 0.80) {
      result.push({ type: 'info', icon: 'pi pi-credit-card', title: 'Alta concentração de pagamento', body: `${(dominant[1] / total * 100).toFixed(0)}% das contas são via ${dominant[0]}. Diversificar pode reduzir risco operacional.` })
    }
  }

  return result
})

// ── IA Q&A ────────────────────────────────────────────────────────────────────
const messages     = ref([])
const inputText    = ref('')
const msgContainer = ref(null)

const SUGGESTIONS = [
  'Quais clientes representam maior risco de inadimplência?',
  'Como está a tendência de recebimentos no período?',
  'O que devo fazer com as contas atrasadas mais antigas?',
  'Quais formas de pagamento têm maior índice de atraso?',
]

const hasMessages = computed(() => messages.value.length > 0)

const sendMessage = async (text) => {
  const q = (text ?? inputText.value).trim()
  if (!q || aiLoading.value) return
  messages.value.push({ role: 'user', content: q })
  inputText.value = ''
  await nextTick()
  scrollToBottom()
  try {
    const answer = await aiSend(q, props.contas)
    messages.value.push({ role: 'assistant', content: answer })
  } catch (e) {
    messages.value.push({ role: 'error', content: e.message })
  }
  await nextTick()
  scrollToBottom()
}

const scrollToBottom = () => {
  if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
}

const clearChat = () => { messages.value = [] }

// ── Markdown inline formatting ────────────────────────────────────────────────
function formatMessage(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n')
    .map(line =>
      line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
    )
    .join('<br>')
}
</script>

<template>
  <Transition name="ip-slide">
    <aside v-if="visible" class="ip-panel" aria-label="Painel de Insights e IA">

      <!-- Header -->
      <div class="ip-header">
        <div class="ip-header-left">
          <i class="pi pi-sparkles ip-header-icon" />
          <span class="ip-header-title">Insights & IA</span>
        </div>
        <Button icon="pi pi-times" variant="text" size="small" rounded severity="secondary" aria-label="Fechar" @click="emit('close')" />
      </div>

      <div class="ip-body">

        <!-- ── Seção 1: Insights automáticos ───────────────────────────── -->
        <section class="ip-section">
          <div class="ip-section-title">
            <i class="pi pi-lightbulb" />
            Análise automática
          </div>
          <div v-if="!contas.length" class="ip-no-data">
            Nenhum dado no período filtrado.
          </div>
          <ul v-else class="ip-insights">
            <li v-for="(ins, i) in insights" :key="i" class="ip-insight" :class="`ip-insight--${ins.type}`">
              <i :class="[ins.icon, 'ip-insight-icon']" />
              <div class="ip-insight-body">
                <span class="ip-insight-title">{{ ins.title }}</span>
                <span class="ip-insight-text">{{ ins.body }}</span>
              </div>
            </li>
          </ul>
        </section>

        <div class="ip-divider" />

        <!-- ── Seção 2: IA Q&A ──────────────────────────────────────────── -->
        <section class="ip-section ip-section--chat">
          <div class="ip-section-title">
            <i class="pi pi-comments" />
            Perguntar à IA
            <Button v-if="hasMessages" icon="pi pi-trash" variant="text" severity="secondary" size="small" rounded class="ip-clear" v-tooltip.top="'Limpar conversa'" @click="clearChat" />
          </div>

          <!-- No API key -->
          <div v-if="!hasApiKey" class="ip-no-key">
            <i class="pi pi-key ip-no-key-icon" />
            <p>Configure <code>VITE_ANTHROPIC_API_KEY</code> no <code>.env</code> para activar o assistente.</p>
          </div>

          <template v-else>
            <!-- Suggestions -->
            <div v-if="!hasMessages" class="ip-suggestions">
              <p class="ip-suggestions-hint">Perguntas sugeridas:</p>
              <button v-for="s in SUGGESTIONS" :key="s" class="ip-suggestion" @click="sendMessage(s)">{{ s }}</button>
            </div>

            <!-- Messages -->
            <div ref="msgContainer" class="ip-messages">
              <template v-for="(msg, i) in messages" :key="i">
                <div class="ip-msg" :class="`ip-msg--${msg.role}`">
                  <i v-if="msg.role === 'assistant'" class="pi pi-sparkles ip-msg-icon" />
                  <div class="ip-msg-bubble" v-html="msg.role === 'assistant' ? formatMessage(msg.content) : msg.content" />
                </div>
              </template>
              <!-- Typing indicator -->
              <div v-if="aiLoading" class="ip-msg ip-msg--assistant">
                <i class="pi pi-sparkles ip-msg-icon" />
                <div class="ip-msg-bubble ip-typing">
                  <span class="ip-dot" /><span class="ip-dot" /><span class="ip-dot" />
                </div>
              </div>
            </div>

            <!-- Input -->
            <div class="ip-input-row">
              <InputText
                v-model="inputText"
                placeholder="Faça uma pergunta sobre os dados…"
                class="ip-input"
                @keydown.enter.prevent="sendMessage()"
              />
              <Button icon="pi pi-send" :loading="aiLoading" :disabled="!inputText.trim()" size="small" rounded @click="sendMessage()" />
            </div>
          </template>
        </section>

      </div>
    </aside>
  </Transition>
</template>

<style scoped>
/* ── Panel ───────────────────────────────────────────────────────────────────── */
.ip-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 22rem;
  z-index: 150;
  background: var(--p-surface-card);
  border-left: 1px solid var(--p-surface-border);
  box-shadow: -6px 0 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.ip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}
.ip-header-left { display: flex; align-items: center; gap: 0.5rem; }
.ip-header-icon { color: var(--p-primary-color); font-size: 0.9375rem; }
.ip-header-title { font-size: 0.9375rem; font-weight: 700; color: var(--p-text-color); }

/* ── Body ────────────────────────────────────────────────────────────────────── */
.ip-body { flex: 1; overflow-y: auto; scrollbar-gutter: stable; display: flex; flex-direction: column; }

/* ── Sections ────────────────────────────────────────────────────────────────── */
.ip-section { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.ip-section--chat { flex: 1; min-height: 0; }

.ip-section-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
}
.ip-section-title .pi { font-size: 0.75rem; }
.ip-clear { margin-left: auto; }

.ip-divider { height: 1px; background: var(--p-surface-border); flex-shrink: 0; }

/* ── Insights ────────────────────────────────────────────────────────────────── */
.ip-insights { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }

.ip-insight {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.4;
}
.ip-insight--danger  { background: var(--p-red-50,    #fef2f2); border-left: 3px solid var(--p-red-500,    #ef4444); color: var(--p-red-800,    #991b1b); }
.ip-insight--warning { background: var(--p-amber-50,  #fffbeb); border-left: 3px solid var(--p-amber-400, #fbbf24); color: var(--p-amber-800, #92400e); }
.ip-insight--success { background: var(--p-green-50,  #f0fdf4); border-left: 3px solid var(--p-green-500, #22c55e); color: var(--p-green-800, #166534); }
.ip-insight--info    { background: var(--p-blue-50,   #eff6ff); border-left: 3px solid var(--p-blue-400,  #60a5fa); color: var(--p-blue-800,  #1e40af); }

.ip-insight-icon { font-size: 0.875rem; flex-shrink: 0; margin-top: 0.1rem; }

.ip-insight-body { display: flex; flex-direction: column; gap: 0.2rem; }
.ip-insight-title { font-weight: 700; }
.ip-insight-text  { opacity: 0.85; }

.ip-no-data { font-size: 0.8125rem; color: var(--p-text-muted-color); text-align: center; padding: 1.25rem 0; }

/* ── AI Q&A ──────────────────────────────────────────────────────────────────── */
.ip-no-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
.ip-no-key-icon { font-size: 1.5rem; opacity: 0.4; }
.ip-no-key code { font-family: monospace; font-size: 0.75rem; background: var(--p-surface-100); padding: 0.1em 0.3em; border-radius: 3px; }

.ip-suggestions { display: flex; flex-direction: column; gap: 0.375rem; }
.ip-suggestions-hint { font-size: 0.75rem; color: var(--p-text-muted-color); margin: 0 0 0.25rem; }
.ip-suggestion {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  background: var(--p-surface-ground);
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  font-family: inherit;
  line-height: 1.4;
  transition: background 0.12s;
}
.ip-suggestion:hover { background: var(--p-surface-hover); }

.ip-messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  max-height: 320px;
  scrollbar-gutter: stable;
  padding-right: 0.125rem;
}

.ip-msg { display: flex; align-items: flex-start; gap: 0.5rem; }
.ip-msg--user      { flex-direction: row-reverse; }
.ip-msg--error     { flex-direction: row; }
.ip-msg-icon       { font-size: 0.8125rem; color: var(--p-primary-color); margin-top: 0.3rem; flex-shrink: 0; }

.ip-msg-bubble {
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  max-width: 88%;
  word-break: break-word;
}
.ip-msg--user      .ip-msg-bubble { background: var(--p-primary-color); color: #fff; border-bottom-right-radius: 0.25rem; }
.ip-msg--assistant .ip-msg-bubble { background: var(--p-surface-ground); color: var(--p-text-color); border-bottom-left-radius: 0.25rem; }
.ip-msg--error     .ip-msg-bubble { background: var(--p-red-50, #fef2f2); color: var(--p-red-700, #b91c1c); font-size: 0.75rem; }

/* Code blocks inside assistant messages */
:deep(code) { font-family: monospace; font-size: 0.75rem; background: var(--p-surface-200, #e2e8f0); padding: 0.1em 0.3em; border-radius: 3px; }
:deep(strong) { font-weight: 700; }

/* Typing dots */
.ip-typing { display: flex; align-items: center; gap: 0.25rem; padding: 0.75rem 1rem; }
.ip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--p-text-muted-color);
  animation: ip-bounce 1.2s infinite ease-in-out;
}
.ip-dot:nth-child(2) { animation-delay: 0.2s; }
.ip-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes ip-bounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
  40%           { transform: translateY(-5px); opacity: 1;   }
}

.ip-input-row { display: flex; gap: 0.375rem; align-items: center; padding-top: 0.5rem; }
.ip-input { flex: 1; font-size: 0.875rem; }

/* ── Transition ───────────────────────────────────────────────────────────────── */
.ip-slide-enter-active,
.ip-slide-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.ip-slide-enter-from,
.ip-slide-leave-to { transform: translateX(100%); }
</style>
