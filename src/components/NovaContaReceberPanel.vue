<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Textarea from 'primevue/textarea'
import AutoComplete from 'primevue/autocomplete'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Card from 'primevue/card'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import FileUpload from 'primevue/fileupload'
import { useToast } from 'primevue/usetoast'
import { useContasAReceberStore } from '@/stores/contasAReceber'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useClientesStore } from '@/stores/clientes'
import NovoClienteDialog from '@/components/NovoClienteDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editItem:   { type: Object,  default: null  },
})

const emit = defineEmits(['update:modelValue'])
const close = () => {
  submitted.value = false
  hasDraft.value   = false
  emit('update:modelValue', false)
}

const isEditing = computed(() => !!props.editItem)

const store = useContasAReceberStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const clientesStore = useClientesStore()
const toast = useToast()
const saving = ref(false)

onMounted(() => { if (!clientesStore.items.length) clientesStore.fetchAll() })

// ── Dialog de novo cliente ─────────────────────────────────────────────────
const showNovoCliente = ref(false)
const novoClienteNome = ref('')

const abrirNovoCliente = () => {
  novoClienteNome.value = typeof form.value.cliente === 'string' ? form.value.cliente : ''
  showNovoCliente.value = true
}

const onClienteCriado = (cliente) => {
  form.value.cliente = cliente.nome
}

// ── AutoComplete de clientes ───────────────────────────────────────────────
const clientesSugestoes = ref([])
const searchCliente = ({ query }) => {
  const q = query.toLowerCase()
  clientesSugestoes.value = clientesStore.items
    .filter(c => c.nome.toLowerCase().includes(q))
    .map(c => c.nome)
}

// ── Histórico de eventos — configuração de tipos ──────────────────────────
const tipoConfig = {
  pedido_criado:  { icon: 'pi pi-shopping-cart',        label: 'Pedido de venda criado',        color: '#3b82f6' },
  nf_emitida:     { icon: 'pi pi-file',                 label: 'Nota fiscal emitida',            color: '#6366f1' },
  conta_gerada:   { icon: 'pi pi-plus-circle',          label: 'Conta a receber gerada',         color: '#06b6d4' },
  parcela_gerada: { icon: 'pi pi-copy',                 label: 'Parcela(s) gerada(s)',           color: '#14b8a6' },
  lembrete:       { icon: 'pi pi-bell',                 label: 'Lembrete enviado',               color: '#eab308' },
  vencimento_alt: { icon: 'pi pi-calendar',             label: 'Vencimento alterado',            color: '#f97316' },
  juros:          { icon: 'pi pi-exclamation-triangle', label: 'Juros e multa aplicados',        color: '#ef4444' },
  acordo:         { icon: 'pi pi-users',                label: 'Acordo de pagamento',            color: '#a855f7' },
  pagto_parcial:  { icon: 'pi pi-wallet',               label: 'Pagamento parcial recebido',     color: '#22c55e' },
  recebida:       { icon: 'pi pi-check-circle',         label: 'Conta recebida',                 color: '#16a34a' },
}

const historicoMock = computed(() => {
  if (!props.editItem) return []
  const fmtVal = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((v ?? 0) / 100)
  return [
    { id: 1, tipo: 'pedido_criado',  descricao: 'Pedido de venda #12847 gerado no sistema.',                    data_evento: '2025-01-10T09:15:00Z', usuario: 'Carlos Silva' },
    { id: 2, tipo: 'nf_emitida',     descricao: 'NF-e 000.456 emitida e autorizada pela SEFAZ.',               data_evento: '2025-01-10T11:30:00Z', usuario: 'Sistema' },
    { id: 3, tipo: 'conta_gerada',   descricao: `Conta a receber gerada — ${fmtVal(props.editItem.valor)}.`,   data_evento: '2025-01-10T11:32:00Z', usuario: 'Sistema' },
    { id: 4, tipo: 'parcela_gerada', descricao: 'Parcelas 1/3, 2/3 e 3/3 geradas automaticamente.',           data_evento: '2025-01-10T11:32:00Z', usuario: 'Sistema' },
    { id: 5, tipo: 'lembrete',       descricao: 'Lembrete de vencimento enviado ao cliente por e-mail.',       data_evento: '2025-02-05T08:00:00Z', usuario: 'Sistema' },
    { id: 6, tipo: 'vencimento_alt', descricao: 'Vencimento postergado de 10/02 para 20/02/2025.',             data_evento: '2025-02-08T14:22:00Z', usuario: 'Ana Costa' },
  ]
})

const fmtEventDate = (iso) => {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
}

const onKeydown = (e) => { if (e.key === 'Escape' && props.modelValue) close() }
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  agoTimer = setInterval(updateAgo, 1000)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  clearInterval(agoTimer)
  clearTimeout(draftTimer)
})

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

