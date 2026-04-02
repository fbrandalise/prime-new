<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Breadcrumb from 'primevue/breadcrumb'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Menu from 'primevue/menu'
import Popover from 'primevue/popover'
import Drawer from 'primevue/drawer'
import Chart from 'primevue/chart'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Dialog from 'primevue/dialog'
import FloatLabel from 'primevue/floatlabel'
import { useToast } from 'primevue/usetoast'
import FilterBar from './FilterBar.vue'

const toast = useToast()

// ── Button ────────────────────────────────────────────────────────────────────
const loadingBtn = ref(false)
const simulateLoading = () => {
  loadingBtn.value = true
  setTimeout(() => { loadingBtn.value = false }, 2000)
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const showToast = (severity, summary, detail) =>
  toast.add({ severity, summary, detail, life: 3000 })

// ── InputText ─────────────────────────────────────────────────────────────────
const inputValue = ref('')

// ── Textarea ──────────────────────────────────────────────────────────────────
const textareaValue = ref('')

// ── InputNumber ───────────────────────────────────────────────────────────────
const numberValue = ref(null)

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const bcHome  = { icon: 'pi pi-home' }
const bcItems = [{ label: 'Financeiro' }, { label: 'Contas a receber' }]

// ── SelectButton ──────────────────────────────────────────────────────────────
const periodOptions = [
  { label: 'Este mês', value: 'mes' },
  { label: '7D',       value: '7d' },
  { label: '30D',      value: '30d' },
]
const selectedPeriod = ref('mes')

// ── Overview toggle (preview do padrão) ───────────────────────────────────────
const overviewSgMode = ref('cards')
const overviewSgOptions = [
  { label: 'Totalizadores',   value: 'cards',   icon: 'pi pi-th-large'  },
  { label: 'Fluxo de caixa',  value: 'grafico', icon: 'pi pi-chart-bar' },
]

// ── FilterBar (preview) ───────────────────────────────────────────────────────
const fbValues  = ref({ situacao: ['Recebida'] })
const fbDrawer  = ref(false)
const fbSelCount = ref(0)
const fbFilters = [
  { id: 'situacao', type: 'multiselect', label: 'Situação', options: ['A receber', 'Atrasada', 'Recebida', 'Paga'], pinned: true },
  { id: 'periodo',  type: 'daterange',   label: 'Período' },
]
const fbSelectionActions = [
  { label: 'Baixar selecionados', icon: 'pi pi-check-circle' },
  { separator: true },
  { label: 'Excluir', icon: 'pi pi-trash' },
]

// ── Panel demo ───────────────────────────────────────────────────────────────
const panelVisible = ref(false)
const panelSaving  = ref(false)
const simulatePanelSave = () => {
  panelSaving.value = true
  setTimeout(() => { panelSaving.value = false; panelVisible.value = false }, 1500)
}

// ── Dialog demo ──────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const dialogSaving  = ref(false)
const simulateDialogSave = () => {
  dialogSaving.value = true
  setTimeout(() => { dialogSaving.value = false; dialogVisible.value = false }, 1500)
}

// ── Row menu demo ────────────────────────────────────────────────────────────
const rowMenu = ref()
const rowMenuItems = ref([
  { label: 'Editar',   icon: 'pi pi-pencil' },
  { label: 'Baixar',   icon: 'pi pi-check-circle' },
  { separator: true },
  { label: 'Cancelar', icon: 'pi pi-times' },
  { label: 'Excluir',  icon: 'pi pi-trash',  class: 'text-red-500' },
])
const toggleRowMenu = (e) => rowMenu.value.toggle(e)

// ── Empty state demo ─────────────────────────────────────────────────────────
const emptyStateDemo = ref(true)

// ── Chip selector demo ───────────────────────────────────────────────────────
const chipPopover = ref()
const chipSelected = ref('Todos os bancos')
const chipSearch   = ref('')
const chipOptions  = [
  { label: 'Todos os bancos', separator: false },
  { label: 'Bancos', separator: true },
  { label: 'Itaú Empresa',      separator: false },
  { label: 'Bradesco PJ',       separator: false },
  { label: 'Carteiras digitais', separator: true },
  { label: 'PagSeguro',         separator: false },
  { label: 'Mercado Pago',      separator: false },
]
const chipOptionsFiltered = () => {
  const q = chipSearch.value.toLowerCase()
  return chipOptions.filter(o => o.separator || o.label.toLowerCase().includes(q))
}
const toggleChipPopover = (e) => chipPopover.value.toggle(e)
const selectChip = (label) => { chipSelected.value = label; chipPopover.value.hide() }

// ── FAB demo ─────────────────────────────────────────────────────────────────
const fabPopover = ref()
const tableSizeDemo = ref('small')
const tableSizeOptions = [
  { label: 'Small',  value: 'small' },
  { label: 'Normal', value: 'normal' },
  { label: 'Large',  value: 'large' },
]
const toggleFabPopover = (e) => fabPopover.value.toggle(e)

// ── DatePicker ────────────────────────────────────────────────────────────────
const singleDate = ref(null)
const dateRange  = ref(null)

// ── MultiSelect ───────────────────────────────────────────────────────────────
const situacaoOptions   = ['A receber', 'Atrasada', 'Recebida', 'Paga']
const selectedSituacoes = ref([])

// ── Select ────────────────────────────────────────────────────────────────────
const statusOptions   = ['Todos', 'Ativo', 'Inativo', 'Pendente']
const selectedStatus  = ref(null)

// ── Menu (popup) ──────────────────────────────────────────────────────────────
const actionsMenu = ref()
const menuItems   = ref([
  { label: 'Exportar',  icon: 'pi pi-download' },
  { label: 'Imprimir',  icon: 'pi pi-print' },
  { separator: true },
  { label: 'Excluir',   icon: 'pi pi-trash' },
])
const toggleMenu = (e) => actionsMenu.value.toggle(e)

// ── Popover ───────────────────────────────────────────────────────────────────
const accountPopover = ref()
const togglePopover  = (e) => accountPopover.value.toggle(e)

// ── Drawer ────────────────────────────────────────────────────────────────────
const drawerVisible = ref(false)

// ── DataTable ─────────────────────────────────────────────────────────────────
const tableData = ref([
  { id: 1, nome: 'Produto A', categoria: 'Eletrônicos', preco: 1299.90, status: 'Em Estoque' },
  { id: 2, nome: 'Produto B', categoria: 'Periféricos', preco: 249.90,  status: 'Baixo Estoque' },
  { id: 3, nome: 'Produto C', categoria: 'Áudio',       preco: 499.90,  status: 'Sem Estoque' },
])
const statusSeverity = (s) => ({ 'Em Estoque': 'success', 'Baixo Estoque': 'warn', 'Sem Estoque': 'danger' }[s] || 'info')
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Chart ─────────────────────────────────────────────────────────────────────
const chartData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  datasets: [
    {
      type: 'bar',
      label: 'Entradas',
      data: [4200, 3800, 5100, 4700, 6200, 5800],
      backgroundColor: 'rgba(96,165,250,0.85)',
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'bar',
      label: 'Saídas',
      data: [1800, 2200, 1900, 2400, 2100, 1700],
      backgroundColor: 'rgba(251,146,60,0.85)',
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'line',
      label: 'Saldo',
      data: [2400, 4000, 7200, 9500, 13600, 17700],
      borderColor: 'rgba(74,222,128,1)',
      backgroundColor: 'transparent',
      pointRadius: 3,
      tension: 0.3,
      borderWidth: 2.5,
      order: 1,
    },
  ],
}
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { boxWidth: 12, font: { size: 12 } } } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { callback: (v) => `R$ ${v.toLocaleString('pt-BR')}` } },
  },
}

