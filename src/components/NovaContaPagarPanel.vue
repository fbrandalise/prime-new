<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useContasAPagarStore } from '@/stores/contasAPagar'
import { useContasFinanceirasStore } from '@/stores/contasFinanceiras'
import { useFornecedoresStore } from '@/stores/fornecedores'
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
import NovoFornecedorDialog from '@/components/NovoFornecedorDialog.vue'
import { processDocument, uploadDocument } from '@/composables/useDocumentAI'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editItem:   { type: Object,  default: null  },
})

const emit = defineEmits(['update:modelValue'])
const close = () => {
  submitted.value = false
  emit('update:modelValue', false)
}

const isEditing = computed(() => !!props.editItem)

const store = useContasAPagarStore()
const contasFinanceirasStore = useContasFinanceirasStore()
const fornecedoresStore = useFornecedoresStore()
const toast = useToast()
const saving = ref(false)

// Carrega fornecedores ao abrir (apenas uma vez)
onMounted(() => { if (!fornecedoresStore.items.length) fornecedoresStore.fetchAll() })

// ── Dialog de novo fornecedor ──────────────────────────────────────────────
const showNovoFornecedor = ref(false)
const novoFornecedorNome = ref('')

const abrirNovoFornecedor = () => {
  // Pré-preenche com o texto já digitado no campo
  novoFornecedorNome.value = typeof form.value.fornecedor === 'string' ? form.value.fornecedor : ''
  showNovoFornecedor.value = true
}

const onFornecedorCriado = (fornecedor) => {
  form.value.fornecedor = fornecedor.nome
}

// ── AutoComplete de fornecedores ──────────────────────────────────────────
const fornecedoresSugestoes = ref([])
const searchFornecedor = ({ query }) => {
  const q = query.toLowerCase()
  fornecedoresSugestoes.value = fornecedoresStore.items
    .filter(f => f.nome.toLowerCase().includes(q))
    .map(f => f.nome)
}

// ── Histórico de eventos — configuração de tipos ──────────────────────────
const tipoConfig = {
  conta_gerada:   { icon: 'pi pi-plus-circle',          label: 'Conta a pagar gerada',         color: '#3b82f6' },
  nf_recebida:    { icon: 'pi pi-file',                 label: 'Nota fiscal recebida',          color: '#6366f1' },
  boleto_gerado:  { icon: 'pi pi-barcode',              label: 'Boleto gerado',                 color: '#06b6d4' },
  parcela_gerada: { icon: 'pi pi-copy',                 label: 'Parcela(s) gerada(s)',          color: '#14b8a6' },
  lembrete:       { icon: 'pi pi-bell',                 label: 'Lembrete de vencimento',        color: '#eab308' },
  vencimento_alt: { icon: 'pi pi-calendar',             label: 'Vencimento alterado',           color: '#f97316' },
  juros:          { icon: 'pi pi-exclamation-triangle', label: 'Juros e multa aplicados',       color: '#ef4444' },
  acordo:         { icon: 'pi pi-users',                label: 'Acordo de pagamento',           color: '#a855f7' },
  pagto_parcial:  { icon: 'pi pi-wallet',               label: 'Pagamento parcial realizado',   color: '#22c55e' },
  paga:           { icon: 'pi pi-check-circle',         label: 'Conta paga',                    color: '#16a34a' },
}

const historicoMock = computed(() => {
  if (!props.editItem) return []
  const fmtVal = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((v ?? 0) / 100)
  return [
    { id: 1, tipo: 'nf_recebida',    descricao: 'NF-e 000.789 recebida do fornecedor.',                              data_evento: '2025-01-08T10:00:00Z', usuario: 'Carlos Silva' },
    { id: 2, tipo: 'conta_gerada',   descricao: `Conta a pagar gerada — ${fmtVal(props.editItem._valorCentavos)}.`,  data_evento: '2025-01-08T10:05:00Z', usuario: 'Sistema' },
    { id: 3, tipo: 'boleto_gerado',  descricao: 'Boleto bancário gerado para pagamento.',                            data_evento: '2025-01-08T10:06:00Z', usuario: 'Sistema' },
    { id: 4, tipo: 'lembrete',       descricao: 'Lembrete de vencimento enviado internamente.',                      data_evento: '2025-02-03T08:00:00Z', usuario: 'Sistema' },
    { id: 5, tipo: 'vencimento_alt', descricao: 'Vencimento postergado de 10/02 para 20/02/2025.',                   data_evento: '2025-02-07T14:22:00Z', usuario: 'Ana Costa' },
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
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
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
    fornecedor:        raw.fornecedor,
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
    jurosMensal:       raw.juros_mensal      ?? null,
    multa:             raw.multa             ?? null,
  }
  multaTipo.value = raw.multa_tipo ?? 'percent'
})

