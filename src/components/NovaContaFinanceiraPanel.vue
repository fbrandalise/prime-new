<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Card from 'primevue/card'
import { useToast } from 'primevue/usetoast'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const close = () => emit('update:modelValue', false)

const store = useContasFinanceirasStore()
const toast = useToast()
const saving = ref(false)

const onKeydown = (e) => { if (e.key === 'Escape' && props.modelValue) close() }
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

// ── Estado do formulário ───────────────────────────────────────────────────────
const form = ref({
  nome: '',
  tipo: 'Banco',
  banco: null,
  agencia: '',
  conta: '',
  digitoConta: '',
  saldoInicial: null,
})

const tipoOptions = [
  { label: 'Banco', value: 'Banco' },
  { label: 'Carteira virtual', value: 'Carteira virtual' },
  { label: 'Caixa', value: 'Caixa' },
  { label: 'Outro', value: 'Outro' },
]

const bancoOptions = [
  'Banco do Brasil',
  'Bradesco',
  'Caixa Econômica Federal',
  'Itaú',
  'Nubank',
  'Santander',
  'Sicoob',
  'Sicredi',
  'Inter',
  'C6 Bank',
  'BTG Pactual',
  'XP Investimentos',
  'Mercado Pago',
  'PagSeguro',
  'Safra',
  'Votorantim',
]

const isBanco = computed(() => form.value.tipo === 'Banco')

// ── Validação ──────────────────────────────────────────────────────────────────
const submitted = ref(false)

const errors = computed(() => ({
  nome:  submitted.value && !form.value.nome.trim(),
  banco: submitted.value && isBanco.value && !form.value.banco,
}))

const save = async () => {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) return
  saving.value = true
  try {
    await store.create(form.value)
    toast.add({ severity: 'success', summary: 'Salvo', detail: 'Conta financeira criada com sucesso.', life: 3000 })
    // Resetar formulário
    form.value = { nome: '', tipo: 'Banco', banco: null, agencia: '', conta: '', digitoConta: '', saldoInicial: null }
    submitted.value = false
    close()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar a conta financeira.', life: 4000 })
  } finally {
    saving.value = false
  }
}

