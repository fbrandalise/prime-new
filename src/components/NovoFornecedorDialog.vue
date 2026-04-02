<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useFornecedoresStore } from '@/stores/fornecedores'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputMask from 'primevue/inputmask'
import FloatLabel from 'primevue/floatlabel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Nome pré-preenchido (ex: vindo da extração por IA)
  initialNome: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'created'])

const toast  = useToast()
const store  = useFornecedoresStore()
const saving = ref(false)
const submitted = ref(false)

const form = ref({ nome: '', cnpj: '' })

// Pré-preenche o nome quando o dialog abre
const open = (val) => {
  if (val) {
    form.value = { nome: props.initialNome ?? '', cnpj: '' }
    submitted.value = false
  }
}

const errors = computed(() => ({
  nome: submitted.value && !form.value.nome.trim(),
}))

const save = async () => {
  submitted.value = true
  if (errors.value.nome) return
  saving.value = true
  try {
    const created = await store.create(form.value)
    toast.add({ severity: 'success', summary: 'Fornecedor cadastrado', detail: created.nome, life: 3000 })
    emit('created', created)
    emit('update:modelValue', false)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível cadastrar o fornecedor.', life: 4000 })
  } finally {
    saving.value = false
  }
}

const close = () => emit('update:modelValue', false)
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Novo fornecedor"
    :style="{ width: '26rem', maxWidth: '95vw' }"
    @update:visible="(v) => { if (!v) close(); open(v) }"
    @show="open(true)"
  >
    <div class="nfd-fields">
      <!-- Nome -->
      <div class="nfd-field">
        <FloatLabel variant="on">
          <InputText
            id="nfd-nome"
            v-model="form.nome"
            :invalid="errors.nome"
            fluid
            autofocus
          />
          <label for="nfd-nome">Nome <span class="nfd-req">*</span></label>
        </FloatLabel>
        <small v-if="errors.nome" class="nfd-error">Nome é obrigatório</small>
      </div>

      <!-- CNPJ -->
      <div class="nfd-field">
        <FloatLabel variant="on">
          <InputMask
            id="nfd-cnpj"
            v-model="form.cnpj"
            mask="99.999.999/9999-99"
            placeholder="00.000.000/0000-00"
            fluid
          />
          <label for="nfd-cnpj">CNPJ</label>
        </FloatLabel>
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
      <Button label="Cadastrar" icon="pi pi-check" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<style scoped>
.nfd-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0 0.25rem;
}

.nfd-field {
  display: flex;
  flex-direction: column;
}

.nfd-req {
  color: var(--p-red-500);
  margin-left: 0.1em;
}

.nfd-error {
  font-size: 0.75rem;
  color: var(--p-red-500);
  margin-top: 0.25rem;
}
</style>