// ── Snippets de código ────────────────────────────────────────────────────────
const code = {
  buttonSeverities: `<Button label="Primary" />
<Button label="Secondary" severity="secondary" />
<Button label="Success"   severity="success" />
<Button label="Warning"   severity="warn" />
<Button label="Danger"    severity="danger" />
<Button label="Info"      severity="info" />
<Button label="Contrast"  severity="contrast" />`,

  buttonVariants: `<Button label="Padrão" />
<Button label="Outlined" variant="outlined" />
<Button label="Text"     variant="text" />
<Button label="Link"     link />`,

  buttonIcons: `<Button label="Novo"    icon="pi pi-plus" />
<Button label="Salvar"  icon="pi pi-save"   severity="success" />
<Button label="Editar"  icon="pi pi-pencil" variant="outlined" />
<Button label="Excluir" icon="pi pi-trash"  severity="danger" variant="text" />
<Button icon="pi pi-search" rounded variant="text" />`,

  buttonSizes: `<Button label="Small"  size="small" />
<Button label="Normal" />
<Button label="Large"  size="large" />`,

  buttonStates: `<Button label="Loading..." :loading="loading" @click="simulate" />
<Button label="Disabled" disabled />`,

  inputVariants: `<InputText v-model="value" placeholder="Placeholder padrão" />
<InputText v-model="value" placeholder="Inválido"     invalid />
<InputText v-model="value" placeholder="Desabilitado" disabled />`,

  inputSizes: `<InputText v-model="value" placeholder="Small"  size="small" />
<InputText v-model="value" placeholder="Normal" />
<InputText v-model="value" placeholder="Large"  size="large" />`,

  inputIcon: `<IconField>
  <InputIcon class="pi pi-search" />
  <InputText v-model="value" placeholder="Pesquisar..." />
</IconField>`,

  textarea: `<Textarea
  v-model="value"
  rows="3"
  auto-resize
  fluid
  placeholder="Observações..."
/>`,

  inputNumber: `<!-- Moeda -->
<InputNumber v-model="value" mode="currency" currency="BRL" locale="pt-BR" fluid />

<!-- Percentual -->
<InputNumber v-model="value" suffix="%" :min-fraction-digits="2" fluid />`,

  breadcrumb: `const home  = { icon: 'pi pi-home' }
const items = [{ label: 'Financeiro' }, { label: 'Contas a receber' }]

<Breadcrumb :home="home" :model="items" />`,

  selectButton: `const options = [
  { label: 'Este mês', value: 'mes' },
  { label: '7D',       value: '7d' },
  { label: '30D',      value: '30d' },
]
const selected = ref('mes')

<SelectButton v-model="selected" :options="options" option-label="label" option-value="value" />`,

  datePicker: `<!-- Data simples -->
<DatePicker v-model="date" date-format="dd/mm/yy" show-icon icon-display="input" />

<!-- Intervalo -->
<DatePicker v-model="range" selection-mode="range" date-format="dd/mm/yy" show-icon icon-display="input" placeholder="Período" />`,

  multiSelect: `const options  = ['A receber', 'Atrasada', 'Recebida', 'Paga']
const selected = ref([])

<MultiSelect
  v-model="selected"
  :options="options"
  placeholder="Todas as situações"
  display="chip"
/>`,

  select: `const options  = ['Todos', 'Ativo', 'Inativo', 'Pendente']
const selected = ref(null)

<Select v-model="selected" :options="options" placeholder="Selecione..." />`,

  menu: `const menu  = ref()
const items = [
  { label: 'Exportar', icon: 'pi pi-download' },
  { label: 'Imprimir', icon: 'pi pi-print' },
  { separator: true },
  { label: 'Excluir',  icon: 'pi pi-trash' },
]

<Button icon="pi pi-ellipsis-v" severity="secondary" @click="menu.toggle($event)" />
<Menu ref="menu" :model="items" popup />`,

  popover: `const pop = ref()

<Button label="Selecionar conta" @click="pop.toggle($event)" />
<Popover ref="pop">
  <p>Conteúdo customizado do popover</p>
</Popover>`,

  drawer: `const visible = ref(false)

<Button label="Abrir filtros" icon="pi pi-sliders-v" @click="visible = true" />
<Drawer v-model:visible="visible" header="Filtros" position="left">
  <!-- conteúdo -->
</Drawer>`,

  card: `<!-- Simples -->
<Card>
  <template #content>Conteúdo</template>
</Card>

<!-- Com título e rodapé -->
<Card>
  <template #title>Título</template>
  <template #subtitle>Subtítulo</template>
  <template #content>Corpo do card</template>
  <template #footer>
    <Button label="Confirmar" />
  </template>
</Card>

<!-- Com borda colorida (padrão dos totalizadores) -->
<Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
  <template #content>...</template>
</Card>`,

  tag: `<Tag value="Primary" />
<Tag value="Success"  severity="success" />
<Tag value="Warning"  severity="warn" />
<Tag value="Danger"   severity="danger" />
<Tag value="Info"     severity="info" />
<Tag value="Secondary" severity="secondary" />

<!-- Com ícone -->
<Tag value="Em Estoque" severity="success" icon="pi pi-check" />

<!-- Rounded -->
<Tag value="Recebida" severity="success" rounded />`,

  toast: `import { useToast } from 'primevue/usetoast'
const toast = useToast()

toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Mensagem', life: 3000 })
toast.add({ severity: 'info',    summary: 'Info',    detail: 'Mensagem', life: 3000 })
toast.add({ severity: 'warn',    summary: 'Atenção', detail: 'Mensagem', life: 3000 })
toast.add({ severity: 'error',   summary: 'Erro',    detail: 'Mensagem', life: 3000 })`,

  dataTable: `<DataTable
  v-model:selection="selected"
  :value="data"
  dataKey="id"
  size="small"
  stripedRows
  paginator
  :rows="100"
  :rowsPerPageOptions="[50, 100, 200]"
  currentPageReportTemplate="{first}–{last} de {totalRecords}"
  paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
>
  <Column selectionMode="multiple" headerStyle="width: 3rem" />
  <Column field="nome" header="Nome" />
  <Column field="status" header="Status">
    <template #body="{ data }">
      <Tag :value="data.status" :severity="getSeverity(data.status)" />
    </template>
  </Column>
  <Column header="Ações" style="width: 3rem">
    <template #body="{ data }">
      <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleMenu($event, data)" />
    </template>
  </Column>
</DataTable>`,

  chart: `import Chart from 'primevue/chart'
// requer: npm install chart.js

const data = {
  labels: ['Jan', 'Fev', 'Mar'],
  datasets: [
    { type: 'bar',  label: 'Entradas', data: [4200, 3800, 5100], backgroundColor: 'rgba(96,165,250,0.85)' },
    { type: 'bar',  label: 'Saídas',   data: [1800, 2200, 1900], backgroundColor: 'rgba(251,146,60,0.85)' },
    { type: 'line', label: 'Saldo',    data: [2400, 4000, 7200], borderColor: 'rgba(74,222,128,1)' },
  ],
}

<Chart type="bar" :data="data" :options="options" />`,

  filterBar: `import FilterBar from '@/components/FilterBar.vue'

// FilterDef — definição de filtros
const filterDefs = [
  {
    id:      'situacao',
    type:    'multiselect',       // 'selectbutton' | 'multiselect' | 'select' | 'daterange' | 'input'
    label:   'Situação',
    options: ['A receber', 'Atrasada', 'Recebida', 'Paga'],
    pinned:  true,                // sempre visível, não pode ser removido
  },
  {
    id:    'periodo',
    type:  'daterange',
    label: 'Período',             // aparece quando tem valor (defaultVisible: false)
  },
]

const filterValues          = ref({})   // { situacao: [...], periodo: [d1, d2] }
const filtersDrawerVisible  = ref(false)

// Ações para o menu "Mais ações" (visível na barra de seleção em massa)
const selectionActions = [
  { label: 'Baixar selecionados', icon: 'pi pi-check-circle', command: () => {} },
  { separator: true },
  { label: 'Excluir',             icon: 'pi pi-trash',        command: () => {} },
]

<!-- Dentro do card da tabela, entre a toolbar e o DataTable -->
<FilterBar
  v-model="filterValues"
  v-model:filtersDrawerVisible="filtersDrawerVisible"
  :filters="filterDefs"
  :selection-count="selectedRows.length"
  :total-count="filteredRows.length"
  :selection-actions="selectionActions"
  @clear="filterValues = {}"
  @clear-selection="selectedRows = []"
  @lower-selected="handleLower"
/>

<!--
FilterBar é colocado DENTRO do card da tabela (.table-card),
entre a toolbar e o <DataTable>, sem padding próprio.

Estados:
  – selectionCount = 0  → mostra chips de filtros ativos
  – selectionCount > 0  → substitui por barra de ações em massa
    (× limpar seleção · N itens selecionados · Baixar · Mais ações)
-->`,

  patternHeader: `<!-- Padrão de cabeçalho de página -->
<div class="page-header">
  <Breadcrumb :home="home" :model="items" />

  <!-- Linha do título: título + ações + CTA -->
  <div class="title-row">
    <span class="title">Título da página</span>
    <Button icon="pi pi-ellipsis-v" severity="secondary" @click="toggleMenu" />
    <Menu ref="menu" :model="menuItems" popup />
    <Button label="Nova conta a receber" icon="pi pi-plus" />
  </div>
</div>

<!--
CSS obrigatório:
.page-header { padding: 1rem 1.5rem; background: surface-card; border-bottom: 1px solid surface-border; }
.title-row   { display: flex; align-items: center; gap: .625rem; }
.title-row .btn-ações { margin-left: auto; }

Nota: toolbar de filtros, busca e período ficam DENTRO do card
da tabela (ver padrão "Tabela com toolbar"), não no cabeçalho.
-->`,

  patternCards: `<!-- Padrão de cards de resumo -->
<div class="cards-grid">
  <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
    <template #content>
      <div class="card-inner">
        <i class="pi pi-arrow-circle-down card-icon" style="color: var(--p-blue-500)" />
        <div>
          <span class="card-label">A RECEBER</span>
          <span class="card-value">R$ 12.450,00</span>
          <span class="card-count">8 lançamentos</span>
        </div>
      </div>
    </template>
  </Card>
  <!-- repetir para outros totalizadores -->
</div>`,

  patternTable: `<!-- Padrão de tabela com toolbar integrada ao card -->
<div class="table-card">

  <!-- Toolbar: filtros avançados + busca + período -->
  <div class="toolbar">
    <Button icon="pi pi-sliders-v" variant="text" severity="secondary" @click="drawerOpen = true" />
    <IconField class="toolbar-search">
      <InputIcon class="pi pi-search" />
      <InputText v-model="search" placeholder="Pesquisar..." />
    </IconField>
    <SelectButton v-model="period" :options="periodOptions" option-label="label" option-value="value" size="small" />
    <DatePicker v-model="dateRange" selection-mode="range" date-format="dd/mm/yy" show-icon icon-display="input" placeholder="Período" />
  </div>

  <!-- FilterBar: chips de filtros ativos + seleção em massa -->
  <FilterBar
    v-model="filterValues"
    v-model:filtersDrawerVisible="drawerOpen"
    :filters="filterDefs"
    :selection-count="selected.length"
    :total-count="filtered.length"
    @clear="clearFilters"
  />

  <DataTable
    v-model:selection="selected"
    :value="filtered"
    dataKey="id"
    stripedRows
    paginator
    :rows="100"
    :rowsPerPageOptions="[50, 100, 200]"
    currentPageReportTemplate="{first}–{last} de {totalRecords}"
    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
  >
    <Column selectionMode="multiple" headerStyle="width: 3rem" style="width: 3rem" />
    <Column field="campo" header="Rótulo" />
    <!-- demais colunas -->
    <Column headerStyle="width: 3rem" style="width: 3rem">
      <template #body="{ data }">
        <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" @click="toggleRowMenu($event, data)" />
      </template>
    </Column>
  </DataTable>
</div>

<!--
CSS obrigatório:
.table-card    { background: surface-card; border: 1px solid surface-border; border-radius: .5rem; overflow: hidden; }
.toolbar       { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-bottom: 1px solid surface-border; }
.toolbar-search { flex: 1; min-width: 0; }
:deep(.fb)     { margin: 0; border-bottom: 1px solid surface-border; }
-->`,

  patternStatusTags: `<!-- Mapa de status tags por contexto -->
const statusSeverity = (s) => ({
  'A receber':              'secondary',
  'Atrasada':              'danger',
  'Recebida':              'success',
  'Recebida parcialmente': 'warn',
  'Paga':                  'success',
  'Paga parcialmente':     'warn',
  'Para Aprovação':        'warn',
  'Antecipada':            'info',
}[s] ?? 'secondary')

<Tag :value="data.situacao" :severity="statusSeverity(data.situacao)" />`,

  patternPanel: `<!-- Panel full-page (slide-in pela direita) -->
<Teleport to="body">
  <Transition name="panel-slide">
    <div v-if="visible" class="panel-page">
      <!-- Header fixo -->
      <header class="panel-header">
        <div class="panel-header-start">
          <Button icon="pi pi-arrow-left" variant="text" rounded @click="close" />
          <span class="panel-header-title">Nova conta a receber</span>
        </div>
        <div class="panel-header-end">
          <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
          <Button label="Salvar" icon="pi pi-check" :loading="saving" @click="save" />
        </div>
      </header>

      <!-- Body scrollável -->
      <div class="panel-body">
        <Card>
          <template #title><i class="pi pi-file-edit" /> Dados gerais</template>
          <template #content>
            <div class="panel-field">
              <FloatLabel variant="on">
                <InputText id="descricao" v-model="form.descricao" fluid />
                <label for="descricao">Descrição <span class="req">*</span></label>
              </FloatLabel>
            </div>
          </template>
        </Card>
      </div>

      <!-- Footer -->
      <footer class="panel-footer">
        <span class="panel-hint"><span class="req">*</span> Campos obrigatórios</span>
      </footer>
    </div>
  </Transition>
</Teleport>`,

  patternDialog: `<!-- Dialog modal centrado -->
<Dialog :visible="visible" modal header="Novo cliente" :style="{ width: '26rem', maxWidth: '95vw' }"
  @update:visible="(v) => { if (!v) close() }">

  <div class="dialog-field">
    <FloatLabel variant="on">
      <InputText id="nome" v-model="form.nome" fluid />
      <label for="nome">Nome <span class="req">*</span></label>
    </FloatLabel>
  </div>

  <template #footer>
    <Button label="Cancelar" severity="secondary" variant="outlined" @click="close" />
    <Button label="Cadastrar" icon="pi pi-check" :loading="saving" @click="save" />
  </template>
</Dialog>`,

  patternRowMenu: `<!-- Botão ellipsis → Menu popup com ações condicionais -->
const menu = ref()
const items = [
  { label: 'Editar',   icon: 'pi pi-pencil' },
  { label: 'Baixar',   icon: 'pi pi-check-circle' },
  { separator: true },
  { label: 'Cancelar', icon: 'pi pi-times' },
  { label: 'Excluir',  icon: 'pi pi-trash' },
]

<!-- Na coluna de ações da DataTable -->
<Column headerStyle="width: 3rem" style="width: 3rem">
  <template #body="{ data }">
    <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small"
      @click="menu.toggle($event)" />
  </template>
</Column>
<Menu ref="menu" :model="items" popup />`,

  patternBulkActions: `<!-- FilterBar em modo seleção em massa -->
<FilterBar
  v-model="filterValues"
  :filters="filterDefs"
  :selection-count="selectedRows.length"
  :selection-total="selectionTotal"
  :total-count="filteredRows.length"
  :selection-actions="selectionActions"
  @clear="filterValues = {}"
  @clear-selection="selectedRows = []"
  @lower-selected="handleLower"
/>

<!-- Quando selectionCount > 0 a FilterBar exibe:
  × limpar seleção · "N itens selecionados" · total R$ · Baixar · Mais ações ▾
-->`,

  patternEmptyState: `<!-- Empty state dentro do DataTable -->
<template #empty>
  <div class="table-empty">
    <i class="pi pi-filter-slash" />
    <span>Nenhum resultado para os filtros aplicados.</span>
    <Button label="Limpar filtros" icon="pi pi-times"
      size="small" severity="secondary" @click="clearFilters" />
  </div>
</template>

<!--
CSS:
.table-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 2.5rem 0;
  color: var(--p-text-muted-color); font-size: 0.875rem;
}
.table-empty .pi { font-size: 1.5rem; }
-->`,

  patternChipSelector: `<!-- Chip de seleção com Popover -->
<button class="conta-chip" @click="pop.toggle($event)">
  <span>{{ selectedConta }}</span>
  <i class="pi pi-chevron-down" />
</button>

<Popover ref="pop">
  <IconField>
    <InputIcon class="pi pi-search" />
    <InputText v-model="search" placeholder="Buscar conta..." />
  </IconField>
  <ul class="account-list">
    <template v-for="opt in filteredOptions" :key="opt.label">
      <li v-if="opt.separator" class="account-separator">{{ opt.label }}</li>
      <li v-else class="account-item" @click="select(opt)">
        <i v-if="opt.label === selected" class="pi pi-check" />
        <span>{{ opt.label }}</span>
      </li>
    </template>
  </ul>
</Popover>`,

  patternFab: `<!-- FAB de configurações -->
<Button icon="pi pi-sliders-h" rounded severity="secondary"
  class="settings-fab" @click="pop.toggle($event)"
  v-tooltip.left="'Configurações da tabela'" />

<Popover ref="pop">
  <div class="settings-content">
    <span class="settings-label">Densidade da tabela</span>
    <SelectButton v-model="tableSize" :options="sizeOptions"
      optionLabel="label" optionValue="value" size="small" />
  </div>
</Popover>

<!--
CSS:
.settings-fab {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  width: 3rem; height: 3rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10;
}
-->`,

  patternOverview: `<!-- Card contentor com toggle de visão (gráfico ↔ totalizadores) -->
<div class="overview-card">

  <!-- Barra do toggle — controla a visão ativa -->
  <div class="overview-bar">
    <SelectButton
      v-model="mode"
      :options="[
        { label: 'Totalizadores',  value: 'cards',   icon: 'pi pi-th-large'  },
        { label: 'Fluxo de caixa', value: 'grafico', icon: 'pi pi-chart-bar' },
      ]"
      option-label="label"
      option-value="value"
      size="small"
    />
  </div>

  <!-- Visão: Fluxo de caixa -->
  <div v-if="mode === 'grafico'">
    <div class="chart-header">
      <span class="chart-title">Fluxo de caixa</span>
      <span class="chart-subtitle">Entradas e saídas agrupadas por semana</span>
    </div>
    <div class="chart-body">
      <Chart type="bar" :data="chartData" :options="chartOptions" />
    </div>
  </div>

  <!-- Visão: Totalizadores -->
  <div v-if="mode === 'cards'" class="cards-wrap">
    <div class="cards-grid">
      <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
        <template #content>...</template>
      </Card>
      <!-- repetir para cada métrica -->
    </div>
  </div>

</div>

<!--
CSS obrigatório:
.overview-card { background: surface-card; border: 1px solid surface-border; border-radius: .5rem; overflow: hidden; }
.overview-bar  { display: flex; padding: .75rem 1rem; border-bottom: 1px solid surface-border; }
.cards-wrap    { padding: 1rem; }
.cards-grid    { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }
.chart-header  { display: flex; align-items: baseline; gap: .625rem; padding: 1rem 1.25rem .75rem; border-bottom: 1px solid surface-border; }
.chart-body    { padding: 1rem 1.25rem; height: 17rem; }

Uso:
const mode = ref('cards')  // default: totalizadores
// o SelectButton só aparece quando há mais de uma visão disponível
-->`,
}

