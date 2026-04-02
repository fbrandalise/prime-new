<script setup>
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useAIChat } from '../composables/useAIChat.js'
import { useContasAReceberStore } from '../stores/contasAReceber.js'
import { useContasAReceberAI } from '../composables/useContasAReceberAI.js'
import { triggerInsightAction } from '../composables/useInsightActions.js'
import WorkflowsTab from './WorkflowsTab.vue'

const props = defineProps({
  visible: Boolean,
  currentView: String,
})

const emit = defineEmits(['close'])

const { messages, loading, error, suggestedQuestions, sendMessage, clearChat } = useAIChat()

const inputText = ref('')
const messagesContainer = ref(null)

const questions = computed(() => suggestedQuestions.value(props.currentView))
const hasMessages = computed(() => messages.value.length > 0)

// ── Abas ──────────────────────────────────────────────────────────────────────
const activeTab = ref('chat')
const showInsightsTab = computed(() => props.currentView === 'contas')

watch(() => props.currentView, (v) => {
  // Workflows é global; só reseta se estiver em Insights fora da view de contas
  if (v !== 'contas' && activeTab.value === 'insights') activeTab.value = 'chat'
})

// ── Insights: dados ───────────────────────────────────────────────────────────
const contasStore = useContasAReceberStore()
const contas = computed(() => contasStore.items)

// Controle de ações concluídas (por índice do insight)
const doneActions = ref(new Set())

function execAction(insightIdx, action) {
  const key = `${insightIdx}-${action.label}`
  if (action.payload.type === 'ask-ai') {
    sendInsightMessage(action.payload.value)
  } else {
    triggerInsightAction(action.payload)
  }
  doneActions.value = new Set([...doneActions.value, key])
}

// Limpa "concluídos" quando os dados mudam
watch(contas, () => { doneActions.value = new Set() })