// Popula o formulário ao abrir em modo edição
watch(() => props.editItem, (raw) => {
  if (!raw) return
  const isoToDate = (s) => {
    if (!s) return null
    const [y, m, d] = s.split('-')
    return new Date(+y, +m - 1, +d)
  }
  form.value = {
    cliente:           raw.cliente,
    valor:             (raw.valor ?? 0) / 100,
    dataEmissao:       isoToDate(raw.data_emissao) ?? new Date(),
    competencia:       isoToDate(raw.competencia)  ?? new Date(),
    vencimento:        isoToDate(raw.vencimento),
    historico:         raw.historico         ?? '',
    nroDocumento:      raw.nro_documento     ?? '',
    ocorrencia:        raw.ocorrencia        ?? 'Única',
    frequencia:        raw.frequencia        ?? 'Mensal',
    parcelas:          raw.parcelas          ?? null,
    formaPagamento:    raw.forma_pagamento   ?? 'PIX',
    contaFinanceiraId: raw.conta_financeira_id ?? null,
    nroBanco:          raw.nro_banco         ?? '',
    categoria:         raw.categoria         ?? null,
    vendedor:          raw.vendedor          ?? null,
    jurosMensal:       raw.juros_mensal      ?? null,
    multa:             raw.multa             ?? null,
  }
  multaTipo.value  = raw.multa_tipo ?? 'percent'
  anexos.value     = raw.anexos ?? []
})

// ── Estado do formulário ───────────────────────────────────────────────────
const form = ref({
  cliente: null,
  valor: null,
  dataEmissao: new Date(),
  competencia: new Date(),
  vencimento: null,
  historico: '',
  nroDocumento: '',
  ocorrencia: 'Única',
  frequencia: 'Mensal',
  parcelas: null,
  formaPagamento: 'PIX',
  contaFinanceiraId: null,
  nroBanco: '',
  categoria: null,
  vendedor: null,
  jurosMensal: null,
  multa: null,
})

// ── Opções ─────────────────────────────────────────────────────────────────
const formaPagamentoOptions = [
  'Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito',
  'Transferência Bancária', 'Dinheiro', 'Cheque',
]
const categoriaOptions = [
  { label: 'Receitas de Vendas', items: [
    'Vendas de Mercadorias',
    'Vendas de Serviços',
  ]},
  { label: 'Receitas Financeiras', items: [
    'Juros Recebidos',
    'Descontos Obtidos',
    'Rendimentos Financeiros',
    'Multas Recebidas',
    'Tarifas Recebidas',
  ]},
  { label: 'Outras Receitas Operacionais', items: [
    'Frete Recebido',
    'Reembolso de Entrega',
    'Indenizações',
    'Recebimentos de Empréstimos',
    'Aportes / Capitalização',
    'Outras Receitas Eventuais',
  ]},
  { label: 'Outras Receitas Não Operacionais', items: [
    'Empréstimos Recebidos',
    'Aporte dos Sócios',
  ]},
]
const vendedorOptions = [
  'Ana Costa', 'Bruno Mendes', 'Carlos Silva',
  'Fernanda Lima', 'João Santos', 'Mariana Oliveira',
]
const ocorrenciaOptions = [
  { label: 'Única', value: 'Única' },
  { label: 'Recorrente', value: 'Recorrente' },
]
const frequenciaOptions = [
  'Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual',
]
const parcelasOptions = Array.from({ length: 259 }, (_, i) => i + 2)

// ── Tipo de multa ──────────────────────────────────────────────────────────
const multaTipo = ref('percent') // 'percent' | 'currency'

// ── Derivados ──────────────────────────────────────────────────────────────
const isRecorrente = computed(() => form.value.ocorrencia === 'Recorrente')


// ── Validação ──────────────────────────────────────────────────────────────
const submitted = ref(false)
const errors = computed(() => ({
  cliente:           submitted.value && !form.value.cliente,
  valor:             submitted.value && !form.value.valor,
  vencimento:        submitted.value && !form.value.vencimento,
  dataEmissao:       submitted.value && !form.value.dataEmissao,
  categoria:         submitted.value && !form.value.categoria,
  contaFinanceiraId: false,
}))