// ── Seção ativa no índice ─────────────────────────────────────────────────────
const sectionIds = [
  'button', 'inputtext', 'textarea', 'inputnumber', 'breadcrumb',
  'selectbutton', 'datepicker', 'multiselect', 'select', 'menu',
  'popover', 'drawer', 'card', 'tag', 'toast', 'datatable', 'chart', 'filterbar',
  'pattern-header', 'pattern-cards', 'pattern-overview', 'pattern-table',
  'pattern-status', 'pattern-panel', 'pattern-dialog', 'pattern-row-menu',
  'pattern-bulk', 'pattern-empty', 'pattern-chip', 'pattern-fab',
]
const activeSection = ref('button')

const updateActive = () => {
  const container = document.querySelector('.app-content')
  if (!container) return
  const containerTop = container.getBoundingClientRect().top
  const offset = 230 // deve ser ≥ scroll-margin-top (14rem = 224px)

  for (let i = sectionIds.length - 1; i >= 0; i--) {
    const el = document.getElementById(sectionIds[i])
    if (el && el.getBoundingClientRect().top - containerTop <= offset) {
      activeSection.value = sectionIds[i]
      return
    }
  }
  activeSection.value = sectionIds[0]
}

onMounted(() => {
  const container = document.querySelector('.app-content')
  container?.addEventListener('scroll', updateActive, { passive: true })
  updateActive()
})

