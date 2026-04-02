<script setup>
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { processDocument, uploadDocument } from '@/composables/useDocumentAI'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import FileUpload from 'primevue/fileupload'
import ProgressBar from 'primevue/progressbar'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const toast = useToast()
const store = useContasAPagarStore()

// ── Estado ─────────────────────────────────────────────────────────────────
/** @type {import('vue').Ref<Array<{id:number, file:File, name:string, status:string, result:object|null, error:string|null}>>} */
const fileItems = ref([])
const processing = ref(false)
const done = ref(false)
let nextId = 1

// ── Seleção de arquivos ─────────────────────────────────────────────────────
const onSelect = ({ files }) => {
  const newFiles = Array.from(files).map(f => ({
    id:     nextId++,
    file:   f,
    name:   f.name,
    status: 'Aguardando',
    result: null,
    error:  null,
  }))
  fileItems.value = [...fileItems.value, ...newFiles]
  done.value = false
}

const removeFile = (id) => {
  fileItems.value = fileItems.value.filter(f => f.id !== id)
}

const clearAll = () => {
  fileItems.value = []
  done.value = false
}

// ── Processamento sequencial ────────────────────────────────────────────────
const processAll = async () => {
  if (!fileItems.value.length || processing.value) return

  // Reset items que falharam ou já foram processados para reprocessar
  fileItems.value = fileItems.value.map(f =>
    f.status === 'Aguardando' || f.status === 'Erro' ? { ...f, status: 'Aguardando', result: null, error: null } : f
  )

  processing.value = true

  for (const item of fileItems.value) {
    if (item.status === 'Extraído') continue   // pula os já bem-sucedidos

    item.status = 'Processando...'

    try {
      // 1. Extrai dados via IA
      const extracted = await processDocument(item.file)

      // 2. Faz upload do documento para o storage
      let documentoUrl = null
      try { documentoUrl = await uploadDocument(item.file) } catch (_) { /* upload opcional */ }

      // 3. Cria conta com situacao='Para Aprovação'
      await store.createParaAprovacao(extracted, documentoUrl)

      item.result = extracted
      item.status = 'Extraído'
    } catch (err) {
      item.error  = err?.message ?? 'Erro desconhecido'
      item.status = 'Erro'
    }
  }

  processing.value = false
  done.value = true

  const total  = fileItems.value.length
  const ok     = fileItems.value.filter(f => f.status === 'Extraído').length
  const failed = total - ok

  if (ok > 0) {
    toast.add({
      severity: failed ? 'warn' : 'success',
      summary:  failed ? 'Importação parcial' : 'Importação concluída',
      detail:   `${ok} documento(s) importado(s) para "Para Aprovação"${failed ? `, ${failed} com erro` : ''}.`,
      life:     5000,
    })
  } else {
    toast.add({ severity: 'error', summary: 'Falha na importação', detail: 'Nenhum documento foi importado com sucesso.', life: 5000 })
  }
}

const close = () => {
  if (!processing.value) {
    fileItems.value = []
    done.value = false
    emit('update:modelValue', false)
  }
}

// ── Helpers de UI ───────────────────────────────────────────────────────────
const statusIcon = (status) => ({
  'Aguardando':    'pi pi-clock',
  'Processando...':'pi pi-spin pi-spinner',
  'Extraído':      'pi pi-check-circle',
  'Erro':          'pi pi-times-circle',
}[status] ?? 'pi pi-question-circle')

const statusClass = (status) => ({
  'Aguardando':    'idd-status--wait',
  'Processando...':'idd-status--loading',
  'Extraído':      'idd-status--ok',
  'Erro':          'idd-status--err',
}[status] ?? '')