// ── Estado do formulário ───────────────────────────────────────────────────
const form = ref({
  fornecedor: null,
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
  jurosMensal: null,
  multa: null,
})

// ── Opções ─────────────────────────────────────────────────────────────────
const formaPagamentoOptions = [
  'Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito',
  'Transferência Bancária', 'Dinheiro', 'Cheque',
]
const categoriaOptions = [
  { label: 'Compras e Custos Diretos', items: [
    'Compras de Mercadorias',
    'Matérias-primas e Insumos',
    'Embalagens e Materiais de Envio',
    'Serviços de Produção / Industrialização',
    'Ferramentas, Equipamentos e Manutenção de Produção',
    'Frete sobre Compras',
  ]},
  { label: 'Logística e Entregas', items: [
    'Fretes Pagos',
    'Transportadoras / Correios / Coletas',
    'Logística Reversa (Devoluções e Trocas)',
    'Armazenagem / Centros de Distribuição',
  ]},
  { label: 'Marketing, Vendas e Marketplaces', items: [
    'Taxas de Marketplaces (comissão, tarifas por venda)',
    'Taxas de Intermediação de Canal',
    'Ads Internos de Marketplace',
    'Promoções e Incentivos de Canal',
    'Comissões de Vendedores / Representantes / Afiliados',
    'Anúncios Externos (Meta, Google, TikTok etc.)',
    'Marketing de Performance e Campanhas',
    'Ferramentas de Marketing / Automação',
    'Materiais Promocionais / Brindes',
  ]},
  { label: 'Serviços Operacionais e Tecnologia', items: [
    'Plataformas e Assinaturas (ERP, E-commerce, CRM)',
    'Ferramentas de Integração',
    'Serviços Terceirizados',
    'Hospedagem / Servidores / Cloud',
    'Aplicativos e Licenças',
  ]},
  { label: 'Despesas Administrativas', items: [
    'Aluguel',
    'Condomínio e Manutenção Predial',
    'Água',
    'Luz',
    'Internet',
    'Telefonia',
    'Limpeza e Conservação',
    'Segurança e Monitoramento',
    'Contabilidade e Serviços Fiscais',
    'Consultorias Administrativas / Financeiras',
    'Licenças, Registros e Taxas Empresariais',
  ]},
  { label: 'Pessoal e Folha', items: [
    'Salários',
    'Pró-labore',
    'INSS',
    'FGTS',
    'GPS',
    'Benefícios (VR, VA, Transporte, Saúde)',
    'Férias / 13º / Adiantamentos',
    'Rescisões',
    'Treinamentos e Capacitações',
    'Recrutamento e Seleção',
  ]},
  { label: 'Despesas Financeiras', items: [
    'Tarifas Bancárias',
    'Taxas de Cartão / Gateway',
    'Encargos de Gateway / Split / Saque',
    'Despesas de Antecipação de Recebíveis',
    'Juros Pagos',
    'Multas Pagas',
    'Tarifas de Boleto / PIX',
  ]},
  { label: 'Impostos e Taxas', items: [
    'Impostos Federais (DAS, DARF, IRPJ/CSLL)',
    'Impostos Estaduais (ICMS, ST)',
    'Impostos Municipais (ISS, Alvará, Fiscalização)',
    'Encargos sobre Folha (INSS, FGTS)',
    'Multas e Juros Tributários',
    'Parcelamentos e REFIS',
    'Diferenças e Ajustes de Apuração',
    'Custas e Honorários Fiscais',
  ]},
  { label: 'Outras Despesas', items: [
    'Reembolsos / Perdas',
    'Doações / Patrocínios',
    'Ajustes Contábeis',
    'Despesas Eventuais Não Recorrentes',
  ]},
  { label: 'Outras Despesas Não Operacionais', items: [
    'Empréstimos Concedidos',
    'Retirada de Sócios',
  ]},
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
const multaTipo = ref('percent')

// ── Derivados ──────────────────────────────────────────────────────────────
const isRecorrente = computed(() => form.value.ocorrencia === 'Recorrente')


// ── Validação ──────────────────────────────────────────────────────────────
const submitted = ref(false)
const errors = computed(() => ({
  fornecedor:        submitted.value && !form.value.fornecedor,
  valor:             submitted.value && !form.value.valor,
  vencimento:        submitted.value && !form.value.vencimento,
  dataEmissao:       submitted.value && !form.value.dataEmissao,
  categoria:         submitted.value && !form.value.categoria,
  contaFinanceiraId: submitted.value && !form.value.contaFinanceiraId,
}))

const save = async () => {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) return
  saving.value = true
  try {
    let documentoUrl = null
    if (!isEditing.value && aiFile.value) {
      try { documentoUrl = await uploadDocument(aiFile.value) } catch (_) { /* upload opcional */ }
    }
    const formData = { ...form.value, multaTipo: multaTipo.value, documentoUrl }
    if (isEditing.value) {
      await store.update(props.editItem.id, formData)
      toast.add({ severity: 'success', summary: 'Salvo', detail: 'Conta a pagar atualizada com sucesso.', life: 3000 })
    } else {
      await store.create(formData)
      toast.add({ severity: 'success', summary: 'Criado', detail: 'Conta a pagar criada com sucesso.', life: 3000 })
    }
    form.value = {
      fornecedor: null, valor: null, dataEmissao: new Date(), competencia: new Date(),
      vencimento: null, historico: '', nroDocumento: '', ocorrencia: 'Única',
      frequencia: 'Mensal', parcelas: null, formaPagamento: 'PIX',
      contaFinanceiraId: null, nroBanco: '', categoria: null,
      jurosMensal: null, multa: null,
    }
    submitted.value   = false
    anexos.value      = []
    aiFile.value      = null
    aiProcessed.value = false
    fileUploadRef.value?.clear()
    aiFileUploadRef.value?.clear()
    close()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar a conta a pagar.', life: 4000 })
  } finally {
    saving.value = false
  }
}