const insights = computed(() => {
  const result = []
  const data   = contas.value
  if (!data.length) return result

  const total        = data.length
  const atrasadas    = data.filter(c => c.situacao === 'Atrasada')
  const overdueRate  = total > 0 ? (atrasadas.length / total * 100) : 0
  const sumAtrasadas = atrasadas.reduce((s, c) => s + (c._valorCentavos ?? 0) / 100, 0)

  // 1. Taxa de inadimplência
  if (overdueRate >= 40) {
    result.push({
      type: 'danger', icon: 'pi pi-exclamation-circle',
      title: 'Inadimplência crítica',
      body: `${overdueRate.toFixed(0)}% das contas (${atrasadas.length} de ${total}) estão em atraso.`,
      actions: [
        { label: 'Ver contas atrasadas', icon: 'pi pi-filter', payload: { type: 'filter-situacao', value: ['Atrasada'] } },
        { label: 'Analisar com IA', icon: 'pi pi-sparkles', payload: { type: 'ask-ai', value: 'Quais as prioridades para reduzir a inadimplência crítica atual?' } },
      ],
    })
  } else if (overdueRate >= 15) {
    result.push({
      type: 'warning', icon: 'pi pi-exclamation-triangle',
      title: 'Inadimplência elevada',
      body: `${overdueRate.toFixed(0)}% das contas em atraso — acima da faixa saudável (< 15%).`,
      actions: [
        { label: 'Ver contas atrasadas', icon: 'pi pi-filter', payload: { type: 'filter-situacao', value: ['Atrasada'] } },
        { label: 'Analisar com IA', icon: 'pi pi-sparkles', payload: { type: 'ask-ai', value: 'Como posso reduzir a taxa de inadimplência atual?' } },
      ],
    })
  } else if (atrasadas.length > 0) {
    result.push({
      type: 'success', icon: 'pi pi-check-circle',
      title: 'Inadimplência controlada',
      body: `Apenas ${overdueRate.toFixed(1)}% em atraso — dentro da faixa saudável.`,
      actions: [
        { label: 'Ver contas atrasadas', icon: 'pi pi-filter', payload: { type: 'filter-situacao', value: ['Atrasada'] } },
      ],
    })
  } else {
    result.push({
      type: 'success', icon: 'pi pi-check-circle',
      title: 'Sem inadimplência',
      body: 'Nenhuma conta em atraso no período.',
      actions: [],
    })
  }

  // 2. Concentração de risco
  const clientMap  = {}
  atrasadas.forEach(c => { clientMap[c.cliente] = (clientMap[c.cliente] ?? 0) + (c._valorCentavos ?? 0) / 100 })
  const topOverdue = Object.entries(clientMap).sort(([, a], [, b]) => b - a).slice(0, 3)
  const top3Sum    = topOverdue.reduce((s, [, v]) => s + v, 0)

  if (sumAtrasadas > 0 && topOverdue.length > 0) {
    const concentration = top3Sum / sumAtrasadas * 100
    if (concentration >= 65) {
      result.push({
        type: 'warning', icon: 'pi pi-users',
        title: 'Risco concentrado',
        body: `${topOverdue.length} cliente(s) representam ${concentration.toFixed(0)}% do valor em atraso: ${topOverdue.map(([c]) => c).join(', ')}.`,
        actions: topOverdue.map(([cliente]) => ({
          label: cliente.length > 20 ? cliente.slice(0, 18) + '…' : cliente,
          icon: 'pi pi-search',
          payload: { type: 'search', value: cliente },
        })),
      })
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
        result.push({
          type: 'danger', icon: 'pi pi-clock',
          title: `Conta vencida há ${daysOld} dias`,
          body: `${oldest.cliente} — ${oldest.valor}, vencida em ${oldest.vencimento}.`,
          actions: [
            { label: 'Buscar cliente', icon: 'pi pi-search', payload: { type: 'search', value: oldest.cliente } },
            { label: 'Analisar com IA', icon: 'pi pi-sparkles', payload: { type: 'ask-ai', value: `O que devo fazer com a conta de ${oldest.cliente} vencida há ${daysOld} dias?` } },
          ],
        })
      }
    }
  }

  // 4. Concentração em forma de pagamento
  if (total >= 5) {
    const fCount   = {}
    data.forEach(c => { const f = c.formaPagamento ?? 'Não informado'; fCount[f] = (fCount[f] ?? 0) + 1 })
    const dominant = Object.entries(fCount).sort(([, a], [, b]) => b - a)[0]
    if (dominant[1] / total >= 0.80) {
      result.push({
        type: 'info', icon: 'pi pi-credit-card',
        title: 'Alta concentração de pagamento',
        body: `${(dominant[1] / total * 100).toFixed(0)}% das contas são via ${dominant[0]}. Diversificar pode reduzir risco operacional.`,
        actions: [
          { label: `Filtrar por ${dominant[0]}`, icon: 'pi pi-filter', payload: { type: 'filter-forma', value: dominant[0] } },
          { label: 'Analisar com IA', icon: 'pi pi-sparkles', payload: { type: 'ask-ai', value: `Como diversificar as formas de pagamento além de ${dominant[0]}?` } },
        ],
      })
    }
  }

  return result
})

// ── Insights: IA Q&A ──────────────────────────────────────────────────────────
const { loading: insightLoading, send: insightSend, hasApiKey } = useContasAReceberAI()
const insightMessages  = ref([])
const insightInput     = ref('')
const insightContainer = ref(null)

const SUGGESTIONS = [
  'Quais clientes representam maior risco de inadimplência?',
  'Como está a tendência de recebimentos?',
  'O que fazer com as contas atrasadas mais antigas?',
  'Quais formas de pagamento têm maior índice de atraso?',
]

const hasInsightMessages = computed(() => insightMessages.value.length > 0)

const sendInsightMessage = async (text) => {
  const q = (text ?? insightInput.value).trim()
  if (!q || insightLoading.value) return
  insightMessages.value.push({ role: 'user', content: q })
  insightInput.value = ''
  await nextTick()
  scrollInsights()
  try {
    const answer = await insightSend(q, contas.value)
    insightMessages.value.push({ role: 'assistant', content: answer })
  } catch (e) {
    insightMessages.value.push({ role: 'error', content: e.message })
  }
  await nextTick()
  scrollInsights()
}

