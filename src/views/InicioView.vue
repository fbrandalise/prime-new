<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Toolbar from 'primevue/toolbar'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const searchValue = ref('')

// ── Dados ─────────────────────────────────────────────────────────────────────
const produtos = ref([
  { id: 1, nome: 'Notebook Dell',    categoria: 'Eletrônicos', preco: 3499.90, status: 'Em Estoque' },
  { id: 2, nome: 'Mouse Logitech',   categoria: 'Periféricos', preco: 149.90,  status: 'Em Estoque' },
  { id: 3, nome: 'Teclado Mecânico', categoria: 'Periféricos', preco: 299.90,  status: 'Baixo Estoque' },
  { id: 4, nome: 'Monitor 27"',      categoria: 'Eletrônicos', preco: 1899.90, status: 'Sem Estoque' },
  { id: 5, nome: 'Headset Gamer',    categoria: 'Áudio',       preco: 399.90,  status: 'Em Estoque' },
])

const statusSeverity = (status) => ({
  'Em Estoque':    'success',
  'Baixo Estoque': 'warn',
  'Sem Estoque':   'danger',
}[status] ?? 'info')

const showToast = () =>
  toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Ação realizada com sucesso!', life: 3000 })

const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
</script>

<template>
  <div class="page">

    <!-- ── Cabeçalho ───────────────────────────────────────────────────── -->
    <div class="page-header">
      <div class="page-header-inner">
        <span class="page-title">Início</span>
      </div>
    </div>

    <!-- ── Barra de filtros ─────────────────────────────────────────────── -->
    <Toolbar class="page-toolbar">
      <template #start>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchValue"
            placeholder="Pesquisar produto..."
            class="page-search"
          />
        </IconField>
      </template>
      <template #end>
        <Button label="Novo Produto" icon="pi pi-plus" size="small" @click="showToast" />
      </template>
    </Toolbar>

    <!-- ── Área de conteúdo ─────────────────────────────────────────────── -->
    <div class="page-content">

      <!-- Cards de resumo -->
      <div class="stat-grid">
        <Card>
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <span class="stat-label">Total de Produtos</span>
                <span class="stat-value">{{ produtos.length }}</span>
              </div>
              <div class="stat-icon stat-icon--blue"><i class="pi pi-box" /></div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <span class="stat-label">Em Estoque</span>
                <span class="stat-value">{{ produtos.filter(p => p.status === 'Em Estoque').length }}</span>
              </div>
              <div class="stat-icon stat-icon--green"><i class="pi pi-check-circle" /></div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <span class="stat-label">Valor Total</span>
                <span class="stat-value stat-value--sm">
                  {{ formatCurrency(produtos.reduce((acc, p) => acc + p.preco, 0)) }}
                </span>
              </div>
              <div class="stat-icon stat-icon--violet"><i class="pi pi-wallet" /></div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <span class="stat-label">Sem Estoque</span>
                <span class="stat-value">{{ produtos.filter(p => p.status === 'Sem Estoque').length }}</span>
              </div>
              <div class="stat-icon stat-icon--red"><i class="pi pi-exclamation-circle" /></div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Tabela de produtos -->
      <Card>
        <template #content>
          <DataTable
            :value="produtos.filter(p => p.nome.toLowerCase().includes(searchValue.toLowerCase()))"
            stripedRows
            size="small"
          >
            <Column field="id" header="#" style="width: 3rem" />
            <Column field="nome" header="Produto" />
            <Column field="categoria" header="Categoria" />
            <Column field="preco" header="Preço">
              <template #body="{ data }">{{ formatCurrency(data.preco) }}</template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column header="Ações" style="width: 7.5rem">
              <template #body>
                <div class="action-buttons">
                  <Button icon="pi pi-pencil" variant="text" rounded size="small" @click="showToast" />
                  <Button icon="pi pi-trash" variant="text" rounded size="small" severity="danger" @click="showToast" />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

    </div>
  </div>
</template>

<style scoped>
/* ── Anatomia de página ─────────────────────────────────────────────────── */
.page {
  background: var(--p-surface-ground);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-header {
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  padding: 0 1.5rem;
}

.page-header-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.page-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.page-toolbar {
  border-radius: 0;
  border-left: none;
  border-right: none;
  padding: 0.625rem 1.5rem;
}

.page-search {
  width: 15rem;
}

.page-content {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Grid de cards ──────────────────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media screen and (max-width: 1024px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}

@media screen and (max-width: 575px) {
  .stat-grid { grid-template-columns: 1fr; }
}

/* ── Cards de resumo ────────────────────────────────────────────────────── */
.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.stat-value--sm {
  font-size: 1.125rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--p-border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.stat-icon--blue   { background: var(--p-blue-100);   color: var(--p-blue-600); }
.stat-icon--green  { background: var(--p-green-100);  color: var(--p-green-600); }
.stat-icon--violet { background: var(--p-violet-100); color: var(--p-violet-600); }
.stat-icon--red    { background: var(--p-red-100);    color: var(--p-red-600); }

/* ── Tabela ─────────────────────────────────────────────────────────────── */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}
</style>