onUnmounted(() => {
  const container = document.querySelector('.app-content')
  container?.removeEventListener('scroll', updateActive)
})
</script>

<template>
  <div class="sg-page">
    <div class="sg-top">
      <div class="sg-header">
        <h1 class="sg-title">Style Guide — PrimeVue</h1>
        <p class="sg-subtitle">Referência de componentes e padrões utilizados no projeto</p>
      </div>

      <!-- ── ÍNDICE ──────────────────────────────────────────────────────── -->
      <nav class="sg-index">
        <span class="sg-index-label">Componentes</span>
        <a href="#button"         :class="{ 'is-active': activeSection === 'button' }">Button</a>
        <a href="#inputtext"      :class="{ 'is-active': activeSection === 'inputtext' }">InputText</a>
        <a href="#textarea"       :class="{ 'is-active': activeSection === 'textarea' }">Textarea</a>
        <a href="#inputnumber"    :class="{ 'is-active': activeSection === 'inputnumber' }">InputNumber</a>
        <a href="#breadcrumb"     :class="{ 'is-active': activeSection === 'breadcrumb' }">Breadcrumb</a>
        <a href="#selectbutton"   :class="{ 'is-active': activeSection === 'selectbutton' }">SelectButton</a>
        <a href="#datepicker"     :class="{ 'is-active': activeSection === 'datepicker' }">DatePicker</a>
        <a href="#multiselect"    :class="{ 'is-active': activeSection === 'multiselect' }">MultiSelect</a>
        <a href="#select"         :class="{ 'is-active': activeSection === 'select' }">Select</a>
        <a href="#menu"           :class="{ 'is-active': activeSection === 'menu' }">Menu</a>
        <a href="#popover"        :class="{ 'is-active': activeSection === 'popover' }">Popover</a>
        <a href="#drawer"         :class="{ 'is-active': activeSection === 'drawer' }">Drawer</a>
        <a href="#card"           :class="{ 'is-active': activeSection === 'card' }">Card</a>
        <a href="#tag"            :class="{ 'is-active': activeSection === 'tag' }">Tag</a>
        <a href="#toast"          :class="{ 'is-active': activeSection === 'toast' }">Toast</a>
        <a href="#datatable"      :class="{ 'is-active': activeSection === 'datatable' }">DataTable</a>
        <a href="#chart"          :class="{ 'is-active': activeSection === 'chart' }">Chart</a>
        <a href="#filterbar"      :class="{ 'is-active': activeSection === 'filterbar' }">FilterBar</a>
        <span class="sg-index-label">Padrões</span>
        <a href="#pattern-header"   :class="{ 'is-active': activeSection === 'pattern-header' }">Cabeçalho</a>
        <a href="#pattern-cards"    :class="{ 'is-active': activeSection === 'pattern-cards' }">Cards de resumo</a>
        <a href="#pattern-overview" :class="{ 'is-active': activeSection === 'pattern-overview' }">Visão geral</a>
        <a href="#pattern-table"    :class="{ 'is-active': activeSection === 'pattern-table' }">Tabela</a>
        <a href="#pattern-status"   :class="{ 'is-active': activeSection === 'pattern-status' }">Status Tags</a>
        <a href="#pattern-panel"    :class="{ 'is-active': activeSection === 'pattern-panel' }">Panel (form)</a>
        <a href="#pattern-dialog"   :class="{ 'is-active': activeSection === 'pattern-dialog' }">Dialog (form)</a>
        <a href="#pattern-row-menu" :class="{ 'is-active': activeSection === 'pattern-row-menu' }">Menu de linha</a>
        <a href="#pattern-bulk"     :class="{ 'is-active': activeSection === 'pattern-bulk' }">Seleção em massa</a>
        <a href="#pattern-empty"    :class="{ 'is-active': activeSection === 'pattern-empty' }">Empty State</a>
        <a href="#pattern-chip"     :class="{ 'is-active': activeSection === 'pattern-chip' }">Selector Chip</a>
        <a href="#pattern-fab"      :class="{ 'is-active': activeSection === 'pattern-fab' }">FAB Config</a>
      </nav>
    </div>

    <div class="sg-content">

      <!-- ── BUTTON ─────────────────────────────────────────────────────── -->
      <section id="button" class="sg-section">
        <h2 class="sg-section-title">Button</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Severidades</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <Button label="Primary" />
              <Button label="Secondary" severity="secondary" />
              <Button label="Success"  severity="success" />
              <Button label="Warning"  severity="warn" />
              <Button label="Danger"   severity="danger" />
              <Button label="Info"     severity="info" />
              <Button label="Contrast" severity="contrast" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.buttonSeverities }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Variantes</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <Button label="Padrão" />
              <Button label="Outlined" variant="outlined" />
              <Button label="Text"     variant="text" />
              <Button label="Link"     link />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.buttonVariants }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Com ícone</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <Button label="Novo"    icon="pi pi-plus" />
              <Button label="Salvar"  icon="pi pi-save"   severity="success" />
              <Button label="Editar"  icon="pi pi-pencil" variant="outlined" />
              <Button label="Excluir" icon="pi pi-trash"  severity="danger" variant="text" />
              <Button icon="pi pi-search" rounded variant="text" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.buttonIcons }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Tamanhos</h3>
          <div class="sg-preview">
            <div class="sg-row sg-row--align-center">
              <Button label="Small"  size="small" />
              <Button label="Normal" />
              <Button label="Large"  size="large" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.buttonSizes }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Estados</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <Button label="Loading..." :loading="loadingBtn" @click="simulateLoading" />
              <Button label="Disabled" disabled />
              <Button label="Disabled Outlined" variant="outlined" disabled />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.buttonStates }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── INPUT TEXT ─────────────────────────────────────────────────── -->
      <section id="inputtext" class="sg-section">
        <h2 class="sg-section-title">InputText</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Variantes</h3>
          <div class="sg-preview">
            <div class="sg-col">
              <InputText v-model="inputValue" placeholder="Placeholder padrão" />
              <InputText v-model="inputValue" placeholder="Inválido"     invalid />
              <InputText v-model="inputValue" placeholder="Desabilitado" disabled />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.inputVariants }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Tamanhos</h3>
          <div class="sg-preview">
            <div class="sg-col">
              <InputText v-model="inputValue" placeholder="Small"  size="small" />
              <InputText v-model="inputValue" placeholder="Normal" />
              <InputText v-model="inputValue" placeholder="Large"  size="large" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.inputSizes }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <div class="sg-block">
          <h3 class="sg-block-title">Com ícone — IconField + InputIcon</h3>
          <div class="sg-preview">
            <div class="sg-col">
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="inputValue" placeholder="Pesquisar..." />
              </IconField>
              <IconField>
                <InputIcon class="pi pi-envelope" />
                <InputText v-model="inputValue" placeholder="E-mail" />
              </IconField>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.inputIcon }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── TEXTAREA ───────────────────────────────────────────────────── -->
      <section id="textarea" class="sg-section">
        <h2 class="sg-section-title">Textarea</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Auto-resize</h3>
          <div class="sg-preview">
            <Textarea
              v-model="textareaValue"
              rows="3"
              auto-resize
              style="width: 320px"
              placeholder="Observações..."
            />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.textarea }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── INPUT NUMBER ───────────────────────────────────────────────── -->
      <section id="inputnumber" class="sg-section">
        <h2 class="sg-section-title">InputNumber</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Moeda e percentual</h3>
          <div class="sg-preview">
            <div class="sg-col">
              <InputNumber v-model="numberValue" mode="currency" currency="BRL" locale="pt-BR" placeholder="R$ 0,00" fluid />
              <InputNumber v-model="numberValue" suffix="%" :min-fraction-digits="2" placeholder="0,00 %" fluid />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.inputNumber }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── BREADCRUMB ─────────────────────────────────────────────────── -->
      <section id="breadcrumb" class="sg-section">
        <h2 class="sg-section-title">Breadcrumb</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Navegação hierárquica</h3>
          <div class="sg-preview">
            <Breadcrumb :home="bcHome" :model="bcItems" style="border:none; padding:0; background:transparent" />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.breadcrumb }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── SELECT BUTTON ──────────────────────────────────────────────── -->
      <section id="selectbutton" class="sg-section">
        <h2 class="sg-section-title">SelectButton</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Seleção de período (uso típico nos filtros)</h3>
          <div class="sg-preview">
            <SelectButton
              v-model="selectedPeriod"
              :options="periodOptions"
              option-label="label"
              option-value="value"
            />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.selectButton }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── DATE PICKER ────────────────────────────────────────────────── -->
      <section id="datepicker" class="sg-section">
        <h2 class="sg-section-title">DatePicker</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Data simples e intervalo</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <DatePicker
                v-model="singleDate"
                date-format="dd/mm/yy"
                show-icon
                icon-display="input"
                placeholder="dd/mm/aaaa"
              />
              <DatePicker
                v-model="dateRange"
                selection-mode="range"
                date-format="dd/mm/yy"
                show-icon
                icon-display="input"
                placeholder="Intervalo de datas"
              />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.datePicker }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── MULTISELECT ────────────────────────────────────────────────── -->
      <section id="multiselect" class="sg-section">
        <h2 class="sg-section-title">MultiSelect</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Seleção múltipla com chips</h3>
          <div class="sg-preview">
            <MultiSelect
              v-model="selectedSituacoes"
              :options="situacaoOptions"
              placeholder="Todas as situações"
              display="chip"
              style="width: 280px"
            />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.multiSelect }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── SELECT ─────────────────────────────────────────────────────── -->
      <section id="select" class="sg-section">
        <h2 class="sg-section-title">Select</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Dropdown simples</h3>
          <div class="sg-preview">
            <Select
              v-model="selectedStatus"
              :options="statusOptions"
              placeholder="Selecione o status"
              style="width: 220px"
            />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.select }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── MENU ───────────────────────────────────────────────────────── -->
      <section id="menu" class="sg-section">
        <h2 class="sg-section-title">Menu (popup)</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Menu de ações contextual</h3>
          <div class="sg-preview">
            <Button icon="pi pi-ellipsis-v" severity="secondary" @click="toggleMenu" />
            <Menu ref="actionsMenu" :model="menuItems" popup />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.menu }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── POPOVER ────────────────────────────────────────────────────── -->
      <section id="popover" class="sg-section">
        <h2 class="sg-section-title">Popover</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Sobreposição com conteúdo customizado</h3>
          <div class="sg-preview">
            <Button label="Todos os bancos" icon="pi pi-chevron-down" icon-pos="right" severity="secondary" variant="outlined" @click="togglePopover" />
            <Popover ref="accountPopover">
              <div style="padding: 0.5rem; min-width: 14rem">
                <p style="margin: 0; font-size: 0.875rem; color: var(--p-text-muted-color)">Selecione uma conta:</p>
                <ul style="list-style:none; padding: 0.5rem 0; margin: 0; font-size: 0.875rem">
                  <li style="padding: 0.375rem 0">Bling Conta</li>
                  <li style="padding: 0.375rem 0">Banco do Brasil</li>
                  <li style="padding: 0.375rem 0">Nubank Empresarial</li>
                </ul>
              </div>
            </Popover>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.popover }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── DRAWER ─────────────────────────────────────────────────────── -->
      <section id="drawer" class="sg-section">
        <h2 class="sg-section-title">Drawer</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Painel lateral (usado nos filtros avançados)</h3>
          <div class="sg-preview">
            <Button label="Abrir filtros" icon="pi pi-sliders-v" severity="secondary" @click="drawerVisible = true" />
            <Drawer v-model:visible="drawerVisible" header="Filtros avançados" position="left">
              <p style="color: var(--p-text-muted-color); font-size: 0.875rem">Conteúdo dos filtros aqui.</p>
            </Drawer>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.drawer }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── CARD ───────────────────────────────────────────────────────── -->
      <section id="card" class="sg-section">
        <h2 class="sg-section-title">Card</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Variantes</h3>
          <div class="sg-preview">
            <div class="sg-row sg-row--wrap">
              <Card class="sg-card">
                <template #content><p>Card simples.</p></template>
              </Card>

              <Card class="sg-card">
                <template #title>Com título</template>
                <template #subtitle>Subtítulo</template>
                <template #content><p>Card com título e subtítulo.</p></template>
              </Card>

              <Card class="sg-card">
                <template #title>Com rodapé</template>
                <template #content><p>Card com ações no rodapé.</p></template>
                <template #footer>
                  <div class="sg-row">
                    <Button label="Cancelar"  variant="text" severity="secondary" />
                    <Button label="Confirmar" />
                  </div>
                </template>
              </Card>

              <Card class="sg-card" :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
                <template #content>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="pi pi-arrow-circle-down" style="font-size:1.25rem;color:var(--p-blue-500)" />
                    <div>
                      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">A RECEBER</div>
                      <div style="font-size:1.1rem;font-weight:700">R$ 12.450,00</div>
                      <div style="font-size:0.7rem;color:var(--p-text-muted-color)">8 lançamentos</div>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.card }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── TAG ────────────────────────────────────────────────────────── -->
      <section id="tag" class="sg-section">
        <h2 class="sg-section-title">Tag</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Severidades, ícones e rounded</h3>
          <div class="sg-preview">
            <div class="sg-col">
              <div class="sg-row">
                <Tag value="Primary" />
                <Tag value="Success"   severity="success" />
                <Tag value="Warning"   severity="warn" />
                <Tag value="Danger"    severity="danger" />
                <Tag value="Info"      severity="info" />
                <Tag value="Secondary" severity="secondary" />
              </div>
              <div class="sg-row">
                <Tag value="Em Estoque"   severity="success" icon="pi pi-check" />
                <Tag value="Baixo Estoque" severity="warn"   icon="pi pi-exclamation-triangle" />
                <Tag value="Sem Estoque"  severity="danger"  icon="pi pi-times" />
              </div>
              <div class="sg-row">
                <Tag value="Recebida"  severity="success" rounded />
                <Tag value="Atrasada"  severity="danger"  rounded />
                <Tag value="A receber"  severity="secondary" rounded />
              </div>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.tag }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── TOAST ──────────────────────────────────────────────────────── -->
      <section id="toast" class="sg-section">
        <h2 class="sg-section-title">Toast</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Notificações (clique para visualizar)</h3>
          <div class="sg-preview">
            <div class="sg-row">
              <Button label="Success" severity="success" icon="pi pi-check"
                @click="showToast('success', 'Sucesso', 'Operação realizada com sucesso!')" />
              <Button label="Info"    severity="info"    icon="pi pi-info-circle"
                @click="showToast('info', 'Informação', 'Aqui vai uma informação importante.')" />
              <Button label="Warning" severity="warn"    icon="pi pi-exclamation-triangle"
                @click="showToast('warn', 'Atenção', 'Verifique os dados antes de continuar.')" />
              <Button label="Error"   severity="danger"  icon="pi pi-times"
                @click="showToast('error', 'Erro', 'Algo deu errado. Tente novamente.')" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.toast }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── DATA TABLE ─────────────────────────────────────────────────── -->
      <section id="datatable" class="sg-section">
        <h2 class="sg-section-title">DataTable + Column</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Padrão com seleção, Tag e ações</h3>
          <div class="sg-preview">
            <DataTable :value="tableData" stripedRows size="small">
              <Column field="id"        header="#"         style="width: 3rem" />
              <Column field="nome"      header="Produto" />
              <Column field="categoria" header="Categoria" />
              <Column field="preco"     header="Preço"     bodyStyle="text-align:right;font-weight:600" :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }">
                <template #body="{ data }">{{ fmtBRL(data.preco) }}</template>
              </Column>
              <Column field="status"    header="Status">
                <template #body="{ data }">
                  <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
              </Column>
              <Column header="Ações" style="width: 3rem">
                <template #body>
                  <div class="sg-row sg-row--tight">
                    <Button icon="pi pi-pencil" variant="text" rounded size="small" />
                    <Button icon="pi pi-trash"  variant="text" rounded size="small" severity="danger" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.dataTable }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── CHART ──────────────────────────────────────────────────────── -->
      <section id="chart" class="sg-section">
        <h2 class="sg-section-title">Chart</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Barras + linha de saldo (fluxo de caixa)</h3>
          <div class="sg-preview" style="height: 16rem">
            <Chart type="bar" :data="chartData" :options="chartOptions" style="height: 100%" />
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.chart }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── FILTER BAR ─────────────────────────────────────────────────── -->
      <section id="filterbar" class="sg-section">
        <h2 class="sg-section-title">FilterBar</h2>

        <div class="sg-block">
          <h3 class="sg-block-title">Chips de filtros ativos + barra de seleção em massa</h3>
          <div class="sg-preview sg-preview--surface">
            <!-- Simulação de card de tabela com toolbar + FilterBar -->
            <div style="background: var(--p-surface-card); border: 1px solid var(--p-surface-border); border-radius: 0.5rem; overflow: hidden">
              <!-- Toolbar simulada -->
              <div style="display:flex; align-items:center; gap:0.5rem; padding:0.75rem 1rem; border-bottom:1px solid var(--p-surface-border)">
                <Button icon="pi pi-sliders-v" variant="text" severity="secondary" @click="fbDrawer = true" v-tooltip="'Filtros avançados'" />
                <IconField style="flex:1">
                  <InputIcon class="pi pi-search" />
                  <InputText placeholder="Pesquisar..." style="width:100%" />
                </IconField>
                <SelectButton v-model="selectedPeriod" :options="periodOptions" option-label="label" option-value="value" size="small" />
              </div>
              <!-- FilterBar -->
              <FilterBar
                v-model="fbValues"
                v-model:filtersDrawerVisible="fbDrawer"
                :filters="fbFilters"
                :selection-count="fbSelCount"
                :total-count="42"
                :selection-actions="fbSelectionActions"
                @clear="fbValues = {}"
                @clear-selection="fbSelCount = 0"
              />
            </div>
            <!-- Controles de preview -->
            <div style="margin-top:0.875rem; display:flex; align-items:center; gap:0.5rem">
              <span style="font-size:0.8125rem; color:var(--p-text-muted-color)">Simular:</span>
              <Button label="Sem seleção"     size="small" severity="secondary" :outlined="fbSelCount === 0" @click="fbSelCount = 0" />
              <Button label="3 selecionados"  size="small" severity="secondary" :outlined="fbSelCount !== 3" @click="fbSelCount = 3" />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.filterBar }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </section>

      <!-- ── PADRÕES ────────────────────────────────────────────────────── -->
      <section class="sg-section">
        <h2 class="sg-section-title" style="color: var(--p-primary-color)">Padrões estruturais</h2>

        <!-- Cabeçalho de página -->
        <div id="pattern-header" class="sg-block">
          <h3 class="sg-block-title">Cabeçalho de página</h3>
          <div class="sg-preview sg-preview--surface">
            <div style="background: var(--p-surface-card); padding: 1rem 1.5rem; border: 1px solid var(--p-surface-border); border-radius: 0.5rem">
              <Breadcrumb :home="bcHome" :model="bcItems" style="border:none; padding:0; margin-bottom:0.75rem; background:transparent" />
              <div style="display:flex; align-items:center; gap:0.625rem">
                <span style="font-size:1.5rem; font-weight:700; color: var(--p-text-color)">Contas a receber</span>
                <Button icon="pi pi-ellipsis-v" severity="secondary" style="margin-left:auto" />
                <Button label="Nova conta a receber" icon="pi pi-plus" />
              </div>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternHeader }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Cards de resumo -->
        <div id="pattern-cards" class="sg-block">
          <h3 class="sg-block-title">Cards de resumo (totalizadores)</h3>
          <div class="sg-preview">
            <div style="display:grid; grid-template-columns: repeat(4,1fr); gap:0.75rem">
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
                <template #content>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="pi pi-arrow-circle-down" style="font-size:1.125rem;color:var(--p-blue-500)" />
                    <div>
                      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">A RECEBER</div>
                      <div style="font-size:1rem;font-weight:700">R$ 12.450,00</div>
                      <div style="font-size:0.7rem;color:var(--p-text-muted-color)">8 lançamentos</div>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-orange-500)' } }">
                <template #content>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="pi pi-arrow-circle-up" style="font-size:1.125rem;color:var(--p-orange-500)" />
                    <div>
                      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">A PAGAR</div>
                      <div style="font-size:1rem;font-weight:700">R$ 4.200,00</div>
                      <div style="font-size:0.7rem;color:var(--p-text-muted-color)">3 lançamentos</div>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500)' } }">
                <template #content>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="pi pi-trending-up" style="font-size:1.125rem;color:var(--p-green-500)" />
                    <div>
                      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">SALDO PREVISTO</div>
                      <div style="font-size:1rem;font-weight:700;color:var(--p-green-600)">R$ 8.250,00</div>
                      <div style="font-size:0.7rem;color:var(--p-text-muted-color)">Receber − Pagar</div>
                    </div>
                  </div>
                </template>
              </Card>
              <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500)' } }">
                <template #content>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="pi pi-exclamation-circle" style="font-size:1.125rem;color:var(--p-red-500)" />
                    <div>
                      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">EM ATRASO</div>
                      <div style="font-size:1rem;font-weight:700;color:var(--p-red-600)">R$ 1.800,00</div>
                      <div style="font-size:0.7rem;color:var(--p-text-muted-color)">2 lançamentos</div>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternCards }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Visão geral com toggle -->
        <div id="pattern-overview" class="sg-block">
          <h3 class="sg-block-title">Visão geral — card contentor com toggle</h3>
          <div class="sg-preview sg-preview--surface">
            <div style="background: var(--p-surface-card); border: 1px solid var(--p-surface-border); border-radius: 0.5rem; overflow: hidden">
              <!-- Barra do toggle -->
              <div style="display:flex; padding:0.75rem 1rem; border-bottom:1px solid var(--p-surface-border)">
                <SelectButton v-model="overviewSgMode" :options="overviewSgOptions" option-label="label" option-value="value" size="small" />
              </div>
              <!-- Visão: Fluxo de caixa -->
              <template v-if="overviewSgMode === 'grafico'">
                <div style="display:flex;align-items:baseline;gap:0.625rem;padding:1rem 1.25rem 0.75rem;border-bottom:1px solid var(--p-surface-border)">
                  <span style="font-size:0.9375rem;font-weight:700;color:var(--p-text-color)">Fluxo de caixa</span>
                  <span style="font-size:0.8125rem;color:var(--p-text-muted-color)">Entradas e saídas agrupadas por semana</span>
                </div>
                <div style="padding:1rem 1.25rem;height:17rem">
                  <Chart type="bar" :data="chartData" :options="chartOptions" style="height:100%" />
                </div>
              </template>
              <!-- Visão: Totalizadores -->
              <div v-if="overviewSgMode === 'cards'" style="padding:1rem">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
                  <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-blue-500)' } }">
                    <template #content>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <i class="pi pi-arrow-circle-down" style="font-size:1.125rem;color:var(--p-blue-500)" />
                        <div>
                          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">A RECEBER</div>
                          <div style="font-size:1rem;font-weight:700">R$ 12.450,00</div>
                          <div style="font-size:0.7rem;color:var(--p-text-muted-color)">8 lançamentos</div>
                        </div>
                      </div>
                    </template>
                  </Card>
                  <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-orange-500)' } }">
                    <template #content>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <i class="pi pi-arrow-circle-up" style="font-size:1.125rem;color:var(--p-orange-500)" />
                        <div>
                          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">A PAGAR</div>
                          <div style="font-size:1rem;font-weight:700">R$ 4.200,00</div>
                          <div style="font-size:0.7rem;color:var(--p-text-muted-color)">3 lançamentos</div>
                        </div>
                      </div>
                    </template>
                  </Card>
                  <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-green-500)' } }">
                    <template #content>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <i class="pi pi-trending-up" style="font-size:1.125rem;color:var(--p-green-500)" />
                        <div>
                          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">SALDO PREVISTO</div>
                          <div style="font-size:1rem;font-weight:700;color:var(--p-green-600)">R$ 8.250,00</div>
                          <div style="font-size:0.7rem;color:var(--p-text-muted-color)">Receber − Pagar</div>
                        </div>
                      </div>
                    </template>
                  </Card>
                  <Card :pt="{ root: { style: 'border-left: 3px solid var(--p-red-500)' } }">
                    <template #content>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <i class="pi pi-exclamation-circle" style="font-size:1.125rem;color:var(--p-red-500)" />
                        <div>
                          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">EM ATRASO</div>
                          <div style="font-size:1rem;font-weight:700;color:var(--p-red-600)">R$ 1.800,00</div>
                          <div style="font-size:0.7rem;color:var(--p-text-muted-color)">2 lançamentos</div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternOverview }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Tabela -->
        <div id="pattern-table" class="sg-block">
          <h3 class="sg-block-title">Tabela com toolbar integrada</h3>
          <div class="sg-preview sg-preview--surface">
            <div style="background: var(--p-surface-card); border: 1px solid var(--p-surface-border); border-radius: 0.5rem; overflow: hidden">
              <div style="display:flex; align-items:center; gap:0.5rem; padding:0.75rem 1rem">
                <Button icon="pi pi-sliders-v" variant="text" severity="secondary" v-tooltip="'Filtros'" />
                <IconField style="flex:1">
                  <InputIcon class="pi pi-search" />
                  <InputText placeholder="Pesquisar..." style="width:100%" />
                </IconField>
                <SelectButton v-model="selectedPeriod" :options="periodOptions" option-label="label" option-value="value" />
              </div>
              <DataTable :value="tableData" stripedRows size="small">
                <Column field="nome"      header="Nome" />
                <Column field="categoria" header="Categoria" />
                <Column field="preco"     header="Preço" bodyStyle="text-align:right;font-weight:600" :pt="{ columnHeaderContent: { style: { justifyContent: 'flex-end' } } }">
                  <template #body="{ data }">{{ fmtBRL(data.preco) }}</template>
                </Column>
                <Column field="status" header="Situação">
                  <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternTable }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Status Tags -->
        <div id="pattern-status" class="sg-block">
          <h3 class="sg-block-title">Status Tags — Mapa de severidades</h3>
          <div class="sg-preview">
            <div style="display:flex;flex-direction:column;gap:1.25rem">
              <!-- Contas a Receber -->
              <div>
                <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color);margin-bottom:0.5rem">Contas a Receber</div>
                <div class="sg-row">
                  <Tag value="A receber"              severity="secondary" v-tooltip="'secondary'" />
                  <Tag value="Atrasada"              severity="danger"    v-tooltip="'danger'" />
                  <Tag value="Recebida"              severity="success"   v-tooltip="'success'" />
                  <Tag value="Recebida parcialmente" severity="warn"      v-tooltip="'warn'" />
                  <Tag value="Antecipada"            severity="info"      v-tooltip="'info'" />
                </div>
              </div>
              <!-- Contas a Pagar -->
              <div>
                <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color);margin-bottom:0.5rem">Contas a Pagar</div>
                <div class="sg-row">
                  <Tag value="A receber"          severity="secondary" v-tooltip="'secondary'" />
                  <Tag value="Atrasada"          severity="danger"    v-tooltip="'danger'" />
                  <Tag value="Paga"              severity="success"   v-tooltip="'success'" />
                  <Tag value="Paga parcialmente" severity="warn"      v-tooltip="'warn'" />
                  <Tag value="Para Aprovação"    severity="warn"      v-tooltip="'warn'" />
                </div>
              </div>
              <!-- Carteiras Marketplace -->
              <div>
                <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color);margin-bottom:0.5rem">Carteiras Marketplace</div>
                <div class="sg-row">
                  <Tag value="A Liberar"               severity="warn"      v-tooltip="'warn'" />
                  <Tag value="Liberado"                severity="success"   v-tooltip="'success'" />
                  <Tag value="Retido"                  severity="danger"    v-tooltip="'danger'" />
                  <Tag value="Conciliado"              severity="success"   v-tooltip="'success'" />
                  <Tag value="Divergente"              severity="danger"    v-tooltip="'danger'" />
                  <Tag value="Antecipado"              severity="info"      v-tooltip="'info'" />
                  <Tag value="Antecipado parcialmente" severity="warn"      v-tooltip="'warn'" />
                </div>
              </div>
              <!-- Carteira POS -->
              <div>
                <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color);margin-bottom:0.5rem">Carteira POS</div>
                <div class="sg-row">
                  <Tag value="Pendente"   severity="warn"    v-tooltip="'warn'" />
                  <Tag value="Conciliado" severity="success" v-tooltip="'success'" />
                  <Tag value="Conferido"  severity="success" v-tooltip="'success'" />
                  <Tag value="Divergente" severity="danger"  v-tooltip="'danger'" />
                  <Tag value="Antecipado" severity="info"    v-tooltip="'info'" />
                </div>
              </div>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternStatusTags }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Panel (form) -->
        <div id="pattern-panel" class="sg-block">
          <h3 class="sg-block-title">Formulário em Panel (slide-in)</h3>
          <div class="sg-preview">
            <Button label="Abrir Panel" icon="pi pi-arrow-right" @click="panelVisible = true" />
            <Teleport to="body">
              <Transition name="sg-panel-slide">
                <div v-if="panelVisible" class="sg-panel-page">
                  <header class="sg-panel-header">
                    <div class="sg-panel-header-start">
                      <Button icon="pi pi-arrow-left" variant="text" rounded @click="panelVisible = false" />
                      <span class="sg-panel-header-title">Nova conta a receber</span>
                    </div>
                    <div class="sg-panel-header-end">
                      <Button label="Cancelar" severity="secondary" variant="outlined" @click="panelVisible = false" />
                      <Button label="Salvar conta" icon="pi pi-check" :loading="panelSaving" @click="simulatePanelSave" />
                    </div>
                  </header>
                  <div class="sg-panel-body">
                    <Card>
                      <template #title><i class="pi pi-file-edit" /> Dados gerais</template>
                      <template #content>
                        <div style="display:flex;flex-direction:column;gap:1.25rem">
                          <FloatLabel variant="on">
                            <InputText id="sg-desc" fluid />
                            <label for="sg-desc">Descrição <span style="color:var(--p-red-500)">*</span></label>
                          </FloatLabel>
                          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                            <FloatLabel variant="on">
                              <InputNumber id="sg-valor" mode="currency" currency="BRL" locale="pt-BR" fluid />
                              <label for="sg-valor">Valor <span style="color:var(--p-red-500)">*</span></label>
                            </FloatLabel>
                            <FloatLabel variant="on">
                              <DatePicker id="sg-venc" date-format="dd/mm/yy" show-icon icon-display="input" fluid />
                              <label for="sg-venc">Vencimento <span style="color:var(--p-red-500)">*</span></label>
                            </FloatLabel>
                          </div>
                          <FloatLabel variant="on">
                            <Select id="sg-conta" :options="['Itaú Empresa', 'Bradesco PJ', 'PagSeguro']" placeholder=" " fluid />
                            <label for="sg-conta">Conta financeira</label>
                          </FloatLabel>
                        </div>
                      </template>
                    </Card>
                    <Card style="margin-top:1rem">
                      <template #title><i class="pi pi-info-circle" /> Observações</template>
                      <template #content>
                        <FloatLabel variant="on">
                          <Textarea id="sg-obs" rows="3" auto-resize fluid />
                          <label for="sg-obs">Observações</label>
                        </FloatLabel>
                      </template>
                    </Card>
                  </div>
                  <footer class="sg-panel-footer">
                    <span style="font-size:0.75rem;color:var(--p-text-muted-color)"><span style="color:var(--p-red-500)">*</span> Campos obrigatórios</span>
                  </footer>
                </div>
              </Transition>
            </Teleport>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternPanel }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Dialog (form) -->
        <div id="pattern-dialog" class="sg-block">
          <h3 class="sg-block-title">Formulário em Dialog (modal)</h3>
          <div class="sg-preview">
            <Button label="Abrir Dialog" icon="pi pi-external-link" @click="dialogVisible = true" />
            <Dialog :visible="dialogVisible" modal header="Novo cliente" :style="{ width: '26rem', maxWidth: '95vw' }" @update:visible="(v) => { if (!v) dialogVisible = false }">
              <div style="display:flex;flex-direction:column;gap:1.25rem;padding-top:0.5rem">
                <FloatLabel variant="on">
                  <InputText id="sg-cli-nome" fluid />
                  <label for="sg-cli-nome">Nome <span style="color:var(--p-red-500)">*</span></label>
                </FloatLabel>
                <FloatLabel variant="on">
                  <InputText id="sg-cli-cnpj" fluid />
                  <label for="sg-cli-cnpj">CNPJ</label>
                </FloatLabel>
              </div>
              <template #footer>
                <Button label="Cancelar" severity="secondary" variant="outlined" @click="dialogVisible = false" />
                <Button label="Cadastrar" icon="pi pi-check" :loading="dialogSaving" @click="simulateDialogSave" />
              </template>
            </Dialog>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternDialog }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Menu de linha -->
        <div id="pattern-row-menu" class="sg-block">
          <h3 class="sg-block-title">Menu de ações por linha (row actions)</h3>
          <div class="sg-preview">
            <div style="display:flex;align-items:center;gap:1rem">
              <span style="font-size:0.875rem;color:var(--p-text-muted-color)">Clique no botão →</span>
              <Button icon="pi pi-ellipsis-v" variant="text" rounded size="small" severity="secondary" @click="toggleRowMenu" />
              <Menu ref="rowMenu" :model="rowMenuItems" popup />
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternRowMenu }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Seleção em massa -->
        <div id="pattern-bulk" class="sg-block">
          <h3 class="sg-block-title">Seleção em massa (bulk actions)</h3>
          <div class="sg-preview sg-preview--surface">
            <div style="background: var(--p-surface-card); border: 1px solid var(--p-surface-border); border-radius: 0.5rem; overflow: hidden">
              <FilterBar
                v-model="fbValues"
                v-model:filtersDrawerVisible="fbDrawer"
                :filters="fbFilters"
                :selection-count="3"
                :total-count="25"
                :selection-actions="fbSelectionActions"
                @clear="fbValues = {}"
                @clear-selection="fbSelCount = 0"
              />
            </div>
            <p style="margin:0.75rem 0 0;font-size:0.8125rem;color:var(--p-text-muted-color)">
              A FilterBar acima está em modo de seleção (selection-count=3). Quando selectionCount &gt; 0, os chips de filtros são substituídos pela barra de ações em massa.
            </p>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternBulkActions }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Empty State -->
        <div id="pattern-empty" class="sg-block">
          <h3 class="sg-block-title">Empty State</h3>
          <div class="sg-preview sg-preview--surface">
            <div style="background:var(--p-surface-card);border:1px solid var(--p-surface-border);border-radius:0.5rem;overflow:hidden;padding:1rem 0">
              <div v-if="emptyStateDemo" class="sg-empty-state">
                <i class="pi pi-filter-slash" />
                <span>Nenhum resultado para os filtros aplicados.</span>
                <Button label="Limpar filtros" icon="pi pi-times" size="small" severity="secondary" @click="emptyStateDemo = false" />
              </div>
              <div v-else style="text-align:center;padding:1rem;font-size:0.875rem;color:var(--p-text-muted-color)">
                <span>Filtros limpos!</span>
                <Button label="Restaurar empty state" size="small" variant="text" style="margin-left:0.5rem" @click="emptyStateDemo = true" />
              </div>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternEmptyState }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Selector Chip -->
        <div id="pattern-chip" class="sg-block">
          <h3 class="sg-block-title">Account / Channel Selector Chip</h3>
          <div class="sg-preview">
            <div style="display:flex;align-items:center;gap:1rem">
              <button class="sg-conta-chip" @click="toggleChipPopover">
                <span>{{ chipSelected }}</span>
                <i class="pi pi-chevron-down" style="font-size:0.75rem" />
              </button>
              <Popover ref="chipPopover" class="sg-chip-popover">
                <div style="padding:0.625rem;border-bottom:1px solid var(--p-surface-border)">
                  <IconField style="width:100%">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="chipSearch" placeholder="Buscar conta..." style="width:100%" size="small" />
                  </IconField>
                </div>
                <ul class="sg-chip-list">
                  <template v-for="opt in chipOptionsFiltered()" :key="opt.label">
                    <li v-if="opt.separator" class="sg-chip-separator">{{ opt.label }}</li>
                    <li v-else class="sg-chip-item" @click="selectChip(opt.label)">
                      <i v-if="opt.label === chipSelected" class="pi pi-check" style="font-size:0.75rem;color:var(--p-primary-color)" />
                      <span>{{ opt.label }}</span>
                    </li>
                  </template>
                </ul>
              </Popover>
            </div>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternChipSelector }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- FAB Config -->
        <div id="pattern-fab" class="sg-block">
          <h3 class="sg-block-title">FAB de configurações</h3>
          <div class="sg-preview">
            <div style="display:flex;align-items:center;gap:1rem">
              <span style="font-size:0.875rem;color:var(--p-text-muted-color)">Clique no FAB →</span>
              <Button icon="pi pi-sliders-h" rounded severity="secondary" @click="toggleFabPopover"
                v-tooltip="'Configurações da tabela'"
                style="width:3rem;height:3rem;box-shadow:0 4px 12px rgba(0,0,0,0.15)" />
              <Popover ref="fabPopover">
                <div style="display:flex;flex-direction:column;gap:0.5rem;padding:0.25rem">
                  <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--p-text-muted-color)">Densidade da tabela</span>
                  <SelectButton v-model="tableSizeDemo" :options="tableSizeOptions" optionLabel="label" optionValue="value" size="small" />
                </div>
              </Popover>
              <span style="font-size:0.8125rem;color:var(--p-text-muted-color)">Selecionado: <strong>{{ tableSizeDemo }}</strong></span>
            </div>
            <p style="margin:1rem 0 0;font-size:0.8125rem;color:var(--p-text-muted-color)">
              No app real, o FAB fica fixo no canto inferior direito (<code>position: fixed; bottom: 1.5rem; right: 1.5rem;</code>).
            </p>
          </div>
          <Accordion>
            <AccordionPanel value="0">
              <AccordionHeader>Código</AccordionHeader>
              <AccordionContent>
                <pre class="sg-code">{{ code.patternFab }}</pre>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

      </section>

    </div>
  </div>
