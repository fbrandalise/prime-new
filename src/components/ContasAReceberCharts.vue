<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Chart from 'primevue/chart'
import SelectButton from 'primevue/selectbutton'

const props = defineProps({
  contas:        { type: Array,   default: () => [] },
  valuesVisible: { type: Boolean, default: true     },
})

// ── Dark mode ─────────────────────────────────────────────────────────────────
const isDarkMode = ref(document.documentElement.classList.contains('dark-mode'))
let _observer = null
onMounted(() => {
  _observer = new MutationObserver(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark-mode')
  })
  _observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => _observer?.disconnect())

// ── Mode toggle ───────────────────────────────────────────────────────────────
const chartMode    = ref('evolucao')
const chartOptions = [
  { label: 'Evolução',   value: 'evolucao'  },
  { label: 'Situação',   value: 'situacao'  },
  { label: 'Clientes',   value: 'clientes'  },
]

// ── Shared theme tokens ────────────────────────────────────────────────────────
const theme = computed(() => {
  const dark = isDarkMode.value
  return {
    text:    dark ? '#e2e8f0' : '#1e293b',
    muted:   dark ? '#94a3b8' : '#64748b',
    grid:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltip: { bg: dark ? '#1e293b' : '#ffffff', border: dark ? '#334155' : '#e2e8f0' },
    green:   dark ? 'rgba(0,143,66,0.88)' : 'rgba(0,143,66,0.88)',
    blue:    dark ? 'rgba(147,197,253,0.85)' : 'rgba(59,130,246,0.85)',
    red:     dark ? 'rgba(252,165,165,0.85)' : 'rgba(239,68,68,0.85)',
    teal:    dark ? 'rgba(0,104,48,0.88)' : 'rgba(0,104,48,0.88)',
  }
})

const fmtR$ = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const tooltipDefaults = computed(() => ({
  backgroundColor: theme.value.tooltip.bg,
  borderColor:     theme.value.tooltip.border,
  borderWidth:     1,
  titleColor:      theme.value.text,
  bodyColor:       theme.value.muted,
  padding:         10,
}))

// ── 1. Evolução mensal (stacked bar) ──────────────────────────────────────────
const monthlyMap = computed(() => {
  const map = new Map()
  props.contas.forEach(c => {
    const iso = c._vencimentoRaw
    if (!iso) return
    const ym    = iso.substring(0, 7)
    const [y, m] = ym.split('-')
    const label  = `${m}/${y.slice(2)}`
    if (!map.has(ym)) map.set(ym, { label, recebido: 0, aReceber: 0, atrasada: 0 })
    const v   = (c._valorCentavos ?? 0) / 100
    const s   = c.situacao
    const row = map.get(ym)
    if      (s === 'Recebida' || s === 'Recebida parcialmente') row.recebido += v
    else if (s === 'Atrasada')                                   row.atrasada += v
    else                                                         row.aReceber += v
  })
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([, v]) => v)
})

const evolucaoData = computed(() => {
  const months = monthlyMap.value
  const t = theme.value
  return {
    labels:   months.map(m => m.label),
    datasets: [
      { label: 'Recebido',  data: months.map(m => Math.round(m.recebido * 100) / 100),  backgroundColor: t.green,  borderRadius: 4, stack: 'a' },
      { label: 'A receber', data: months.map(m => Math.round(m.aReceber * 100) / 100),  backgroundColor: t.blue,   borderRadius: 4, stack: 'a' },
      { label: 'Atrasado',  data: months.map(m => Math.round(m.atrasada * 100) / 100),  backgroundColor: t.red,    borderRadius: 4, stack: 'a' },
    ],
  }
})

const evolucaoOptions = computed(() => {
  const t = theme.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend:  { position: 'bottom', labels: { color: t.text, boxWidth: 10, padding: 14, font: { size: 11 } } },
      tooltip: { ...tooltipDefaults.value, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtR$(ctx.raw)}` } },
    },
    scales: {
      x: { stacked: true, ticks: { color: t.muted, font: { size: 11 } }, grid: { display: false } },
      y: { stacked: true, ticks: { color: t.muted, font: { size: 11 }, callback: v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v }, grid: { color: t.grid } },
    },
  }
})

// ── 2. Distribuição por situação (donut) ──────────────────────────────────────
const situacaoData = computed(() => {
  const counts = { 'A receber': 0, 'Atrasada': 0, 'Recebida': 0, 'Recebida parcialmente': 0 }
  props.contas.forEach(c => {
    if (c.situacao in counts) counts[c.situacao] += (c._valorCentavos ?? 0) / 100
  })
  const t = theme.value
  return {
    labels:   Object.keys(counts),
    datasets: [{
      data:            Object.values(counts).map(v => Math.round(v * 100) / 100),
      backgroundColor: [t.blue, t.red, t.green, t.teal],
      borderWidth:     0,
      hoverOffset:     8,
    }],
  }
})

const situacaoOptions = computed(() => {
  const t = theme.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend:  { position: 'bottom', labels: { color: t.text, boxWidth: 10, padding: 12, font: { size: 11 } } },
      tooltip: { ...tooltipDefaults.value, callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtR$(ctx.raw)}` } },
    },
  }
})

