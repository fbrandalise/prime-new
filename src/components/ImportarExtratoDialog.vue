<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useConciliacaoStore } from '@/stores/conciliacao'
import { parseExtrato } from '@/composables/useExtratoParser'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'imported'])

const toast                  = useToast()
const contasFinanceirasStore = useContasFinanceirasStore()
const conciliacaoStore       = useConciliacaoStore()

const contaId    = ref(null)
const preview    = ref([])
const parseError = ref('')
const importing  = ref(false)
const dragging   = ref(false)
const fileName   = ref('')
const fileInput  = ref(null)

const contaOptions = computed(() =>
  contasFinanceirasStore.items
    .filter(c => ['banco', 'carteira', 'caixa'].includes(c.tipo))
    .map(c => ({ label: c.nome, value: c.id }))
)

function formatValor(valor) {
  return (valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatData(date) {
  if (!date) return ''
  return (date instanceof Date ? date : new Date(date)).toLocaleDateString('pt-BR')
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function triggerInput() {
  fileInput.value?.click()
}

function onInputChange(e) {
  const file = e.target.files?.[0]
  if (file) processFile(file)
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

async function processFile(file) {
  parseError.value = ''
  preview.value    = []
  fileName.value   = file.name

  if (file.size > 5_242_880) {
    parseError.value = 'Arquivo muito grande. O limite é 5 MB.'
    fileName.value   = ''
    return
  }

  try {
    const items = await parseExtrato(file)
    if (items.length === 0) {
      parseError.value = 'Nenhuma transação encontrada. Verifique o formato do arquivo.'
      fileName.value   = ''
      return
    }
    preview.value = items
  } catch (err) {
    parseError.value = `Erro ao processar o arquivo: ${err.message}`
    fileName.value   = ''
  }
}

function removerArquivo() {
  fileName.value   = ''
  preview.value    = []
  parseError.value = ''
}

// ── Importar ──────────────────────────────────────────────────────────────────
async function importar() {
  if (!contaId.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione uma conta financeira.', life: 3000 })
    return
  }
  if (!preview.value.length) return

  importing.value = true
  try {
    await conciliacaoStore.importar(preview.value, contaId.value)
    toast.add({ severity: 'success', summary: 'Importado', detail: `${preview.value.length} itens importados com sucesso.`, life: 3000 })
    emit('imported', contaId.value)
    fechar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message ?? 'Erro ao importar extrato.', life: 5000 })
  } finally {
    importing.value = false
  }
}

function fechar() {
  contaId.value    = null
  preview.value    = []
  parseError.value = ''
  fileName.value   = ''
  emit('update:modelValue', false)
}
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    :draggable="false"
    :style="{ width: '660px', maxWidth: '95vw' }"
    @update:visible="fechar"
  >
    <!-- Header customizado -->
    <template #header>
      <div class="dlg-header">
        <div class="dlg-header-icon">
          <i class="pi pi-file-import" />
        </div>
        <div>
          <p class="dlg-header-title">Importar Extrato Bancário</p>
          <p class="dlg-header-sub">Formatos suportados: OFX (SGML/XML) e CSV</p>
        </div>
      </div>
    </template>

    <div class="dlg-body">

      <!-- Passo 1: Conta financeira -->
      <div class="dlg-step">
        <div class="dlg-step-label">
          <span class="dlg-step-num">1</span>
          <span>Selecione a conta financeira</span>
        </div>
        <Select
          v-model="contaId"
          :options="contaOptions"
          option-label="label"
          option-value="value"
          placeholder="Selecione a conta"
          class="dlg-select"
        />
      </div>

      <Divider />

      <!-- Passo 2: Arquivo -->
      <div class="dlg-step">
        <div class="dlg-step-label">
          <span class="dlg-step-num">2</span>
          <span>Carregue o arquivo do extrato</span>
        </div>

        <!-- Arquivo selecionado -->
        <div v-if="fileName" class="dlg-file-chip">
          <i class="pi pi-file dlg-file-chip-icon" />
          <span class="dlg-file-chip-name">{{ fileName }}</span>
          <Button
            icon="pi pi-times"
            variant="text"
            severity="secondary"
            rounded
            size="small"
            aria-label="Remover arquivo"
            @click="removerArquivo"
          />
        </div>

        <!-- Drop zone -->
        <div
          v-else
          class="dlg-dropzone"
          :class="{ 'is-dragging': dragging }"
          tabindex="0"
          role="button"
          aria-label="Clique ou arraste um arquivo para importar"
          @click="triggerInput"
          @keydown.enter="triggerInput"
          @keydown.space.prevent="triggerInput"
          @drop.prevent="onDrop"
          @dragover.prevent
          @dragenter.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
        >
          <i class="pi pi-cloud-upload dlg-dropzone-icon" />
          <p class="dlg-dropzone-title">Arraste o arquivo aqui</p>
          <p class="dlg-dropzone-sub">ou <span class="dlg-dropzone-link">clique para selecionar</span></p>
          <p class="dlg-dropzone-hint">Máximo 5 MB — .OFX ou .CSV</p>
          <input
            ref="fileInput"
            type="file"
            accept=".ofx,.csv"
            style="display: none"
            @change="onInputChange"
          />
        </div>

        <!-- Erro de parse -->
        <Message v-if="parseError" severity="error" :closable="false" class="dlg-error">
          {{ parseError }}
        </Message>
      </div>

      <!-- Preview -->
      <template v-if="preview.length > 0">
        <Divider />
        <div class="dlg-preview">
          <div class="dlg-preview-header">
            <i class="pi pi-table" style="color: var(--p-primary-color)" />
            <span class="dlg-preview-title">
              {{ preview.length }} transações encontradas
            </span>
            <span v-if="preview.length > 10" class="dlg-preview-hint">
              — exibindo as 10 primeiras
            </span>
          </div>
          <DataTable
            :value="preview.slice(0, 10)"
            size="small"
            striped-rows
          >
            <Column header="Data" style="width: 100px">
              <template #body="{ data }">{{ formatData(data.data) }}</template>
            </Column>
            <Column field="descricao" header="Descrição" />
            <Column header="Tipo" style="width: 85px">
              <template #body="{ data }">
                <Tag
                  :value="data.tipo"
                  :severity="data.tipo === 'Crédito' ? 'success' : 'danger'"
                />
              </template>
            </Column>
            <Column header="Valor" style="width: 110px">
              <template #body="{ data }">
                <span :class="data.tipo === 'Crédito' ? 'val-credito' : 'val-debito'">
                  R$ {{ formatValor(data.valor) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

    </div>

    <template #footer>
      <Button label="Cancelar" variant="text" severity="secondary" @click="fechar" />
      <Button
        :label="preview.length > 0 ? `Importar ${preview.length} transações` : 'Importar'"
        icon="pi pi-check"
        :disabled="!preview.length || !contaId"
        :loading="importing"
        @click="importar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
/* ── Header ─────────────────────────────────────────────────────────────────── */
.dlg-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.dlg-header-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dlg-header-icon .pi {
  font-size: 1.15rem;
  color: var(--p-primary-color);
}
.dlg-header-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--p-text-color);
  margin: 0;
}
.dlg-header-sub {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  margin: 0.1rem 0 0;
}

/* ── Body ────────────────────────────────────────────────────────────────────── */
.dlg-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.25rem 0;
}

/* ── Steps ───────────────────────────────────────────────────────────────────── */
.dlg-step {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}
.dlg-step-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}
.dlg-step-num {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dlg-select { width: 100%; }

/* ── Drop zone ───────────────────────────────────────────────────────────────── */
.dlg-dropzone {
  border: 2px dashed var(--p-surface-border);
  border-radius: 0.625rem;
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: center;
  outline: none;
}
.dlg-dropzone:hover,
.dlg-dropzone:focus-visible {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 4%, transparent);
}
.dlg-dropzone.is-dragging {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
}
.dlg-dropzone-icon {
  font-size: 2.25rem;
  color: var(--p-primary-color);
  margin-bottom: 0.25rem;
  opacity: 0.75;
}
.dlg-dropzone-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0;
}
.dlg-dropzone-sub {
  font-size: 0.825rem;
  color: var(--p-text-muted-color);
  margin: 0;
}
.dlg-dropzone-link {
  color: var(--p-primary-color);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.dlg-dropzone-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin: 0.25rem 0 0;
}

/* ── Arquivo selecionado ─────────────────────────────────────────────────────── */
.dlg-file-chip {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  background: var(--p-surface-50, var(--p-surface-ground));
}
.dlg-file-chip-icon {
  font-size: 1.1rem;
  color: var(--p-primary-color);
}
.dlg-file-chip-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Erro ────────────────────────────────────────────────────────────────────── */
.dlg-error { margin-top: 0.25rem; }

/* ── Preview ─────────────────────────────────────────────────────────────────── */
.dlg-preview {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.25rem 0;
}
.dlg-preview-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.825rem;
}
.dlg-preview-title {
  font-weight: 600;
  color: var(--p-text-color);
}
.dlg-preview-hint {
  color: var(--p-text-muted-color);
}

/* ── Valores ─────────────────────────────────────────────────────────────────── */
.val-credito { color: var(--p-green-500); font-weight: 600; font-size: 0.85rem; }
.val-debito  { color: var(--p-red-400);   font-weight: 600; font-size: 0.85rem; }
</style>
