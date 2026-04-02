<script setup>
import { ref, computed } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'

const props = defineProps({
  modelValue:   { type: Boolean, default: false },
  items:        { type: Array,   default: () => [] },
  saldoAtual:   { type: Number,  default: 0 },
  lancamentos:  { type: Array,   default: () => [] },
  contasAPagar: { type: Array,   default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'confirmed'])

// ── Parâmetros editáveis ──────────────────────────────────────────────────────
const taxaPerc = ref(1.8)
const IOF_PERC = 0.38

// ── Parse helpers ─────────────────────────────────────────────────────────────
const parseValorStr = (str) => {
  if (typeof str === 'number') return str
  if (!str) return 0
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0
}

const parseDateBR = (str) => {
  if (!str) return null
  const parts = str.split('/')
  if (parts.length !== 3) return null
  return new Date(+parts[2], +parts[1] - 1, +parts[0])
}

// ── Cálculos ──────────────────────────────────────────────────────────────────
const valorBruto   = computed(() => props.items.reduce((s, c) => s + parseValorStr(c.valor), 0))
const custoTaxa    = computed(() => valorBruto.value * (taxaPerc.value || 0) / 100)
const custoIOF     = computed(() => valorBruto.value * IOF_PERC / 100)
const custoTotal   = computed(() => custoTaxa.value + custoIOF.value)
const valorLiquido = computed(() => valorBruto.value - custoTotal.value)
const saldoApos    = computed(() => props.saldoAtual + valorLiquido.value)
const cet          = computed(() => valorLiquido.value > 0
  ? ((valorBruto.value / valorLiquido.value) - 1) * 100
  : 0
)

// ── Comparativo de fôlego ─────────────────────────────────────────────────────
const HORIZON = 90

function projetarDias(saldoInicial) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const fluxo = {}
  const add = (key, valor, tipo) => {
    if (!key) return
    if (!fluxo[key]) fluxo[key] = 0
    fluxo[key] += tipo === 'Entrada' ? valor : -valor
  }
  props.lancamentos.forEach(l => {
    if (l.situacao !== 'A receber' && l.situacao !== 'A pagar') return
    const d = parseDateBR(l.data)
    if (!d || d < hoje) return
    add(d.toISOString().split('T')[0], parseValorStr(l.valor), l.tipo)
  })
  props.contasAPagar.forEach(c => {
    if (c.situacao !== 'A pagar' && c.situacao !== 'Atrasada') return
    const d = parseDateBR(c.vencimento)
    if (!d) return
    add(d.toISOString().split('T')[0], parseValorStr(c.valor), 'Saída')
  })
  let saldo = saldoInicial
  for (let i = 0; i < HORIZON; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    if (fluxo[key]) saldo += fluxo[key]
    if (saldo < 0) return i + 1
  }
  return null
}

const diasSemAntecipar = computed(() => projetarDias(props.saldoAtual))
const diasComAntecipar = computed(() => projetarDias(props.saldoAtual + valorLiquido.value))

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtBRL  = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPerc = (v) => v.toFixed(2).replace('.', ',') + '%'

const creditoD1 = computed(() => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('pt-BR')
})