const clearInsightChat = () => { insightMessages.value = [] }

const scrollInsights = () => {
  if (insightContainer.value) insightContainer.value.scrollTop = insightContainer.value.scrollHeight
}

// ── Chat handlers ─────────────────────────────────────────────────────────────
function handleSend() {
  if (!inputText.value.trim() || loading.value) return
  sendMessage(inputText.value, props.currentView)
  inputText.value = ''
}

function handleSuggestionClick(q) {
  inputText.value = q
  handleSend()
}

function handleClarificationSelect(msg, option) {
  msg.clarification = null
  msg.content = option
  sendMessage(option, props.currentView)
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleInsightKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendInsightMessage()
  }
}

// ── Markdown formatting ───────────────────────────────────────────────────────
function formatMessage(text) {
  if (!text) return ''

  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const out = []
  let inTable = false
  let tableHeader = false
  let inUl = false
  let inOl = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) { tableHeader = true; continue }

    if (/^\s*\|(.+)\|\s*$/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (inOl) { out.push('</ol>'); inOl = false }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      if (!inTable) {
        out.push('<table>')
        out.push('<thead><tr>' + cells.map(c => `<th>${inlineFormat(c)}</th>`).join('') + '</tr></thead>')
        out.push('<tbody>')
        inTable = true; tableHeader = false; continue
      }
      out.push('<tr>' + cells.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>')
      continue
    }

    if (inTable) { out.push('</tbody></table>'); inTable = false; tableHeader = false }

    if (/^[-_*]{3,}\s*$/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (inOl) { out.push('</ol>'); inOl = false }
      out.push('<hr>'); continue
    }

    if (/^#### (.+)$/.test(line)) { if (inUl) { out.push('</ul>'); inUl = false } if (inOl) { out.push('</ol>'); inOl = false } out.push(`<h5>${inlineFormat(line.slice(5))}</h5>`); continue }
    if (/^### (.+)$/.test(line))  { if (inUl) { out.push('</ul>'); inUl = false } if (inOl) { out.push('</ol>'); inOl = false } out.push(`<h4>${inlineFormat(line.slice(4))}</h4>`); continue }
    if (/^## (.+)$/.test(line))   { if (inUl) { out.push('</ul>'); inUl = false } if (inOl) { out.push('</ol>'); inOl = false } out.push(`<h3>${inlineFormat(line.slice(3))}</h3>`); continue }

    if (/^[-*] (.+)$/.test(line)) { if (inOl) { out.push('</ol>'); inOl = false } if (!inUl) { out.push('<ul>'); inUl = true } out.push(`<li>${inlineFormat(line.replace(/^[-*] /, ''))}</li>`); continue }
    if (/^\d+\.\s+(.+)$/.test(line)) { if (inUl) { out.push('</ul>'); inUl = false } if (!inOl) { out.push('<ol>'); inOl = true } out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ''))}</li>`); continue }

    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }

    if (line.trim() === '') { out.push('<br>') }
    else { out.push(inlineFormat(line) + '<br>') }
  }

  if (inTable) out.push('</tbody></table>')
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')

  let html = out.join('\n')
  html = html.replace(/(<br>\s*)+$/, '')
  return html
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
}

function formatInsightMessage(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n')
    .map(line => line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>'))
    .join('<br>')
}

// ── Resize lateral ────────────────────────────────────────────────────────────
const sidebarWidth = ref(384) // 24rem padrão
const MIN_WIDTH = 280

function getMaxWidth() {
  const leftSidebar = document.querySelector('.app-sidebar')
  const leftW = leftSidebar ? leftSidebar.getBoundingClientRect().width : 0
  return window.innerWidth - leftW - 8 // 8px de margem
}

function startResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startW = sidebarWidth.value
  const maxWidth = getMaxWidth()

  function onMove(ev) {
    const delta = startX - ev.clientX
    sidebarWidth.value = Math.min(maxWidth, Math.max(MIN_WIDTH, startW + delta))
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onUnmounted(() => {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

// Auto-scroll on new chat messages
watch(
  () => messages.value.length > 0 ? messages.value[messages.value.length - 1]?.content : '',
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }
)
</script>

<template>
  <Transition name="chat-slide">
    <aside v-if="visible" class="chat-sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div class="chat-resize-handle" @mousedown="startResize" />

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="chat-header">
        <div class="chat-header-left">
          <i class="pi pi-sparkles chat-header-icon" />
          <span class="chat-header-title">Assistente IA</span>
        </div>
        <div class="chat-header-actions">
          <Button
            v-if="activeTab === 'chat' && hasMessages"
            icon="pi pi-trash"
            variant="text"
            size="small"
            rounded
            severity="secondary"
            aria-label="Limpar conversa"
            @click="clearChat"
          />
          <Button
            v-if="activeTab === 'insights' && hasInsightMessages"
            icon="pi pi-trash"
            variant="text"
            size="small"
            rounded
            severity="secondary"
            aria-label="Limpar conversa de insights"
            v-tooltip.bottom="'Limpar conversa'"
            @click="clearInsightChat"
          />
          <Button
            icon="pi pi-times"
            variant="text"
            size="small"
            rounded
            severity="secondary"
            aria-label="Fechar chat"
            @click="emit('close')"
          />
        </div>
      </div>

      <!-- ── Abas ────────────────────────────────────────────────────────── -->
      <div class="chat-tabs">
        <button
          class="chat-tab"
          :class="{ 'chat-tab--active': activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          <i class="pi pi-comments" />
          Assistente
        </button>
        <button
          v-if="showInsightsTab"
          class="chat-tab"
          :class="{ 'chat-tab--active': activeTab === 'insights' }"
          @click="activeTab = 'insights'"
        >
          <i class="pi pi-lightbulb" />
          Insights
          <span v-if="insights.some(i => i.type === 'danger')" class="chat-tab-badge chat-tab-badge--danger" />
          <span v-else-if="insights.some(i => i.type === 'warning')" class="chat-tab-badge chat-tab-badge--warning" />
        </button>
        <button
          class="chat-tab"
          :class="{ 'chat-tab--active': activeTab === 'workflows' }"
          @click="activeTab = 'workflows'"
        >
          <i class="pi pi-sitemap" />
          Workflows
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- ABA: ASSISTENTE (chat padrão)                                     -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'chat'">
        <div ref="messagesContainer" class="chat-messages">
          <div v-if="!hasMessages" class="chat-welcome">
            <div class="chat-welcome-icon">
              <i class="pi pi-sparkles" />
            </div>
            <p class="chat-welcome-text">
              Olá! Posso ajudar com suas finanças. Pergunte qualquer coisa sobre seus dados.
            </p>
            <div class="chat-suggestions">
              <button
                v-for="q in questions"
                :key="q"
                class="chat-suggestion-chip"
                @click="handleSuggestionClick(q)"
              >
                {{ q }}
              </button>
            </div>
          </div>

          <template v-for="(msg, i) in messages" :key="i">
            <div :class="['chat-msg', `chat-msg--${msg.role}`]">
              <div v-if="msg.role === 'assistant'" class="chat-msg-avatar">
                <i class="pi pi-sparkles" />
              </div>
              <div class="chat-msg-bubble">
                <div v-if="msg.loading" class="chat-msg-loading">
                  <span class="chat-dot" /><span class="chat-dot" /><span class="chat-dot" />
                </div>
                <div v-else-if="msg.clarification" class="chat-clarification">
                  <p class="chat-clarification-q">{{ msg.clarification.question }}</p>
                  <div class="chat-clarification-opts">
                    <button
                      v-for="opt in msg.clarification.options"
                      :key="opt"
                      class="chat-clarification-btn"
                      @click="handleClarificationSelect(msg, opt)"
                    >
                      {{ opt }}
                    </button>
                  </div>
                </div>
                <div v-else class="chat-msg-text" v-html="formatMessage(msg.content)" />
              </div>
            </div>
          </template>
        </div>

        <div v-if="error" class="chat-error">
          <i class="pi pi-exclamation-triangle" />
          <span>{{ error }}</span>
        </div>

        <div class="chat-input-area">
          <div class="chat-input-wrap">
            <textarea
              v-model="inputText"
              class="chat-textarea"
              placeholder="Pergunte sobre suas finanças..."
              rows="1"
              :disabled="loading"
              @keydown="handleKeydown"
            />
            <Button
              icon="pi pi-send"
              rounded
              size="small"
              :disabled="!inputText.trim() || loading"
              :loading="loading"
              aria-label="Enviar"
              class="chat-send-btn"
              @click="handleSend"
            />
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- ABA: INSIGHTS (contas a receber)                                  -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'insights'">
        <div class="chat-insights-body">

          <!-- Análise automática -->
          <section class="ins-section">
            <div class="ins-section-title">
              <i class="pi pi-lightbulb" />
              Análise automática
            </div>

            <div v-if="!contas.length" class="ins-empty">
              Nenhum dado carregado ainda.
            </div>
            <ul v-else class="ins-list">
              <li
                v-for="(ins, i) in insights"
                :key="i"
                class="ins-item"
                :class="`ins-item--${ins.type}`"
              >
                <i :class="[ins.icon, 'ins-icon']" />
                <div class="ins-body">
                  <span class="ins-title">{{ ins.title }}</span>
                  <span class="ins-text">{{ ins.body }}</span>
                  <div v-if="ins.actions?.length" class="ins-actions">
                    <button
                      v-for="act in ins.actions"
                      :key="act.label"
                      class="ins-action-btn"
                      :class="{ 'ins-action-btn--done': doneActions.has(`${i}-${act.label}`) }"
                      @click="execAction(i, act)"
                    >
                      <i :class="doneActions.has(`${i}-${act.label}`) ? 'pi pi-check' : act.icon" />
                      {{ act.label }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <div class="ins-divider" />

          <!-- IA Q&A -->
          <section class="ins-section ins-section--chat">
            <div class="ins-section-title">
              <i class="pi pi-comments" />
              Perguntar à IA
            </div>

            <div v-if="!hasApiKey" class="ins-no-key">
              <i class="pi pi-key ins-no-key-icon" />
              <p>Configure <code>VITE_ANTHROPIC_API_KEY</code> no <code>.env</code> para activar o assistente.</p>
            </div>

            <template v-else>
              <div v-if="!hasInsightMessages" class="ins-suggestions">
                <p class="ins-suggestions-hint">Perguntas sugeridas:</p>
                <button
                  v-for="s in SUGGESTIONS"
                  :key="s"
                  class="ins-suggestion"
                  @click="sendInsightMessage(s)"
                >
                  {{ s }}
                </button>
              </div>

              <div ref="insightContainer" class="ins-messages">
                <template v-for="(msg, i) in insightMessages" :key="i">
                  <div class="ins-msg" :class="`ins-msg--${msg.role}`">
                    <i v-if="msg.role === 'assistant'" class="pi pi-sparkles ins-msg-icon" />
                    <div class="ins-msg-bubble" v-html="msg.role === 'assistant' ? formatInsightMessage(msg.content) : msg.content" />
                  </div>
                </template>
                <div v-if="insightLoading" class="ins-msg ins-msg--assistant">
                  <i class="pi pi-sparkles ins-msg-icon" />
                  <div class="ins-msg-bubble ins-typing">
                    <span class="ins-dot" /><span class="ins-dot" /><span class="ins-dot" />
                  </div>
                </div>
              </div>

              <div class="ins-input-row">
                <input
                  v-model="insightInput"
                  class="ins-input"
                  placeholder="Faça uma pergunta sobre os dados…"
                  @keydown.enter.prevent="sendInsightMessage()"
                />
                <Button
                  icon="pi pi-send"
                  :loading="insightLoading"
                  :disabled="!insightInput.trim()"
                  size="small"
                  rounded
                  @click="sendInsightMessage()"
                />
              </div>
            </template>
          </section>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- ABA: WORKFLOWS                                                    -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'workflows'">
        <WorkflowsTab style="flex: 1; overflow: hidden; display: flex; flex-direction: column;" />
      </template>

    </aside>
  </Transition>
</template>


<style scoped>
.chat-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 24rem; /* fallback — sobrescrito pelo :style */
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-card);
  border-left: 1px solid var(--p-surface-border);
  z-index: 200;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
}

/* ── Resize handle ───────────────────────────────────────────────── */
.chat-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
}
.chat-resize-handle:hover {
  background: var(--p-primary-color);
  opacity: 0.3;
}

/* ── Slide transition ────────────────────────────────────────────── */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  transform: translateX(100%);
}

/* ── Header ──────────────────────────────────────────────────────── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chat-header-icon {
  color: var(--p-primary-color);
  font-size: 1.125rem;
}

.chat-header-title {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--p-text-color);
}

.chat-header-actions {
  display: flex;
  gap: 0.25rem;
}

/* ── Tabs ────────────────────────────────────────────────────────── */
.chat-tabs {
  display: flex;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.chat-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  position: relative;
}

.chat-tab .pi {
  font-size: 0.8125rem;
}

.chat-tab:hover {
  color: var(--p-text-color);
  background: var(--p-surface-hover);
}

.chat-tab--active {
  color: var(--p-primary-color);
  border-bottom-color: var(--p-primary-color);
  font-weight: 600;
}

.chat-tab-badge {
  position: absolute;
  top: 0.4rem;
  right: 0.75rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.chat-tab-badge--danger  { background: var(--p-red-500, #ef4444); }
.chat-tab-badge--warning { background: var(--p-amber-400, #fbbf24); }

/* ── Welcome / Suggestions ───────────────────────────────────────── */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  gap: 1rem;
}

.chat-welcome-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-primary-50);
  color: var(--p-primary-color);
  font-size: 1.25rem;
}

.dark-mode .chat-welcome-icon {
  background: var(--p-primary-950);
}

.chat-welcome-text {
  text-align: center;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.chat-suggestion-chip {
  display: block;
  width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: var(--p-border-radius-lg);
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
  font-family: inherit;
  line-height: 1.4;
}

.chat-suggestion-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-primary-color);
}

/* ── Messages area ───────────────────────────────────────────────── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-msg {
  display: flex;
  gap: 0.5rem;
  max-width: 100%;
}

.chat-msg--user {
  flex-direction: row-reverse;
}

.chat-msg-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-primary-50);
  color: var(--p-primary-color);
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.dark-mode .chat-msg-avatar {
  background: var(--p-primary-950);
}

.chat-msg-bubble {
  max-width: 85%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--p-border-radius-lg);
  font-size: 0.8125rem;
  line-height: 1.5;
  word-break: break-word;
}

.chat-msg--user .chat-msg-bubble {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-bottom-right-radius: 0.25rem;
}

.chat-msg--assistant .chat-msg-bubble {
  background: var(--p-surface-100);
  color: var(--p-text-color);
  border-bottom-left-radius: 0.25rem;
}

.dark-mode .chat-msg--assistant .chat-msg-bubble {
  background: var(--p-surface-800);
}

/* ── Message text formatting ─────────────────────────────────────── */
.chat-msg-text :deep(strong) { font-weight: 600; }
.chat-msg-text :deep(code) { background: rgba(0,0,0,0.06); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.8em; }
.dark-mode .chat-msg-text :deep(code) { background: rgba(255,255,255,0.1); }
.chat-msg-text :deep(ul), .chat-msg-text :deep(ol) { margin: 0.25rem 0; padding-left: 1.25rem; }
.chat-msg-text :deep(ol) { list-style: decimal; }
.chat-msg-text :deep(li) { margin: 0.125rem 0; }
.chat-msg-text :deep(h3), .chat-msg-text :deep(h4), .chat-msg-text :deep(h5) { margin: 0.5rem 0 0.25rem; font-weight: 600; line-height: 1.3; }
.chat-msg-text :deep(h3) { font-size: 0.9375rem; }
.chat-msg-text :deep(h4) { font-size: 0.875rem; }
.chat-msg-text :deep(h5) { font-size: 0.8125rem; }
.chat-msg-text :deep(table) { width: 100%; border-collapse: collapse; margin: 0.375rem 0; font-size: 0.75rem; }
.chat-msg-text :deep(th), .chat-msg-text :deep(td) { padding: 0.25rem 0.375rem; border: 1px solid var(--p-surface-border); text-align: left; word-break: break-word; }
.chat-msg-text :deep(th) { font-weight: 600; background: var(--p-surface-50); }
.dark-mode .chat-msg-text :deep(th) { background: var(--p-surface-700); }
.chat-msg-text :deep(hr) { border: none; border-top: 1px solid var(--p-surface-border); margin: 0.375rem 0; }

/* ── Loading dots ────────────────────────────────────────────────── */
.chat-msg-loading {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.chat-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--p-text-muted-color);
  animation: chat-bounce 1.2s infinite ease-in-out;
}

.chat-dot:nth-child(2) { animation-delay: 0.15s; }
.chat-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes chat-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-0.375rem); opacity: 1; }
}

/* ── Clarification card ──────────────────────────────────────────── */
.chat-clarification { display: flex; flex-direction: column; gap: 0.5rem; }
.chat-clarification-q { margin: 0; font-weight: 500; font-size: 0.8125rem; }
.chat-clarification-opts { display: flex; flex-direction: column; gap: 0.375rem; }
.chat-clarification-btn {
  padding: 0.5rem 0.75rem;
  border-radius: var(--p-border-radius-md);
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s, border-color 0.15s;
  font-family: inherit;
}
.chat-clarification-btn:hover { background: var(--p-surface-hover); border-color: var(--p-primary-color); }

/* ── Error ────────────────────────────────────────────────────────── */
.chat-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--p-red-500);
  background: var(--p-red-50);
  border-top: 1px solid var(--p-red-200);
}

.dark-mode .chat-error { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); }

/* ── Input area ──────────────────────────────────────────────────── */
.chat-input-area {
  padding: 0.75rem;
  border-top: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.chat-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: var(--p-surface-ground);
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius-lg);
  padding: 0.375rem 0.375rem 0.375rem 0.75rem;
  transition: border-color 0.15s;
}

.chat-input-wrap:focus-within { border-color: var(--p-primary-color); }

.chat-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--p-text-color);
  font-family: inherit;
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: none;
  padding: 0.25rem 0;
  max-height: 6rem;
  overflow-y: auto;
}

.chat-textarea::placeholder { color: var(--p-text-muted-color); }
.chat-send-btn { flex-shrink: 0; }

/* ═══════════════════════════════════════════════════════════════════ */
/* INSIGHTS TAB                                                        */
/* ═══════════════════════════════════════════════════════════════════ */
.chat-insights-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.ins-section {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ins-section--chat {
  flex: 1;
  min-height: 0;
}

.ins-section-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
}

.ins-section-title .pi { font-size: 0.75rem; }

.ins-divider { height: 1px; background: var(--p-surface-border); flex-shrink: 0; }

/* Insight cards */
.ins-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }

.ins-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.ins-item--danger  { background: var(--p-red-50,   #fef2f2); border-left: 3px solid var(--p-red-500,   #ef4444); color: var(--p-red-800,   #991b1b); }
.ins-item--warning { background: var(--p-amber-50, #fffbeb); border-left: 3px solid var(--p-amber-400,#fbbf24); color: var(--p-amber-800,#92400e); }
.ins-item--success { background: var(--p-green-50, #f0fdf4); border-left: 3px solid var(--p-green-500,#22c55e); color: var(--p-green-800,#166534); }
.ins-item--info    { background: var(--p-blue-50,  #eff6ff); border-left: 3px solid var(--p-blue-400, #60a5fa); color: var(--p-blue-800, #1e40af); }

.dark-mode .ins-item--danger  { background: rgba(239,68,68,0.08);   color: var(--p-red-300); }
.dark-mode .ins-item--warning { background: rgba(251,191,36,0.08);  color: var(--p-amber-300); }
.dark-mode .ins-item--success { background: rgba(34,197,94,0.08);   color: var(--p-green-300); }
.dark-mode .ins-item--info    { background: rgba(96,165,250,0.08);  color: var(--p-blue-300); }

.ins-icon { font-size: 0.875rem; flex-shrink: 0; margin-top: 0.1rem; }
.ins-body { display: flex; flex-direction: column; gap: 0.2rem; }
.ins-title { font-weight: 700; }
.ins-text  { opacity: 0.85; }

.ins-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.ins-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s, background 0.15s;
}

.ins-action-btn .pi { font-size: 0.625rem; }

.ins-action-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

.ins-action-btn--done {
  opacity: 0.5;
  cursor: default;
}

.dark-mode .ins-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.ins-empty {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 1rem 0;
}

/* No API key */
.ins-no-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
.ins-no-key-icon { font-size: 1.5rem; opacity: 0.4; }
.ins-no-key code { font-family: monospace; font-size: 0.75rem; background: var(--p-surface-100); padding: 0.1em 0.3em; border-radius: 3px; }

/* Suggestions */
.ins-suggestions { display: flex; flex-direction: column; gap: 0.375rem; }
.ins-suggestions-hint { font-size: 0.75rem; color: var(--p-text-muted-color); margin: 0 0 0.25rem; }
.ins-suggestion {
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
.ins-suggestion:hover { background: var(--p-surface-hover); }

/* Messages */
.ins-messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  max-height: 280px;
  padding-right: 0.125rem;
}

.ins-msg { display: flex; align-items: flex-start; gap: 0.5rem; }
.ins-msg--user      { flex-direction: row-reverse; }
.ins-msg--error     { flex-direction: row; }
.ins-msg-icon       { font-size: 0.8125rem; color: var(--p-primary-color); margin-top: 0.3rem; flex-shrink: 0; }

.ins-msg-bubble {
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  max-width: 88%;
  word-break: break-word;
}
.ins-msg--user      .ins-msg-bubble { background: var(--p-primary-color); color: #fff; border-bottom-right-radius: 0.25rem; }
.ins-msg--assistant .ins-msg-bubble { background: var(--p-surface-ground); color: var(--p-text-color); border-bottom-left-radius: 0.25rem; }
.ins-msg--error     .ins-msg-bubble { background: var(--p-red-50, #fef2f2); color: var(--p-red-700, #b91c1c); font-size: 0.75rem; }

:deep(code) { font-family: monospace; font-size: 0.75rem; background: var(--p-surface-200); padding: 0.1em 0.3em; border-radius: 3px; }
:deep(strong) { font-weight: 700; }

/* Typing */
.ins-typing { display: flex; align-items: center; gap: 0.25rem; }
.ins-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--p-text-muted-color); animation: ip-bounce 1.2s infinite ease-in-out; }
.ins-dot:nth-child(2) { animation-delay: 0.2s; }
.ins-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes ip-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-5px); opacity: 1; }
}

/* Input row */
.ins-input-row {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-border);
  margin-top: 0.5rem;
}

.ins-input {
  flex: 1;
  height: 2rem;
  padding: 0 0.625rem;
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius-md);
  background: var(--p-surface-ground);
  color: var(--p-text-color);
  font-family: inherit;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s;
}

.ins-input:focus { border-color: var(--p-primary-color); }
.ins-input::placeholder { color: var(--p-text-muted-color); }
</style>