const completedCount = () => fileItems.value.filter(f => f.status === 'Extraído' || f.status === 'Erro').length
const progressValue  = () => fileItems.value.length ? Math.round((completedCount() / fileItems.value.length) * 100) : 0
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    :closable="!processing"
    :draggable="false"
    header="Importar documentos em lote"
    :style="{ width: '42rem', maxWidth: '95vw' }"
    @update:visible="(v) => { if (!v) close() }"
  >
    <!-- Instruções -->
    <p class="idd-intro">
      Selecione múltiplos boletos, notas fiscais ou recibos. A IA extrairá os dados de cada um
      e criará as contas na aba <strong>Para Aprovação</strong> para revisão.
    </p>

    <!-- FileUpload para seleção múltipla -->
    <FileUpload
      v-if="!processing && !done"
      mode="basic"
      :multiple="true"
      accept=".pdf,.jpg,.jpeg,.png"
      :max-file-size="10485760"
      choose-label="Adicionar arquivos"
      choose-icon="pi pi-plus"
      :auto="false"
      invalid-file-size-message="{0}: tamanho inválido — máx. {1}."
      class="idd-file-picker"
      @select="onSelect"
    />

    <!-- Lista de arquivos -->
    <div v-if="fileItems.length" class="idd-file-list">
      <div
        v-for="item in fileItems"
        :key="item.id"
        class="idd-file-item"
        :class="statusClass(item.status)"
      >
        <i :class="[statusIcon(item.status), 'idd-status-icon']" />
        <div class="idd-file-info">
          <span class="idd-file-name">{{ item.name }}</span>
          <span class="idd-status-label">{{ item.status }}</span>
          <span v-if="item.error" class="idd-error-msg">{{ item.error }}</span>
          <span v-if="item.result && item.result.fornecedor" class="idd-result-preview">
            {{ item.result.fornecedor }}
            <template v-if="item.result.valor"> · R$ {{ Number(item.result.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</template>
          </span>
        </div>
        <Button
          v-if="!processing && item.status !== 'Processando...'"
          icon="pi pi-times"
          text
          rounded
          severity="secondary"
          size="small"
          class="idd-remove-btn"
          @click="removeFile(item.id)"
        />
      </div>
    </div>

    <!-- Progress bar durante processamento -->
    <ProgressBar
      v-if="processing"
      :value="progressValue()"
      class="idd-progress"
    />

    <!-- Rodapé -->
    <template #footer>
      <div class="idd-footer">
        <div class="idd-footer-left">
          <span v-if="fileItems.length" class="idd-count">
            {{ fileItems.length }} arquivo(s) selecionado(s)
          </span>
          <Button
            v-if="fileItems.length && !processing"
            label="Limpar lista"
            icon="pi pi-trash"
            text
            severity="secondary"
            size="small"
            @click="clearAll"
          />
        </div>
        <div class="idd-footer-right">
          <Button
            label="Fechar"
            severity="secondary"
            variant="outlined"
            :disabled="processing"
            @click="close"
          />
          <Button
            v-if="!done"
            label="Importar com IA"
            icon="pi pi-sparkles"
            :loading="processing"
            :disabled="!fileItems.length || processing"
            @click="processAll"
          />
          <Button
            v-else
            label="Concluído"
            icon="pi pi-check"
            severity="success"
            @click="close"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.idd-intro {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.idd-file-picker {
  margin-bottom: 1rem;
}

/* ── Lista de arquivos ────────────────────────────────────────────────────── */
.idd-file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 22rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.idd-file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
  transition: background 0.15s;
}

.idd-file-item.idd-status--ok  { background: color-mix(in srgb, var(--p-green-500) 8%, transparent); border-color: color-mix(in srgb, var(--p-green-500) 25%, transparent); }
.idd-file-item.idd-status--err { background: color-mix(in srgb, var(--p-red-500)   8%, transparent); border-color: color-mix(in srgb, var(--p-red-500)   25%, transparent); }
.idd-file-item.idd-status--loading { background: color-mix(in srgb, var(--p-primary-color) 6%, transparent); }

.idd-status-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.idd-status--wait    .idd-status-icon { color: var(--p-text-muted-color); }
.idd-status--loading .idd-status-icon { color: var(--p-primary-color); }
.idd-status--ok      .idd-status-icon { color: var(--p-green-600, #16a34a); }
.idd-status--err     .idd-status-icon { color: var(--p-red-500, #ef4444); }

.idd-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.idd-file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.idd-status-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.idd-error-msg {
  font-size: 0.75rem;
  color: var(--p-red-500, #ef4444);
  line-height: 1.4;
}

.idd-result-preview {
  font-size: 0.75rem;
  color: var(--p-green-700, #15803d);
  font-weight: 500;
}

.idd-remove-btn {
  flex-shrink: 0;
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
.idd-progress {
  margin-top: 0.75rem;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.idd-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.75rem;
}

.idd-footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.idd-footer-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.idd-count {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
</style>