// ── Confirmação ───────────────────────────────────────────────────────────────
const saving = ref(false)
const handleConfirmar = async () => {
  saving.value = true
  try {
    emit('confirmed', {
      taxaPerc:     taxaPerc.value,
      custoTotal:   custoTotal.value,
      valorLiquido: valorLiquido.value,
      count:        props.items.length,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Drawer
    :visible="modelValue"
    @update:visible="emit('update:modelValue', $event)"
    position="right"
    :style="{ width: '26rem' }"
    :pt="{ content: { style: 'padding: 0; display: flex; flex-direction: column; overflow: hidden;' } }"
  >
    <template #header>
      <div class="ar-header">
        <i class="pi pi-bolt ar-header-icon" />
        <div>
          <div class="ar-header-title">Antecipar Recebíveis</div>
          <div class="ar-header-sub">
            {{ items.length }} recebível{{ items.length !== 1 ? 'is' : '' }} · {{ fmtBRL(valorBruto) }}
          </div>
        </div>
      </div>
    </template>

    <!-- Corpo com scroll -->
    <div class="ar-body">

      <!-- Seção: Taxa -->
      <div class="ar-section">
        <p class="ar-section-title">Taxa da operação</p>
        <div class="ar-taxa-row">
          <label class="ar-taxa-label">Taxa de desconto</label>
          <InputNumber
            v-model="taxaPerc"
            :min="0"
            :max="100"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            suffix="% a.m."
            :input-style="{ width: '8rem', textAlign: 'right' }"
          />
        </div>
      </div>

      <Divider class="ar-divider" />

      <!-- Seção: Simulação -->
      <div class="ar-section">
        <p class="ar-section-title">Simulação de custos</p>

        <div class="ar-row">
          <span>Valor bruto</span>
          <span class="ar-val">{{ fmtBRL(valorBruto) }}</span>
        </div>
        <div class="ar-row">
          <span>Taxa ({{ fmtPerc(taxaPerc || 0) }} a.m.)</span>
          <span class="ar-val ar-val--cost">-{{ fmtBRL(custoTaxa) }}</span>
        </div>
        <div class="ar-row">
          <span>IOF ({{ fmtPerc(IOF_PERC) }})</span>
          <span class="ar-val ar-val--cost">-{{ fmtBRL(custoIOF) }}</span>
        </div>
        <div class="ar-row ar-row--sep">
          <span class="ar-row-label--muted">Custo total</span>
          <span class="ar-val ar-val--cost ar-val--bold">{{ fmtBRL(custoTotal) }}</span>
        </div>
        <div class="ar-row ar-row--destaque">
          <span class="ar-val--bold">Valor líquido</span>
          <span class="ar-val ar-val--green ar-val--bold ar-val--lg">{{ fmtBRL(valorLiquido) }}</span>
        </div>
        <div class="ar-row">
          <span class="ar-row-label--muted">CET</span>
          <span class="ar-val ar-val--warn">{{ fmtPerc(cet) }} a.m.</span>
        </div>
        <div class="ar-row">
          <span class="ar-row-label--muted">Crédito em conta</span>
          <span class="ar-val">{{ creditoD1 }} (D+1)</span>
        </div>
      </div>

      <Divider class="ar-divider" />

      <!-- Seção: Impacto no caixa -->
      <div class="ar-section">
        <p class="ar-section-title">Impacto no caixa</p>
        <div class="ar-saldo-boxes">
          <div class="ar-saldo-box">
            <span class="ar-saldo-label">Saldo atual</span>
            <span class="ar-saldo-val">{{ fmtBRL(saldoAtual) }}</span>
          </div>
          <i class="pi pi-arrow-right ar-saldo-arrow" />
          <div class="ar-saldo-box ar-saldo-box--after">
            <span class="ar-saldo-label">Saldo após</span>
            <span class="ar-saldo-val ar-saldo-val--green">{{ fmtBRL(saldoApos) }}</span>
          </div>
        </div>

        <ul class="ar-what-list">
          <li>
            <i class="pi pi-arrow-circle-up ar-icon-in" />
            <span>Crédito de <strong>{{ fmtBRL(valorLiquido) }}</strong> (D+1)</span>
          </li>
          <li>
            <i class="pi pi-arrow-circle-down ar-icon-out" />
            <span>Despesa financeira de <strong>{{ fmtBRL(custoTotal) }}</strong></span>
          </li>
          <li>
            <i class="pi pi-bolt ar-icon-bolt" />
            <span>
              {{ items.length }} recebível{{ items.length !== 1 ? 'is' : '' }} →
              <Tag value="Antecipada" severity="info" style="font-size: 0.75rem;" />
            </span>
          </li>
        </ul>
      </div>

      <Divider class="ar-divider" />

      <!-- Seção: Fôlego de caixa -->
      <div class="ar-section">
        <p class="ar-section-title">Fôlego de caixa ({{ HORIZON }} dias)</p>
        <div class="ar-comp-row">
          <span class="ar-comp-label">Sem antecipar</span>
          <span v-if="diasSemAntecipar === null" class="ar-chip ar-chip--ok">
            <i class="pi pi-check-circle" /> Sem risco
          </span>
          <span v-else class="ar-chip ar-chip--risk">
            <i class="pi pi-exclamation-circle" /> {{ diasSemAntecipar }} dias
          </span>
        </div>
        <div class="ar-comp-row">
          <span class="ar-comp-label">Com antecipação</span>
          <span v-if="diasComAntecipar === null" class="ar-chip ar-chip--ok">
            <i class="pi pi-check-circle" /> Sem risco
          </span>
          <span v-else class="ar-chip ar-chip--warn">
            <i class="pi pi-info-circle" /> {{ diasComAntecipar }} dias
          </span>
        </div>
      </div>

    </div><!-- /.ar-body -->

    <template #footer>
      <div class="ar-footer">
        <Button
          label="Cancelar"
          severity="secondary"
          variant="outlined"
          fluid
          @click="emit('update:modelValue', false)"
        />
        <Button
          label="Confirmar"
          icon="pi pi-bolt"
          fluid
          :loading="saving"
          @click="handleConfirmar"
        />
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
/* ── Header ─────────────────────────────────────────────────────────────────── */
.ar-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.ar-header-icon {
  font-size: 1.125rem;
  color: var(--p-primary-color);
}

.ar-header-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.3;
}

.ar-header-sub {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* ── Body ───────────────────────────────────────────────────────────────────── */
.ar-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.25rem;
}

.ar-divider {
  margin: 0 !important;
}

/* ── Seções ─────────────────────────────────────────────────────────────────── */
.ar-section {
  padding: 1rem 0;
}

.ar-section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  margin: 0 0 0.75rem;
}

/* ── Taxa ───────────────────────────────────────────────────────────────────── */
.ar-taxa-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.ar-taxa-label {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

/* ── Linhas de simulação ────────────────────────────────────────────────────── */
.ar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.ar-row--sep {
  margin-top: 0.375rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--p-surface-border);
}

.ar-row--destaque {
  padding: 0.5rem 0;
}

.ar-row-label--muted {
  color: var(--p-text-muted-color);
}

.ar-val            { font-weight: 500; white-space: nowrap; }
.ar-val--cost      { color: var(--p-red-500, #ef4444); }
.ar-val--green     { color: var(--p-green-600, #16a34a); }
.ar-val--warn      { color: var(--p-orange-500, #f97316); }
.ar-val--bold      { font-weight: 700; }
.ar-val--lg        { font-size: 1.0625rem; }

/* ── Saldo boxes ────────────────────────────────────────────────────────────── */
.ar-saldo-boxes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
}

.ar-saldo-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.625rem 0.5rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 0.5rem;
  background: var(--p-surface-50, rgba(0,0,0,.02));
}

.ar-saldo-box--after {
  border-color: var(--p-green-300, #86efac);
  background: rgba(22,163,74,.04);
}

.ar-saldo-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.ar-saldo-val {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.ar-saldo-val--green { color: var(--p-green-600, #16a34a); }

.ar-saldo-arrow {
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
  flex-shrink: 0;
}

/* ── O que vai acontecer ────────────────────────────────────────────────────── */
.ar-what-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ar-what-list li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--p-text-color);
}

.ar-what-list .pi { flex-shrink: 0; }
.ar-icon-in   { color: var(--p-green-500, #22c55e); }
.ar-icon-out  { color: var(--p-red-500, #ef4444); }
.ar-icon-bolt { color: var(--p-primary-color); }

/* ── Comparativo ────────────────────────────────────────────────────────────── */
.ar-comp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0;
  font-size: 0.875rem;
}

.ar-comp-row + .ar-comp-row {
  border-top: 1px solid var(--p-surface-border);
}

.ar-comp-label { color: var(--p-text-muted-color); }

.ar-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.ar-chip .pi { font-size: 0.7rem; }
.ar-chip--ok   { background: rgba(22,163,74,.1);  color: var(--p-green-700, #15803d); }
.ar-chip--risk { background: rgba(239,68,68,.1);  color: var(--p-red-700,   #b91c1c); }
.ar-chip--warn { background: rgba(59,130,246,.1); color: var(--p-blue-700,  #1d4ed8); }

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.ar-footer {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}
</style>