// ── 3. Top clientes (horizontal bar) ─────────────────────────────────────────
const clientesMap = computed(() => {
  const map = {}
  props.contas.forEach(c => {
    if (!map[c.cliente]) map[c.cliente] = { total: 0, atrasado: 0 }
    map[c.cliente].total    += (c._valorCentavos ?? 0) / 100
    if (c.situacao === 'Atrasada') map[c.cliente].atrasado += (c._valorCentavos ?? 0) / 100
  })
  return Object.entries(map).sort(([, a], [, b]) => b.total - a.total).slice(0, 8)
})

const clientesData = computed(() => {
  const rows = clientesMap.value
  const t    = theme.value
  return {
    labels:   rows.map(([name]) => name.length > 22 ? name.slice(0, 20) + '…' : name),
    datasets: [
      { label: 'Total',    data: rows.map(([, v]) => Math.round(v.total    * 100) / 100), backgroundColor: t.blue, borderRadius: 3 },
      { label: 'Atrasado', data: rows.map(([, v]) => Math.round(v.atrasado * 100) / 100), backgroundColor: t.red,  borderRadius: 3 },
    ],
  }
})

const clientesOptions = computed(() => {
  const t = theme.value
  return {
    indexAxis:  'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend:  { position: 'bottom', labels: { color: t.text, boxWidth: 10, padding: 12, font: { size: 11 } } },
      tooltip: { ...tooltipDefaults.value, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtR$(ctx.raw)}` } },
    },
    scales: {
      x: { ticks: { color: t.muted, font: { size: 11 }, callback: v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v }, grid: { color: t.grid } },
      y: { ticks: { color: t.text,  font: { size: 11 } }, grid: { display: false } },
    },
  }
})

const hasData = computed(() => props.contas.length > 0)
</script>

<template>
  <div class="crc-wrap">

    <!-- Tab selector -->
    <div class="crc-header">
      <SelectButton
        v-model="chartMode"
        :options="chartOptions"
        option-label="label"
        option-value="value"
        size="small"
        class="crc-tabs"
      />
    </div>

    <!-- No data -->
    <div v-if="!hasData" class="crc-empty">
      <i class="pi pi-chart-bar crc-empty-icon" />
      <span>Sem dados para exibir no período filtrado.</span>
    </div>

    <template v-else>
      <!-- Evolução mensal -->
      <div v-if="chartMode === 'evolucao'" class="crc-chart-area">
        <div v-if="monthlyMap.length === 0" class="crc-empty">Nenhuma movimentação mensal identificada.</div>
        <Chart v-else type="bar" :data="evolucaoData" :options="evolucaoOptions" class="crc-chart" />
      </div>

      <!-- Distribuição -->
      <div v-else-if="chartMode === 'situacao'" class="crc-chart-area crc-chart-area--donut">
        <Chart type="doughnut" :data="situacaoData" :options="situacaoOptions" class="crc-chart" />
      </div>

      <!-- Top clientes -->
      <div v-else-if="chartMode === 'clientes'" class="crc-chart-area crc-chart-area--clients">
        <div v-if="clientesMap.length === 0" class="crc-empty">Sem dados de clientes.</div>
        <Chart
          v-else
          type="bar"
          :data="clientesData"
          :options="clientesOptions"
          :style="{ height: Math.max(220, clientesMap.length * 36) + 'px' }"
          class="crc-chart"
        />
      </div>
    </template>

  </div>
</template>

<style scoped>
.crc-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  background: var(--p-surface-card);
}

.crc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.crc-tabs :deep(.p-togglebutton) {
  font-size: 0.8125rem;
  padding: 0.3rem 0.875rem;
}

.crc-chart-area {
  position: relative;
  height: 240px;
}

.crc-chart-area--donut {
  height: 280px;
  max-width: 420px;
  margin: 0 auto;
}

.crc-chart-area--clients {
  height: auto;
  overflow: hidden;
}

.crc-chart {
  width: 100% !important;
  height: 100% !important;
}

.crc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 2.5rem 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  text-align: center;
}

.crc-empty-icon {
  font-size: 2rem;
  opacity: 0.35;
}
</style>