</template>

<style scoped>
.sg-page {
  min-height: 100vh;
  background: var(--p-surface-ground);
}

.sg-top {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sg-header {
  padding: 1.5rem 2rem 1rem;
  text-align: center;
}

.sg-title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.sg-subtitle {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.95rem;
}

/* ── Índice ──────────────────────────────────────────────────────────────────── */
.sg-index {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.75rem;
  border-top: 1px solid var(--p-surface-border);
  padding: 0.75rem 2rem;
}

.sg-index-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
}

.sg-index-label:not(:first-child) {
  margin-left: 0.75rem;
}

.sg-index a {
  font-size: 0.8125rem;
  color: var(--p-primary-color);
  text-decoration: none;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.1s, color 0.1s, font-weight 0.1s;
}

.sg-index a:hover {
  background: var(--p-surface-hover);
}

.sg-index a.is-active {
  background: var(--p-primary-color);
  color: #ffffff;
  font-weight: 600;
}

/* ── Layout ──────────────────────────────────────────────────────────────────── */
.sg-content {
  position: relative;
  z-index: 0;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sg-section,
.sg-block[id] {
  scroll-margin-top: 14rem;
}

.sg-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sg-section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--p-surface-border);
}

/* ── Bloco (preview + código) ────────────────────────────────────────────────── */
.sg-block {
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sg-block-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  padding: 0.875rem 1.25rem 0;
}