const save = async () => {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) return
  saving.value = true
  try {
    const formData = { ...form.value, multaTipo: multaTipo.value, anexos: anexos.value }
    if (isEditing.value) {
      await store.update(props.editItem.id, formData)
      toast.add({ severity: 'success', summary: 'Salvo', detail: 'Conta atualizada com sucesso.', life: 3000 })
    } else {
      await store.create(formData)
      toast.add({ severity: 'success', summary: 'Criado', detail: 'Conta a receber criada com sucesso.', life: 3000 })
    }
    localStorage.removeItem(DRAFT_KEY)
    form.value = {
      cliente: null, valor: null, dataEmissao: new Date(), competencia: new Date(),
      vencimento: null, historico: '', nroDocumento: '', ocorrencia: 'Única',
      frequencia: 'Mensal', parcelas: null, formaPagamento: 'PIX',
      contaFinanceiraId: null, nroBanco: '', categoria: null, vendedor: null,
      jurosMensal: null, multa: null,
    }
    submitted.value    = false
    hasDraft.value     = false
    draftSavedAt.value = null
    draftSavedAgo.value = ''
    anexos.value       = []
    fileUploadRef.value?.clear()
    close()
  } catch (err) {
    console.error('[NovaContaReceberPanel] save error:', err)
    toast.add({ severity: 'error', summary: 'Erro', detail: err?.message ?? 'Não foi possível salvar a conta a receber.', life: 6000 })
  } finally {
    saving.value = false
  }
}

// ── Histórico ──────────────────────────────────────────────────────────────
const HISTORICO_MAX = 500

// ── Rascunho automático ────────────────────────────────────────────────────
const DRAFT_KEY      = 'car_nova_draft'
const hasDraft       = ref(false)
const draftData      = ref(null)
const draftSavedAt   = ref(null)   // Date — quando o último rascunho foi salvo
const draftSavedAgo  = ref('')     // string atualizada a cada segundo
let   draftTimer     = null
let   agoTimer       = null

const updateAgo = () => {
  if (!draftSavedAt.value) return
  const diff = Math.floor((Date.now() - draftSavedAt.value) / 1000)
  if      (diff <  5)    draftSavedAgo.value = 'agora mesmo'
  else if (diff < 60)    draftSavedAgo.value = `há ${diff}s`
  else if (diff < 3600)  draftSavedAgo.value = `há ${Math.floor(diff / 60)} min`
  else                   draftSavedAgo.value = `há ${Math.floor(diff / 3600)}h`
}

watch(form, (val) => {
  if (isEditing.value) return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    const s = {
      ...val,
      dataEmissao: val.dataEmissao instanceof Date ? val.dataEmissao.toISOString() : val.dataEmissao,
      competencia: val.competencia instanceof Date ? val.competencia.toISOString() : val.competencia,
      vencimento:  val.vencimento  instanceof Date ? val.vencimento.toISOString()  : val.vencimento,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(s))
    draftSavedAt.value  = new Date()
    draftSavedAgo.value = 'agora mesmo'
  }, 600)
}, { deep: true })

watch(() => props.modelValue, (open) => {
  if (!open || isEditing.value) return
  const saved = localStorage.getItem(DRAFT_KEY)
  if (!saved) return
  try {
    draftData.value = JSON.parse(saved)
    hasDraft.value  = true
  } catch { /* ignore corrupt draft */ }
})

const restoreDraft = () => {
  const d = draftData.value
  if (!d) return
  form.value = {
    ...d,
    dataEmissao: d.dataEmissao ? new Date(d.dataEmissao) : new Date(),
    competencia: d.competencia ? new Date(d.competencia) : new Date(),
    vencimento:  d.vencimento  ? new Date(d.vencimento)  : null,
  }
  hasDraft.value = false
}

const discardDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
  hasDraft.value      = false
  draftData.value     = null
  draftSavedAt.value  = null
  draftSavedAgo.value = ''
}

// ── Anexos — upload real para Supabase Storage ─────────────────────────────
const BUCKET = 'documentos-financeiros'

const fileUploadRef   = ref(null)
const anexos          = ref([])       // [{ nome, url, tamanho, path }]
const uploadingAnexos = ref(false)