// Resetar banco ao trocar tipo
watch(() => form.value.tipo, () => {
  form.value.banco      = null
  form.value.agencia    = ''
  form.value.conta      = ''
  form.value.digitoConta = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ncf-slide">
      <div
        v-if="modelValue"
        class="ncf-page"
        role="dialog"
        aria-modal="true"
        aria-label="Nova conta financeira"
      >

        <!-- ── Cabeçalho ─────────────────────────────────────────────────── -->
        <header class="ncf-header">
          <div class="ncf-header-start">
            <Button
              icon="pi pi-arrow-left"
              variant="text"
              rounded
              aria-label="Voltar"
              @click="close"
            />
            <span class="ncf-header-title">Nova conta financeira</span>
          </div>
          <div class="ncf-header-end">
            <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
            <Button label="Salvar conta" icon="pi pi-check" :loading="saving" @click="save" />
          </div>
        </header>

        <!-- ── Corpo com scroll ──────────────────────────────────────────── -->
        <div class="ncf-body">
          <div class="ncf-layout">

            <Card class="ncf-card">
              <template #title>
                <div class="ncf-card-title">
                  <i class="pi pi-building-columns" />
                  Dados da conta
                </div>
              </template>
              <template #content>
                <div class="ncf-fields">

                  <!-- Nome da conta -->
                  <div class="ncf-field">
                    <FloatLabel variant="on">
                      <InputText
                        id="ncf-nome"
                        v-model="form.nome"
                        :invalid="errors.nome"
                        fluid
                      />
                      <label for="ncf-nome">Nome da conta <span class="ncf-req">*</span></label>
                    </FloatLabel>
                    <small v-if="errors.nome" class="ncf-error">Informe o nome da conta</small>
                  </div>

                  <!-- Tipo -->
                  <div class="ncf-field ncf-field--static">
                    <label class="ncf-label">Tipo</label>
                    <SelectButton
                      v-model="form.tipo"
                      :options="tipoOptions"
                      option-label="label"
                      option-value="value"
                      class="ncf-tipo-select"
                    />
                  </div>

                  <!-- Banco (condicional) -->
                  <Transition name="ncf-expand">
                    <div v-if="isBanco" class="ncf-fields ncf-fields--inner">

                      <div class="ncf-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncf-banco"
                            v-model="form.banco"
                            :options="bancoOptions"
                            :invalid="errors.banco"
                            filter
                            filter-placeholder="Buscar banco..."
                            fluid
                          />
                          <label for="ncf-banco">Banco <span class="ncf-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.banco" class="ncf-error">Selecione o banco</small>
                      </div>

                      <!-- Agência | Conta + Dígito -->
                      <div class="ncf-row ncf-row--2">
                        <div class="ncf-field">
                          <FloatLabel variant="on">
                            <InputText id="ncf-agencia" v-model="form.agencia" fluid />
                            <label for="ncf-agencia">Agência</label>
                          </FloatLabel>
                        </div>
                        <div class="ncf-row ncf-row--conta">
                          <div class="ncf-field">
                            <FloatLabel variant="on">
                              <InputText id="ncf-conta" v-model="form.conta" fluid />
                              <label for="ncf-conta">Conta</label>
                            </FloatLabel>
                          </div>
                          <div class="ncf-field ncf-field--digito">
                            <FloatLabel variant="on">
                              <InputText
                                id="ncf-digito"
                                v-model="form.digitoConta"
                                maxlength="1"
                                fluid
                              />
                              <label for="ncf-digito">Dígito</label>
                            </FloatLabel>
                          </div>
                        </div>
                      </div>

                    </div>
                  </Transition>

                  <!-- Saldo inicial -->
                  <div class="ncf-field">
                    <FloatLabel variant="on">
                      <InputNumber
                        inputId="ncf-saldo"
                        v-model="form.saldoInicial"
                        mode="currency"
                        currency="BRL"
                        locale="pt-BR"
                        fluid
                      />
                      <label for="ncf-saldo">Saldo inicial</label>
                    </FloatLabel>
                  </div>

                </div>
              </template>
            </Card>

          </div>
        </div>

        <!-- ── Footer fixo ───────────────────────────────────────────────── -->
        <footer class="ncf-footer">
          <span class="ncf-footer-hint"><span class="ncf-req">*</span> Campos obrigatórios</span>
        </footer>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Página ─────────────────────────────────────────────────────────────────── */
.ncf-page {
  position: fixed;
  top: 0;
  left: var(--app-sidebar-w, 15rem);
  right: 0;
  bottom: 0;
  background-color: var(--p-surface-ground);
  border-radius: 20px 0 0 20px;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.12);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Cabeçalho ──────────────────────────────────────────────────────────────── */
.ncf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.5rem 0.625rem 0.75rem;
  background: var(--p-surface-ground);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  gap: 0.75rem;
}

.ncf-header-start {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ncf-header-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncf-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Corpo ──────────────────────────────────────────────────────────────────── */
.ncf-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 2rem;
  scrollbar-gutter: stable;
  background-color: var(--p-surface-ground);
}

.ncf-layout {
  max-width: 32rem;
}

/* ── Cards ──────────────────────────────────────────────────────────────────── */
.ncf-card {
  box-shadow: none !important;
}

.ncf-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncf-card-title .pi {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* ── Campos ─────────────────────────────────────────────────────────────────── */
.ncf-fields {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.ncf-fields--inner {
  gap: 1rem;
}

.ncf-row {
  display: grid;
  gap: 1rem;
}

.ncf-row--2 { grid-template-columns: 1fr 1fr; }

.ncf-row--conta {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.ncf-field {
  display: flex;
  flex-direction: column;
}

.ncf-field--static {
  gap: 0.375rem;
}

.ncf-field--digito {
  width: 5rem;
}

.ncf-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-color);
  user-select: none;
}

.ncf-req {
  color: var(--p-red-500);
  margin-left: 0.1em;
}

.ncf-error {
  font-size: 0.75rem;
  color: var(--p-red-500);
  margin-top: 0.25rem;
}

/* SelectButton de tipo */
.ncf-tipo-select { display: flex; }

:deep(.ncf-tipo-select.p-selectbutton) {
  display: flex;
  width: 100%;
}

:deep(.ncf-tipo-select .p-togglebutton) {
  flex: 1;
  font-size: 0.8125rem;
}

/* ── Altura uniforme dos inputs ─────────────────────────────────────────────── */
:deep(.p-inputtext),
:deep(.p-select),
:deep(.p-inputnumber) {
  height: 2.5rem;
}

:deep(.p-select .p-select-label) {
  display: flex;
  align-items: center;
  padding-block: 0;
}

:deep(.p-inputnumber .p-inputtext) {
  height: 100%;
  padding-block: 0;
}

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.ncf-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0.75rem 1.75rem;
  background: var(--p-surface-ground);
  border-top: 1px solid var(--p-surface-border);
}

.ncf-footer-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── Transições ─────────────────────────────────────────────────────────────── */
.ncf-slide-enter-active,
.ncf-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.ncf-slide-enter-from,
.ncf-slide-leave-to {
  transform: translateX(100%);
}

.ncf-expand-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.ncf-expand-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.ncf-expand-enter-from,
.ncf-expand-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsivo ─────────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .ncf-page { left: 0; border-radius: 0; }
  .ncf-body { padding: 1rem 1rem 2rem; }
  .ncf-footer { padding: 0.75rem 1rem; }
}

@media (max-width: 480px) {
  .ncf-row--2 { grid-template-columns: 1fr; }
}
</style>