// ── Histórico ──────────────────────────────────────────────────────────────
const HISTORICO_MAX = 500

// ── Anexos ─────────────────────────────────────────────────────────────────
const fileUploadRef = ref(null)
const anexos = ref([])

const onFileSelect  = ({ files }) => { anexos.value = [...files] }
const onFileRemove  = ({ files }) => { anexos.value = [...files] }
const onFileClear   = ()          => { anexos.value = [] }

// ── IA: upload individual para auto-preenchimento ──────────────────────────
const aiFileUploadRef = ref(null)
const aiFile          = ref(null)
const processingAI    = ref(false)
const aiProcessed     = ref(false)

const onAiFileSelect = ({ files }) => {
  aiFile.value     = files[0] ?? null
  aiProcessed.value = false
}
const onAiFileClear = () => {
  aiFile.value      = null
  aiProcessed.value = false
}

const processWithAI = async () => {
  if (!aiFile.value) return
  processingAI.value = true
  try {
    const data = await processDocument(aiFile.value)

    // Preenche os campos do formulário com os dados extraídos
    if (data.fornecedor) form.value.fornecedor = data.fornecedor
    if (data.valor)      form.value.valor      = Number(data.valor)
    if (data.vencimento) {
      const [y, m, d] = data.vencimento.split('-')
      form.value.vencimento = new Date(+y, +m - 1, +d)
    }
    if (data.nro_documento) form.value.nroDocumento = data.nro_documento
    if (data.historico)     form.value.historico    = data.historico

    aiProcessed.value = true
    toast.add({ severity: 'success', summary: 'IA concluiu', detail: 'Campos preenchidos automaticamente. Revise antes de salvar.', life: 4000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro na IA', detail: err?.message ?? 'Não foi possível processar o documento.', life: 5000 })
  } finally {
    processingAI.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="ncp-slide">
      <div
        v-if="modelValue"
        class="ncp-page"
        role="dialog"
        aria-modal="true"
        :aria-label="isEditing ? 'Editar conta a pagar' : 'Nova conta a pagar'"
      >

        <!-- ── Cabeçalho ─────────────────────────────────────────────── -->
        <header class="ncp-header">
          <div class="ncp-header-start">
            <Button
              icon="pi pi-arrow-left"
              variant="text"
              rounded
              aria-label="Voltar"
              @click="close"
            />
            <span class="ncp-header-title">
              {{ isEditing ? 'Editar conta a pagar' : 'Nova conta a pagar' }}
            </span>
          </div>
          <div class="ncp-header-end">
            <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
            <Button
              :label="isEditing ? 'Salvar alterações' : 'Salvar conta'"
              icon="pi pi-check"
              :loading="saving"
              @click="save"
            />
          </div>
        </header>

        <!-- ── Corpo com scroll ──────────────────────────────────────── -->
        <div class="ncp-body">
          <div class="ncp-layout">

            <!-- ── Coluna principal (esquerda) ─────────────────────── -->
            <div class="ncp-col-main">

              <!-- Card: Importar Documento com IA (só no modo criação) -->
              <Card v-if="!isEditing" class="ncp-card ncp-card--ai">
                <template #title>
                  <div class="ncp-card-title">
                    <i class="pi pi-sparkles" style="color: var(--p-primary-color)" />
                    Importar documento com IA
                    <span class="ncp-ai-badge">Beta</span>
                  </div>
                </template>
                <template #content>
                  <p class="ncp-ai-hint">
                    Faça upload de um boleto ou nota fiscal e a IA preencherá os campos automaticamente.
                  </p>
                  <FileUpload
                    ref="aiFileUploadRef"
                    mode="basic"
                    accept=".pdf,.jpg,.jpeg,.png"
                    :max-file-size="10485760"
                    choose-label="Selecionar documento"
                    choose-icon="pi pi-upload"
                    :auto="false"
                    invalid-file-size-message="{0}: tamanho inválido — máx. {1}."
                    @select="onAiFileSelect"
                    @clear="onAiFileClear"
                  />
                  <div v-if="aiFile" class="ncp-ai-file-row">
                    <i class="pi pi-file ncp-ai-file-icon" />
                    <span class="ncp-ai-file-name">{{ aiFile.name }}</span>
                    <Button
                      label="Processar com IA"
                      icon="pi pi-sparkles"
                      :loading="processingAI"
                      :disabled="processingAI"
                      size="small"
                      @click="processWithAI"
                    />
                  </div>
                  <div v-if="aiProcessed" class="ncp-ai-success">
                    <i class="pi pi-check-circle" />
                    Dados extraídos! Revise os campos abaixo antes de salvar.
                  </div>
                </template>
              </Card>

              <!-- Card: Dados do lançamento -->
              <Card class="ncp-card">
                <template #title>
                  <div class="ncp-card-title">
                    <i class="pi pi-file-edit" />
                    Dados do lançamento
                  </div>
                </template>
                <template #content>
                  <div class="ncp-fields">

                    <!-- Fornecedor + Valor -->
                    <div class="ncp-row ncp-row--fornecedor-valor">
                      <div class="ncp-field">
                        <div class="ncp-field-action-wrap">
                          <FloatLabel variant="on" class="ncp-fl-grow">
                            <AutoComplete
                              inputId="ncp-fornecedor"
                              v-model="form.fornecedor"
                              :suggestions="fornecedoresSugestoes"
                              :invalid="errors.fornecedor"
                              force-selection
                              dropdown
                              fluid
                              @complete="searchFornecedor"
                            />
                            <label for="ncp-fornecedor">Fornecedor <span class="ncp-req">*</span></label>
                          </FloatLabel>
                          <Button
                            icon="pi pi-plus"
                            variant="outlined"
                            severity="secondary"
                            class="ncp-action-btn"
                            aria-label="Novo fornecedor"
                            v-tooltip.top="'Cadastrar novo fornecedor'"
                            @click="abrirNovoFornecedor"
                          />
                        </div>
                        <small v-if="errors.fornecedor" class="ncp-error">Informe o fornecedor</small>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <InputNumber
                            inputId="ncp-valor"
                            v-model="form.valor"
                            mode="currency"
                            currency="BRL"
                            locale="pt-BR"
                            :invalid="errors.valor"
                            fluid
                          />
                          <label for="ncp-valor">Valor <span class="ncp-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.valor" class="ncp-error">Informe o valor</small>
                      </div>
                    </div>

                    <!-- Vencimento + Data de emissão + Competência -->
                    <div class="ncp-row ncp-row--3">
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncp-vencimento"
                            v-model="form.vencimento"
                            date-format="dd/mm/yy"
                            show-button-bar
                            :invalid="errors.vencimento"
                            fluid
                          />
                          <label for="ncp-vencimento">Vencimento <span class="ncp-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.vencimento" class="ncp-error">Informe o vencimento</small>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncp-dataEmissao"
                            v-model="form.dataEmissao"
                            date-format="dd/mm/yy"
                            show-button-bar
                            :invalid="errors.dataEmissao"
                            fluid
                          />
                          <label for="ncp-dataEmissao">Data de emissão <span class="ncp-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.dataEmissao" class="ncp-error">Informe a data de emissão</small>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <DatePicker
                            inputId="ncp-competencia"
                            v-model="form.competencia"
                            view="month"
                            date-format="mm/yy"
                            show-button-bar
                            fluid
                          />
                          <label for="ncp-competencia">
                            Competência
                            <i
                              class="pi pi-info-circle ncp-info-icon"
                              v-tooltip.top="'Mês/ano ao qual este lançamento pertence contabilmente'"
                            />
                          </label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Nº do documento + Juros mensal + Multa -->
                    <div class="ncp-row ncp-row--3">
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <IconField>
                            <InputIcon class="pi pi-hashtag" />
                            <InputText id="ncp-nroDocumento" v-model="form.nroDocumento" fluid />
                          </IconField>
                          <label for="ncp-nroDocumento">Nº do documento</label>
                        </FloatLabel>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <InputNumber
                            inputId="ncp-jurosMensal"
                            v-model="form.jurosMensal"
                            :min-fraction-digits="2"
                            :max-fraction-digits="2"
                            suffix=" %"
                            fluid
                          />
                          <label for="ncp-jurosMensal">Juros mensal</label>
                        </FloatLabel>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <InputGroup>
                            <InputNumber
                              inputId="ncp-multa"
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
                              class="ncp-unit-toggle"
                              @click="multaTipo = multaTipo === 'percent' ? 'currency' : 'percent'"
                              v-tooltip.top="multaTipo === 'percent' ? 'Mudar para reais' : 'Mudar para porcentagem'"
                            >
                              {{ multaTipo === 'percent' ? '%' : 'R$' }}
                            </InputGroupAddon>
                          </InputGroup>
                          <label for="ncp-multa">Multa</label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Divider: pagamento & classificação -->
                    <div class="ncp-fields-divider"></div>

                    <!-- Forma de pagamento + Conta financeira -->
                    <div class="ncp-row ncp-row--2">
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncp-formaPagamento"
                            v-model="form.formaPagamento"
                            :options="formaPagamentoOptions"
                            fluid
                          />
                          <label for="ncp-formaPagamento">Forma de pagamento</label>
                        </FloatLabel>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncp-contaFinanceira"
                            v-model="form.contaFinanceiraId"
                            :options="contasFinanceirasStore.items"
                            optionLabel="nome"
                            optionValue="id"
                            :invalid="errors.contaFinanceiraId"
                            fluid
                          />
                          <label for="ncp-contaFinanceira">Conta financeira <span class="ncp-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.contaFinanceiraId" class="ncp-error">Informe a conta financeira</small>
                      </div>
                    </div>

                    <!-- Categoria + Nº no banco -->
                    <div class="ncp-row ncp-row--2">
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <Select
                            inputId="ncp-categoria"
                            v-model="form.categoria"
                            :options="categoriaOptions"
                            optionGroupLabel="label"
                            optionGroupChildren="items"
                            :invalid="errors.categoria"
                            fluid
                          />
                          <label for="ncp-categoria">Categoria <span class="ncp-req">*</span></label>
                        </FloatLabel>
                        <small v-if="errors.categoria" class="ncp-error">Informe a categoria</small>
                      </div>
                      <div class="ncp-field">
                        <FloatLabel variant="on">
                          <IconField>
                            <InputIcon class="pi pi-building-columns" />
                            <InputText id="ncp-nroBanco" v-model="form.nroBanco" fluid />
                          </IconField>
                          <label for="ncp-nroBanco">
                            Nº no banco
                            <i
                              class="pi pi-info-circle ncp-info-icon"
                              v-tooltip.top="'Número do documento gerado pelo banco (ex.: nosso número do boleto)'"
                            />
                          </label>
                        </FloatLabel>
                      </div>
                    </div>

                    <!-- Divider: recorrência -->
                    <div class="ncp-fields-divider"></div>

                    <!-- Ocorrência -->
                    <div class="ncp-field ncp-field--static">
                      <label class="ncp-label">Ocorrência</label>
                      <SelectButton
                        v-model="form.ocorrencia"
                        :options="ocorrenciaOptions"
                        option-label="label"
                        option-value="value"
                        class="ncp-ocorrencia"
                      />
                    </div>

                    <!-- Campos de recorrência (condicional) -->
                    <Transition name="ncp-expand">
                      <div v-if="isRecorrente" class="ncp-row ncp-row--2">
                        <div class="ncp-field">
                          <FloatLabel variant="on">
                            <Select
                              inputId="ncp-frequencia"
                              v-model="form.frequencia"
                              :options="frequenciaOptions"
                              fluid
                            />
                            <label for="ncp-frequencia">Frequência</label>
                          </FloatLabel>
                        </div>
                        <div class="ncp-field">
                          <FloatLabel variant="on">
                            <Select
                              inputId="ncp-parcelas"
                              v-model="form.parcelas"
                              :options="parcelasOptions"
                              :virtualScrollerOptions="{ itemSize: 38 }"
                              fluid
                            />
                            <label for="ncp-parcelas">Nº de parcelas</label>
                          </FloatLabel>
                        </div>
                      </div>
                    </Transition>

                  </div>
                </template>
              </Card>

              <!-- Card: Descrição -->
              <Card class="ncp-card">
                <template #title>
                  <div class="ncp-card-title">
                    <i class="pi pi-align-left" />
                    Descrição
                  </div>
                </template>
                <template #content>
                  <div class="ncp-fields">
                    <div class="ncp-field">
                      <FloatLabel variant="on">
                        <Textarea
                          id="ncp-historico"
                          v-model="form.historico"
                          rows="4"
                          :maxlength="HISTORICO_MAX"
                          auto-resize
                          fluid
                        />
                        <label for="ncp-historico">Histórico</label>
                      </FloatLabel>
                      <small class="ncp-char-count">{{ form.historico.length }}/{{ HISTORICO_MAX }}</small>
                    </div>
                  </div>
                </template>
              </Card>

              <!-- Card: Anexos -->
              <Card class="ncp-card">
                <template #title>
                  <div class="ncp-card-title">
                    <i class="pi pi-paperclip" />
                    Anexos
                    <span v-if="anexos.length" class="ncp-badge">{{ anexos.length }}</span>
                  </div>
                </template>
                <template #content>
                  <FileUpload
                    ref="fileUploadRef"
                    :multiple="true"
                    accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx"
                    :max-file-size="10485760"
                    :show-upload-button="false"
                    :show-cancel-button="false"
                    choose-label="Selecionar arquivos"
                    choose-icon="pi pi-upload"
                    invalid-file-size-message="{0}: tamanho inválido — máx. {1}."
                    @select="onFileSelect"
                    @remove="onFileRemove"
                    @clear="onFileClear"
                  >
                    <template #empty>
                      <div class="ncp-upload-empty">
                        <i class="pi pi-cloud-upload ncp-upload-empty-icon" />
                        <p class="ncp-upload-empty-label">Arraste arquivos aqui</p>
                        <p class="ncp-upload-empty-hint">PDF, imagens, planilhas — máx. 10 MB por arquivo</p>
                      </div>
                    </template>
                  </FileUpload>
                </template>
              </Card>

            </div><!-- /.ncp-col-main -->

            <!-- ── Coluna lateral (direita) — Histórico ───────────── -->
            <div class="ncp-col-side">

              <Card class="ncp-card ncp-card--sticky">
                <template #title>
                  <div class="ncp-card-title">
                    <i class="pi pi-history" />
                    Histórico de eventos
                  </div>
                </template>
                <template #content>

                  <!-- Modo edição: timeline -->
                  <template v-if="isEditing">
                    <ul class="ncp-tl-list">
                      <li
                        v-for="(item, idx) in historicoMock"
                        :key="item.id"
                        class="ncp-tl-item"
                      >
                        <div class="ncp-tl-left">
                          <span
                            class="ncp-tl-marker"
                            :style="{ background: tipoConfig[item.tipo]?.color ?? 'var(--p-primary-color)' }"
                          ><i :class="tipoConfig[item.tipo]?.icon ?? 'pi pi-circle'" /></span>
                          <div v-if="idx < historicoMock.length - 1" class="ncp-tl-line" />
                        </div>
                        <div class="ncp-tl-event">
                          <span class="ncp-tl-event-label">{{ tipoConfig[item.tipo]?.label ?? item.tipo }}</span>
                          <span class="ncp-tl-event-date">{{ fmtEventDate(item.data_evento) }}</span>
                          <p class="ncp-tl-event-desc">{{ item.descricao }}</p>
                          <span class="ncp-tl-event-user"><i class="pi pi-user" /> {{ item.usuario }}</span>
                        </div>
                      </li>
                    </ul>
                  </template>

                  <!-- Modo criação: empty state -->
                  <div v-else class="ncp-tl-empty">
                    <i class="pi pi-history ncp-tl-empty-icon" />
                    <span class="ncp-tl-empty-title">Sem histórico ainda</span>
                    <span class="ncp-tl-empty-hint">Os eventos aparecerão aqui após salvar a conta.</span>
                  </div>

                </template>
              </Card>

            </div><!-- /.ncp-col-side -->

          </div><!-- /.ncp-layout -->
        </div><!-- /.ncp-body -->

        <!-- ── Footer fixo ───────────────────────────────────────────── -->
        <footer class="ncp-footer">
          <span class="ncp-footer-hint"><span class="ncp-req">*</span> Campos obrigatórios</span>
        </footer>

      </div><!-- /.ncp-page -->
    </Transition>
  </Teleport>

  <NovoFornecedorDialog
    v-model="showNovoFornecedor"
    :initial-nome="novoFornecedorNome"
    @created="onFornecedorCriado"
  />
</template>

<style scoped>
/* ── Página ────────────────────────────────────────────────────────────── */
.ncp-page {
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
.ncp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.5rem 0.625rem 0.75rem;
  background: var(--p-surface-ground);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  gap: 0.75rem;
}

.ncp-header-start {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.ncp-header-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncp-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Corpo ─────────────────────────────────────────────────────────────── */
.ncp-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 2rem;
  scrollbar-gutter: stable;
  background-color: var(--p-surface-ground);
}

/* ── Grid: coluna principal + lateral ─────────────────────────────────── */
.ncp-layout {
  display: grid;
  grid-template-columns: 1fr 22rem;
  gap: 1.25rem;
  align-items: start;
}

.ncp-col-main,
.ncp-col-side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Cards ─────────────────────────────────────────────────────────────── */
.ncp-card {
  box-shadow: none !important;
}

.ncp-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.ncp-card-title .pi:not(.ncp-collapse-icon) {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Badge de contagem (Anexos) */
.ncp-badge {
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
.ncp-fields {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.ncp-row {
  display: grid;
  gap: 1rem;
}

.ncp-row--2 {
  grid-template-columns: 1fr 1fr;
}

.ncp-row--3 {
  grid-template-columns: 1fr 1fr 1fr;
}

/* Fornecedor ocupa 2/3 da linha; Valor ocupa 1/3 */
.ncp-row--fornecedor-valor {
  grid-template-columns: 2fr 1fr;
}

.ncp-field {
  display: flex;
  flex-direction: column;
}

/* Campo estático sem FloatLabel (Ocorrência) */
.ncp-field--static {
  gap: 0.375rem;
}

.ncp-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-color);
  user-select: none;
}

.ncp-req {
  color: var(--p-red-500);
  margin-left: 0.1em;
}

/* Campo com botão de ação ao lado (Fornecedor) */
.ncp-field-action-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ncp-fl-grow {
  flex: 1;
  min-width: 0;
}

.ncp-action-btn {
  flex-shrink: 0;
}

/* Erros de validação */
.ncp-error {
  font-size: 0.75rem;
  color: var(--p-red-500);
  margin-top: 0.25rem;
}

/* Contador de caracteres */
.ncp-char-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-align: right;
  margin-top: 0.25rem;
}

/* Ícone de info dentro do label */
.ncp-info-icon {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  margin-left: 0.25rem;
  cursor: help;
}

/* ── Altura uniforme dos inputs de linha única ─────────────────────────── */
:deep(.p-inputtext),
:deep(.p-select),
:deep(.p-datepicker),
:deep(.p-inputnumber) {
  height: 2.5rem;
}

:deep(.p-select .p-select-label) {
  display: flex;
  align-items: center;
  padding-block: 0;
}

:deep(.p-datepicker .p-datepicker-input) {
  height: 100%;
  padding-block: 0;
}

:deep(.p-inputnumber .p-inputtext) {
  height: 100%;
  padding-block: 0;
}

:deep(.p-icon-field) {
  width: 100%;
}

/* Toggle de unidade da Multa */
.ncp-unit-toggle {
  cursor: pointer;
  user-select: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  transition: background 0.15s ease, color 0.15s ease;
  min-width: 2.5rem;
  justify-content: center;
}

.ncp-unit-toggle:hover {
  background: var(--p-surface-hover);
  color: var(--p-text-color);
}

/* SelectButton de Ocorrência — largura total */
.ncp-ocorrencia {
  display: flex;
}

:deep(.ncp-ocorrencia.p-selectbutton) {
  display: flex;
  width: 100%;
}

:deep(.ncp-ocorrencia .p-togglebutton) {
  flex: 1;
}

/* ── Footer fixo ───────────────────────────────────────────────────────── */
.ncp-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.75rem;
  background: var(--p-surface-ground);
  border-top: 1px solid var(--p-surface-border);
  gap: 1rem;
}

.ncp-footer-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ── FileUpload — empty state ────────────────────────────────────────────── */
.ncp-upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.5rem 1rem;
  text-align: center;
  pointer-events: none;
}

.ncp-upload-empty-icon {
  font-size: 1.75rem;
  color: var(--p-text-muted-color);
  opacity: 0.5;
}

.ncp-upload-empty-label {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.ncp-upload-empty-hint {
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
.ncp-slide-enter-active,
.ncp-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.ncp-slide-enter-from,
.ncp-slide-leave-to {
  transform: translateX(100%);
}

.ncp-expand-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ncp-expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ncp-expand-enter-from,
.ncp-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Responsivo ────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .ncp-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .ncp-page {
    left: 0;
    border-radius: 0;
  }

  .ncp-col-side {
    grid-template-columns: 1fr;
  }

  .ncp-body {
    padding: 1rem 1rem 2rem;
  }

  .ncp-footer {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .ncp-row--2,
  .ncp-row--3,
  .ncp-row--fornecedor-valor {
    grid-template-columns: 1fr;
  }
}

/* ── Card de IA ──────────────────────────────────────────────────────────── */
.ncp-card--ai {
  border: 1px dashed var(--p-primary-300, #93c5fd);
  background: color-mix(in srgb, var(--p-primary-color) 4%, transparent);
}

.ncp-ai-badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
  background: var(--p-primary-color);
  color: #fff;
  margin-left: 0.25rem;
}

.ncp-ai-hint {
  margin: 0 0 0.875rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.ncp-ai-file-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  background: var(--p-surface-section);
  border: 1px solid var(--p-surface-border);
}

.ncp-ai-file-icon {
  font-size: 1rem;
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.ncp-ai-file-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ncp-ai-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--p-green-500) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--p-green-500) 30%, transparent);
  font-size: 0.8125rem;
  color: var(--p-green-700, #15803d);
}

.ncp-ai-success .pi {
  color: var(--p-green-600, #16a34a);
  font-size: 0.875rem;
}

/* ── Divisor visual entre seções do formulário ───────────────────────────── */
.ncp-fields-divider {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

/* ── Card sticky na lateral ──────────────────────────────────────────────── */
.ncp-card--sticky {
  position: sticky;
  top: 1.5rem;
  max-height: calc(100vh - 10rem);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* ── Empty state do histórico ────────────────────────────────────────────── */
.ncp-tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  text-align: center;
}

.ncp-tl-empty-icon {
  font-size: 2rem;
  color: var(--p-text-muted-color);
  opacity: 0.4;
}

.ncp-tl-empty-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.ncp-tl-empty-hint {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

/* ── Timeline custom ─────────────────────────────────────────────────────── */
.ncp-tl-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ncp-tl-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.ncp-tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2rem;
}

.ncp-tl-marker {
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

.ncp-tl-line {
  width: 2px;
  flex: 1;
  min-height: 0.75rem;
  background: var(--p-surface-border);
  margin: 0.25rem 0;
}

.ncp-tl-event {
  flex: 1;
  min-width: 0;
  padding-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ncp-tl-event-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.3;
}

.ncp-tl-event-date {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.ncp-tl-event-desc {
  margin: 0.1rem 0 0;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  line-height: 1.5;
}

.ncp-tl-event-user {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