const onFileSelect = async ({ files }) => {
  uploadingAnexos.value = true
  for (const file of files) {
    const path = `car/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      anexos.value = [...anexos.value, { nome: file.name, url: publicUrl, tamanho: file.size, path }]
    } else {
      toast.add({ severity: 'warn', summary: 'Upload falhou', detail: file.name, life: 4000 })
    }
  }
  uploadingAnexos.value = false
  fileUploadRef.value?.clear()
}

const removeAnexo = async (anexo) => {
  if (anexo.path) await supabase.storage.from(BUCKET).remove([anexo.path])
  anexos.value = anexos.value.filter(a => a.path !== anexo.path)
}

const fmtBytes = (b) => b < 1024 * 1024
  ? `${(b / 1024).toFixed(0)} KB`
  : `${(b / (1024 * 1024)).toFixed(1)} MB`
</script>

<template>
  <Teleport to="body">
    <Transition name="ncr-slide">
      <div
        v-if="modelValue"
        class="ncr-page"
        role="dialog"
        aria-modal="true"
        :aria-label="isEditing ? 'Editar conta a receber' : 'Nova conta a receber'"
      >

        <!-- ── Cabeçalho ─────────────────────────────────────────────── -->
        <header class="ncr-header">
          <div class="ncr-header-start">
            <Button
              icon="pi pi-arrow-left"
              variant="text"
              rounded
              aria-label="Voltar"
              @click="close"
            />
            <span class="ncr-header-title">
              {{ isEditing ? 'Editar conta a receber' : 'Nova conta a receber' }}
            </span>
          </div>

          <div class="ncr-header-end">
            <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
            <Button
              :label="isEditing ? 'Salvar alterações' : 'Salvar conta'"
              icon="pi pi-check"
              :loading="saving"
              @click="save"
            />
          </div>
        </header>

        <!-- ── Barra de rascunho ─────────────────────────────────────── -->
        <div v-if="hasDraft && !isEditing" class="ncr-draft-bar">
          <i class="pi pi-clock" />
          <span>Rascunho encontrado. Deseja restaurar o último preenchimento?</span>
          <Button label="Restaurar" size="small" @click="restoreDraft" />
          <Button label="Descartar" size="small" severity="secondary" variant="text" @click="discardDraft" />
        </div>

        <!-- ── Corpo com scroll ──────────────────────────────────────── -->
        <div class="ncr-body">
          <div class="ncr-layout">

            <!-- ── Coluna principal (esquerda) ─────────────────────── -->
            <div class="ncr-col-main">

              <!-- Card: Dados do lançamento -->
              <Card class="ncr-card">
                <template #title>
                  <div class="ncr-card-title">
                    <i class="pi pi-file-edit" />
                    Dados do lançamento
                  </div>
                </template>
                <template #content>
                  <div class="ncr-fields">

                    <!-- Cliente + Valor -->
                    <div class="ncr-row ncr-row--cliente-valor">
                      <div class="ncr-field">
                        <div class="ncr-field-action-wrap">
                          <FloatLabel variant="on" class="ncr-fl-grow">
                            <AutoComplete
                              inputId="ncr-cliente"
                              v-model="form.cliente"
                              :suggestions="clientesSugestoes"
                              :invalid="errors.cliente"
                              force-selection
                              dropdown
                              fluid
                              @complete="searchCliente"
                            />
                            <label for="ncr-cliente">Cliente <span class="ncr-req">*</span></label>
                          </FloatLabel>
                          <Button
                            icon="pi pi-plus"
                            variant="outlined"
                            severity="secondary"
                            class="ncr-action-btn"
                            aria-label="Novo cliente"
                            v-tooltip.top="'Cadastrar novo cliente'"
                            @click="abrirNovoCliente"
                          />
                        </div>
                        <small v-if="errors.cliente" class="ncr-error">Informe o cliente</small>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <InputNumber
                            inputId="ncr-valor"
                            v-model="form.valor"
                            mode="currency"
                            currency="BRL"
                            locale="pt-BR"
                            :invalid="errors.valor"
                            fluid
                          />
                          <label for="ncr-valor">Valor <span class="ncr-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.valor" class="ncr-error">Informe o valor</small>
                      </div>
                    </div>

                    <!-- Vencimento + Data de emissão + Competência -->
                    <div class="ncr-row ncr-row--3">
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncr-vencimento"
                            v-model="form.vencimento"
                            date-format="dd/mm/yy"
                            show-button-bar
                            :invalid="errors.vencimento"
                            fluid
                          />
                          <label for="ncr-vencimento">Vencimento <span class="ncr-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.vencimento" class="ncr-error">Informe o vencimento</small>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncr-dataEmissao"
                            v-model="form.dataEmissao"
                            date-format="dd/mm/yy"
                            show-button-bar
                            :invalid="errors.dataEmissao"
                            fluid
                          />
                          <label for="ncr-dataEmissao">Data de emissão <span class="ncr-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.dataEmissao" class="ncr-error">Informe a data de emissão</small>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncr-competencia"
                            v-model="form.competencia"
                            view="month"
                            date-format="mm/yy"
                            show-button-bar
                            fluid
                          />
                          <label for="ncr-competencia">
                            Competência
                            <i
                              class="pi pi-info-circle ncr-info-icon"
                              v-tooltip.top="'Mês/ano ao qual este lançamento pertence contabilmente'"
                            />
                          </label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Nº do documento + Juros mensal + Multa -->
                    <div class="ncr-row ncr-row--3">
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <IconField>
                            <InputIcon class="pi pi-hashtag" />
                            <InputText id="ncr-nroDocumento" v-model="form.nroDocumento" fluid />
                          </IconField>
                          <label for="ncr-nroDocumento">Nº do documento</label>
                        </FloatLabel>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <InputNumber
                            inputId="ncr-jurosMensal"
                            v-model="form.jurosMensal"
                            :min-fraction-digits="2"
                            :max-fraction-digits="2"
                            suffix=" %"
                            fluid
                          />
                          <label for="ncr-jurosMensal">Juros mensal</label>
                        </FloatLabel>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <InputGroup>
                            <InputNumber
                              inputId="ncr-multa"
                              v-model="form.multa"
                              :mode="multaTipo === 'currency' ? 'currency' : 'decimal'"
                              :currency="multaTipo === 'currency' ? 'BRL' : undefined"
                              :locale="multaTipo === 'currency' ? 'pt-BR' : undefined"
                              :suffix="multaTipo === 'percent' ? ' %' : undefined"
                              :min-fraction-digits="2"
                              :max-fraction-digits="2"
                              fluid
                            />
                            <InputGroupAddon
                              class="ncr-unit-toggle"
                              @click="multaTipo = multaTipo === 'percent' ? 'currency' : 'percent'"
                              v-tooltip.top="multaTipo === 'percent' ? 'Mudar para reais' : 'Mudar para porcentagem'"
                            >
                              {{ multaTipo === 'percent' ? '%' : 'R$' }}
                            </InputGroupAddon>
                          </InputGroup>
                          <label for="ncr-multa">Multa</label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Divider: pagamento & classificação -->
                    <div class="ncr-fields-divider"></div>

                    <!-- Forma de pagamento + Conta financeira -->
                    <div class="ncr-row ncr-row--2">
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncr-formaPagamento"
                            v-model="form.formaPagamento"
                            :options="formaPagamentoOptions"
                            fluid
                          />
                          <label for="ncr-formaPagamento">Forma de pagamento</label>
                        </FloatLabel>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncr-contaFinanceira"
                            v-model="form.contaFinanceiraId"
                            :options="contasFinanceirasStore.items"
                            optionLabel="nome"
                            optionValue="id"
                            :invalid="errors.contaFinanceiraId"
                            fluid
                          />
                          <label for="ncr-contaFinanceira">Conta financeira</label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Nº no banco + Categoria + Vendedor -->
                    <div class="ncr-row ncr-row--3">
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <IconField>
                            <InputIcon class="pi pi-building-columns" />
                            <InputText id="ncr-nroBanco" v-model="form.nroBanco" fluid />
                          </IconField>
                          <label for="ncr-nroBanco">
                            Nº no banco
                            <i
                              class="pi pi-info-circle ncr-info-icon"
                              v-tooltip.top="'Número do documento gerado pelo banco (ex.: nosso número do boleto)'"
                            />
                          </label>
                        </FloatLabel>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncr-categoria"
                            v-model="form.categoria"
                            :options="categoriaOptions"
                            optionGroupLabel="label"
                            optionGroupChildren="items"
                            :invalid="errors.categoria"
                            fluid
                          />
                          <label for="ncr-categoria">Categoria <span class="ncr-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.categoria" class="ncr-error">Informe a categoria</small>
                      </div>
                      <div class="ncr-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncr-vendedor"
                            v-model="form.vendedor"
                            :options="vendedorOptions"
                            fluid
                          />
                          <label for="ncr-vendedor">Vendedor</label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Divider: recorrência -->
                    <div class="ncr-fields-divider"></div>

                    <!-- Ocorrência -->
                    <div class="ncr-field ncr-field--static">
                      <label class="ncr-label">Ocorrência</label>
                      <SelectButton
                        v-model="form.ocorrencia"
                        :options="ocorrenciaOptions"
                        option-label="label"
                        option-value="value"
                        class="ncr-ocorrencia"
                      />
                    </div>

                    <!-- Campos de recorrência (condicional) -->
                    <Transition name="ncr-expand">
                      <div v-if="isRecorrente" class="ncr-row ncr-row--2">
                        <div class="ncr-field">
                          <FloatLabel variant="on">
                            <Select
                              inputId="ncr-frequencia"
                              v-model="form.frequencia"
                              :options="frequenciaOptions"
                              fluid
                            />
                            <label for="ncr-frequencia">Frequência</label>
                          </FloatLabel>
                        </div>
                        <div class="ncr-field">
                          <FloatLabel variant="on">
                            <Select
                              inputId="ncr-parcelas"
                              v-model="form.parcelas"
                              :options="parcelasOptions"
                              :virtualScrollerOptions="{ itemSize: 38 }"
                              fluid
                            />
                            <label for="ncr-parcelas">Nº de parcelas</label>
                          </FloatLabel>
                        </div>
                      </div>
                    </Transition>

                  </div>
                </template>
              </Card>

              <!-- Card: Descrição -->
              <Card class="ncr-card">
                <template #title>
                  <div class="ncr-card-title">
                    <i class="pi pi-align-left" />
                    Descrição
                  </div>
                </template>
                <template #content>
                  <div class="ncr-fields">

                    <div class="ncr-field">
                      <FloatLabel variant="on">
                        <Textarea
                          id="ncr-historico"
                          v-model="form.historico"
                          rows="4"
                          :maxlength="HISTORICO_MAX"
                          auto-resize
                          fluid
                        />
                        <label for="ncr-historico">Histórico</label>
                      </FloatLabel>
                      <small class="ncr-char-count">{{ form.historico.length }}/{{ HISTORICO_MAX }}</small>
                    </div>

                  </div>
                </template>
              </Card>

              <!-- Card: Anexos -->
              <Card class="ncr-card">
                <template #title>
                  <div class="ncr-card-title">
                    <i class="pi pi-paperclip" />
                    Anexos
                    <span v-if="anexos.length" class="ncr-badge">{{ anexos.length }}</span>
                    <span v-if="uploadingAnexos" class="ncr-uploading">
                      <i class="pi pi-spin pi-spinner" /> Enviando…
                    </span>
                  </div>
                </template>
                <template #content>
                  <!-- Drop zone -->
                  <FileUpload
                    ref="fileUploadRef"
                    :multiple="true"
                    accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx"
                    :max-file-size="10485760"
                    :show-upload-button="false"
                    :show-cancel-button="false"
                    :auto="false"
                    choose-label="Selecionar arquivos"
                    choose-icon="pi pi-upload"
                    invalid-file-size-message="{0}: tamanho inválido — máx. {1}."
                    @select="onFileSelect"
                  >
                    <template #empty>
                      <div class="ncr-upload-empty">
                        <i class="pi pi-cloud-upload ncr-upload-empty-icon" />
                        <p class="ncr-upload-empty-label">Arraste arquivos aqui</p>
                        <p class="ncr-upload-empty-hint">PDF, imagens, planilhas — máx. 10 MB por arquivo</p>
                      </div>
                    </template>
                  </FileUpload>

                  <!-- Lista de arquivos enviados -->
                  <ul v-if="anexos.length" class="ncr-anexos-list">
                    <li v-for="a in anexos" :key="a.path" class="ncr-anexo-item">
                      <i class="pi pi-file ncr-anexo-icon" />
                      <div class="ncr-anexo-info">
                        <a :href="a.url" target="_blank" class="ncr-anexo-nome">{{ a.nome }}</a>
                        <span class="ncr-anexo-tamanho">{{ fmtBytes(a.tamanho) }}</span>
                      </div>
                      <Button
                        icon="pi pi-trash"
                        variant="text"
                        severity="danger"
                        size="small"
                        rounded
                        v-tooltip.top="'Remover'"
                        @click="removeAnexo(a)"
                      />
                    </li>
                  </ul>
                </template>
              </Card>

            </div><!-- /.ncr-col-main -->

            <!-- ── Coluna lateral (direita) — Histórico ───────────── -->
            <div class="ncr-col-side">

              <Card class="ncr-card ncr-card--sticky">
                <template #title>
                  <div class="ncr-card-title">
                    <i class="pi pi-history" />
                    Histórico de eventos
                  </div>
                </template>
                <template #content>

                  <!-- Modo edição: timeline -->
                  <template v-if="isEditing">
                    <ul class="ncr-tl-list">
                      <li
                        v-for="(item, idx) in historicoMock"
                        :key="item.id"
                        class="ncr-tl-item"
                      >
                        <div class="ncr-tl-left">
                          <span
                            class="ncr-tl-marker"
                            :style="{ background: tipoConfig[item.tipo]?.color ?? 'var(--p-primary-color)' }"
                          ><i :class="tipoConfig[item.tipo]?.icon ?? 'pi pi-circle'" /></span>
                          <div v-if="idx < historicoMock.length - 1" class="ncr-tl-line" />
                        </div>
                        <div class="ncr-tl-event">
                          <span class="ncr-tl-event-label">{{ tipoConfig[item.tipo]?.label ?? item.tipo }}</span>
                          <span class="ncr-tl-event-date">{{ fmtEventDate(item.data_evento) }}</span>
                          <p class="ncr-tl-event-desc">{{ item.descricao }}</p>
                          <span class="ncr-tl-event-user"><i class="pi pi-user" /> {{ item.usuario }}</span>
                        </div>
                      </li>
                    </ul>
                  </template>

                  <!-- Modo criação: empty state -->
                  <div v-else class="ncr-tl-empty">
                    <i class="pi pi-history ncr-tl-empty-icon" />
                    <span class="ncr-tl-empty-title">Sem histórico ainda</span>
                    <span class="ncr-tl-empty-hint">Os eventos aparecerão aqui após salvar a conta.</span>
                  </div>

                </template>
              </Card>

            </div><!-- /.ncr-col-side -->

          </div><!-- /.ncr-layout -->
        </div><!-- /.ncr-body -->

        <!-- ── Footer fixo ───────────────────────────────────────────── -->
        <footer class="ncr-footer">
          <span class="ncr-footer-hint"><span class="ncr-req">*</span> Campos obrigatórios</span>
          <Transition name="ncr-draft-ts">
            <span v-if="!isEditing && draftSavedAt" class="ncr-draft-ts">
              <i class="pi pi-cloud-check" />
              Rascunho salvo {{ draftSavedAgo }}
            </span>
          </Transition>
        </footer>

      </div><!-- /.ncr-page -->
    </Transition>
  </Teleport>

  <NovoClienteDialog
    v-model="showNovoCliente"
    :initial-nome="novoClienteNome"
    @created="onClienteCriado"
  />
</template>

<style scoped>
/* ── Página ────────────────────────────────────────────────────────────── */
.ncr-page {
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

/* ── Cabeçalho ─────────────────────────────────────────────────────────── */
.ncr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.5rem 0.625rem 0.75rem;
  background: var(--p-surface-ground);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  gap: 0.75rem;
}

.ncr-header-start {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.ncr-header-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncr-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Corpo ─────────────────────────────────────────────────────────────── */
.ncr-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 2rem;
  scrollbar-gutter: stable;
  background-color: var(--p-surface-ground);
}

/* ── Grid: coluna principal + lateral ─────────────────────────────────── */
.ncr-layout {
  display: grid;
  grid-template-columns: 1fr 22rem;
  gap: 1.25rem;
  align-items: start;
}

.ncr-col-main,
.ncr-col-side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Cards ─────────────────────────────────────────────────────────────── */
.ncr-card {
  box-shadow: none !important;
}

.ncr-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncr-card-title .pi:not(.ncr-collapse-icon) {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Badge de contagem (Anexos) */
.ncr-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--p-primary-color);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1;
}


/* ── Campos ────────────────────────────────────────────────────────────── */
.ncr-fields {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.ncr-row {
  display: grid;
  gap: 1rem;
}

.ncr-row--2 {
  grid-template-columns: 1fr 1fr;
}

.ncr-row--3 {
  grid-template-columns: 1fr 1fr 1fr;
}

/* Cliente ocupa 2/3 da linha; Valor ocupa 1/3 */
.ncr-row--cliente-valor {
  grid-template-columns: 2fr 1fr;
}

.ncr-field {
  display: flex;
  flex-direction: column;
}

/* Campo estático sem FloatLabel (Ocorrência) */
.ncr-field--static {
  gap: 0.375rem;
}

.ncr-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-color);
  user-select: none;
}

.ncr-req {
  color: var(--p-red-500);
  margin-left: 0.1em;
}

/* Campo com botão de ação ao lado (Cliente) */
.ncr-field-action-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ncr-fl-grow {
  flex: 1;
  min-width: 0;
}

.ncr-action-btn {
  flex-shrink: 0;
}

/* Erros de validação */
.ncr-error {
  font-size: 0.75rem;
  color: var(--p-red-500);
  margin-top: 0.25rem;
}

/* Contador de caracteres */
.ncr-char-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-align: right;
  margin-top: 0.25rem;
}

/* Ícone de info dentro do label */
.ncr-info-icon {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  margin-left: 0.25rem;
  cursor: help;
}


/* ── Altura uniforme dos inputs de linha única ─────────────────────────── */
/*
  Cada componente PrimeVue gera estruturas HTML diferentes.
  Normalizamos o wrapper externo para 2.5rem e ajustamos os internos.
  .p-textarea é excluído pois tem auto-resize.
*/
:deep(.p-inputtext),
:deep(.p-select),
:deep(.p-datepicker),
:deep(.p-inputnumber) {
  height: 2.5rem;
}

/* Select: label interno deve preencher o container */
:deep(.p-select .p-select-label) {
  display: flex;
  align-items: center;
  padding-block: 0;
}

/* DatePicker: input interno herda a altura do wrapper */
:deep(.p-datepicker .p-datepicker-input) {
  height: 100%;
  padding-block: 0;
}

/* InputNumber: input interno herda a altura do wrapper */
:deep(.p-inputnumber .p-inputtext) {
  height: 100%;
  padding-block: 0;
}

/* IconField largura total */
:deep(.p-icon-field) {
  width: 100%;
}

/* Toggle de unidade da Multa */
.ncr-unit-toggle {
  cursor: pointer;
  user-select: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  transition: background 0.15s ease, color 0.15s ease;
  min-width: 2.5rem;
  justify-content: center;
}

.ncr-unit-toggle:hover {
  background: var(--p-surface-hover);
  color: var(--p-text-color);
}

/* SelectButton de Ocorrência — largura total */
.ncr-ocorrencia {
  display: flex;
}

:deep(.ncr-ocorrencia.p-selectbutton) {
  display: flex;
  width: 100%;
}

:deep(.ncr-ocorrencia .p-togglebutton) {
  flex: 1;
}

/* ── Footer fixo ───────────────────────────────────────────────────────── */
.ncr-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.75rem;
  background: var(--p-surface-ground);
  border-top: 1px solid var(--p-surface-border);
  gap: 1rem;
}

.ncr-footer-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── Timestamp de rascunho salvo ─────────────────────────────────────────────── */
.ncr-draft-ts {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--p-green-600, #16a34a);
  font-weight: 500;
  margin-left: auto;
  transition: opacity 0.3s ease;
}

.ncr-draft-ts .pi {
  font-size: 0.8125rem;
}

.ncr-draft-ts-enter-active,
.ncr-draft-ts-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.ncr-draft-ts-enter-from,
.ncr-draft-ts-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ── FileUpload — empty state ────────────────────────────────────────────── */
.ncr-upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.5rem 1rem;
  text-align: center;
  pointer-events: none;
}

.ncr-upload-empty-icon {
  font-size: 1.75rem;
  color: var(--p-text-muted-color);
  opacity: 0.5;
}

.ncr-upload-empty-label {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.ncr-upload-empty-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Remove a borda/padding extra do root do FileUpload dentro do Card */
:deep(.p-fileupload) {
  border: none;
  background: transparent;
}

/* ── Transições ────────────────────────────────────────────────────────── */
.ncr-slide-enter-active,
.ncr-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.ncr-slide-enter-from,
.ncr-slide-leave-to {
  transform: translateX(100%);
}

.ncr-expand-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ncr-expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ncr-expand-enter-from,
.ncr-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Responsivo ────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .ncr-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .ncr-page {
    left: 0;
    border-radius: 0;
  }

  .ncr-col-side {
    grid-template-columns: 1fr;
  }

  .ncr-body {
    padding: 1rem 1rem 2rem;
  }

  .ncr-footer {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .ncr-row--2,
  .ncr-row--3,
  .ncr-row--cliente-valor {
    grid-template-columns: 1fr;
  }
}

/* ── Barra de rascunho ───────────────────────────────────────────────────────── */
.ncr-draft-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.5rem;
  background: var(--p-amber-50, #fffbeb);
  border-bottom: 1px solid var(--p-amber-200, #fde68a);
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--p-amber-700, #b45309);
}

.ncr-draft-bar > .pi {
  font-size: 1rem;
  flex-shrink: 0;
}

.ncr-draft-bar > span {
  flex: 1;
  min-width: 0;
}

/* ── Indicador de upload em andamento ────────────────────────────────────────── */
.ncr-uploading {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
  margin-left: auto;
}

/* ── Lista de anexos enviados ────────────────────────────────────────────────── */
.ncr-anexos-list {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ncr-anexo-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 0.375rem;
  background: var(--p-surface-ground);
}

.ncr-anexo-icon {
  font-size: 1.125rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.ncr-anexo-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.ncr-anexo-nome {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-primary-600, #2563eb);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ncr-anexo-nome:hover {
  text-decoration: underline;
}

.ncr-anexo-tamanho {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── Divisor visual entre seções do formulário ───────────────────────────── */
.ncr-fields-divider {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

/* ── Card sticky na lateral ──────────────────────────────────────────────── */
.ncr-card--sticky {
  position: sticky;
  top: 1.5rem;
  max-height: calc(100vh - 10rem);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* ── Empty state do histórico ────────────────────────────────────────────── */
.ncr-tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  text-align: center;
}

.ncr-tl-empty-icon {
  font-size: 2rem;
  color: var(--p-text-muted-color);
  opacity: 0.4;
}

.ncr-tl-empty-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.ncr-tl-empty-hint {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

/* ── Timeline custom ─────────────────────────────────────────────────────── */
.ncr-tl-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ncr-tl-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.ncr-tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2rem;
}

.ncr-tl-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.ncr-tl-line {
  width: 2px;
  flex: 1;
  min-height: 0.75rem;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

.ncr-tl-event {
  flex: 1;
  min-width: 0;
  padding-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ncr-tl-event-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.3;
}

.ncr-tl-event-date {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.ncr-tl-event-desc {
  margin: 0.1rem 0 0;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  line-height: 1.5;
}

.ncr-tl-event-user {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