.sg-preview {
  padding: 1.25rem 1.5rem;
}

.sg-preview--surface {
  background: var(--p-surface-ground);
}

/* ── Código ──────────────────────────────────────────────────────────────────── */
.sg-code {
  margin: 0;
  padding: 1rem 1.25rem;
  background: var(--p-surface-ground);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--p-text-color);
  overflow-x: auto;
  white-space: pre;
}

/* ── Accordion de código ─────────────────────────────────────────────────────── */
.sg-block :deep(.p-accordion) {
  border-top: 1px solid var(--p-surface-border);
}

.sg-block :deep(.p-accordionpanel) {
  border: none;
  border-radius: 0;
}

.sg-block :deep(.p-accordionheader) {
  background: var(--p-surface-hover);
  border: none;
  border-radius: 0 !important;
  padding: 0.625rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.sg-block :deep(.p-accordionheader:hover) {
  background: var(--p-surface-border) !important;
}

.sg-block :deep(.p-accordioncontent-content) {
  padding: 0;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
.sg-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
}

.sg-row--align-center { align-items: center; }
.sg-row--wrap         { flex-wrap: wrap; }
.sg-row--tight        { gap: 0.25rem; }

.sg-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 320px;
}

.sg-card {
  flex: 1;
  min-width: 200px;
}

/* ── Panel demo ─────────────────────────────────────────────────────────────── */
.sg-panel-page {
  position: fixed;
  top: 0;
  left: var(--app-sidebar-w, 15rem);
  right: 0;
  bottom: 0;
  background: var(--p-surface-ground);
  border-radius: 20px 0 0 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.sg-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.5rem 0.625rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  background: var(--p-surface-card);
  border-radius: 20px 0 0 0;
  flex-shrink: 0;
}

.sg-panel-header-start {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sg-panel-header-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.sg-panel-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sg-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 2rem;
  max-width: 40rem;
}

.sg-panel-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--p-surface-border);
  padding: 0.75rem 1.75rem;
  background: var(--p-surface-card);
}

.sg-panel-slide-enter-active,
.sg-panel-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sg-panel-slide-enter-from,
.sg-panel-slide-leave-to {
  transform: translateX(100%);
}

/* ── Empty state demo ───────────────────────────────────────────────────────── */
.sg-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.sg-empty-state .pi {
  font-size: 1.5rem;
}

/* ── Chip selector demo ─────────────────────────────────────────────────────── */
.sg-conta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid var(--p-surface-300);
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.sg-conta-chip:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-primary-color);
}

.sg-chip-popover {
  min-width: 17rem;
}

.sg-chip-popover :deep(.p-popover-content) {
  padding: 0;
}

.sg-chip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16rem;
  overflow-y: auto;
}

.sg-chip-separator {
  padding: 0.5rem 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.sg-chip-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
}

.sg-chip-item:hover {
  background: var(--p-surface-hover);
}
</style>
