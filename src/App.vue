<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import StyleGuide from './components/StyleGuide.vue'
import ContasAReceberView from './views/ContasAReceberView.vue'
import ContasAPagarView from './views/ContasAPagarView.vue'
import AgendaFinanceiraView from './views/AgendaFinanceiraView.vue'
import ContasFinanceirasView from './views/ContasFinanceirasView.vue'
import CarteirasMarketplaceView from './views/CarteirasMarketplaceView.vue'
import CarteiraPosView from './views/CarteiraPosView.vue'
import ConciliacaoBancariaView from './views/ConciliacaoBancariaView.vue'
import RelatoriosView from './views/RelatoriosView.vue'
import PedidosDeVendaView from './views/PedidosDeVendaView.vue'
import AIChatSidebar from './components/AIChatSidebar.vue'
import AppSettingsPanel from './components/AppSettingsPanel.vue'
import { useAppSettings } from '@/composables/useAppSettings'

const currentView = ref('contas')
const meuNegocio  = ref(false)
const cadastros   = ref(false)
const vendas      = ref(false)
const estoque     = ref(false)
const financeiro  = ref(false)
const collapsed   = ref(false)
const chatOpen    = ref(false)
const settingsPanel = ref(null)

const { colorScheme } = useAppSettings()

// Esquemas neon (sidebar #00F070) exigem logo escuro; demais usam logo verde claro
const neonSchemes = new Set(['neon', 'neon-bege', 'neon-menta'])
const logoSrc = computed(() =>
  neonSchemes.has(colorScheme.value)
    ? '/logos/bling_logo_verde_escuro_141A03.png'
    : '/logos/bling_logo_verde_bling_0AF071.png'
)

const toggleChat = () => {
  chatOpen.value = !chatOpen.value
  document.documentElement.style.setProperty('--app-chat-w', chatOpen.value ? '24rem' : '0px')
}

const navigate = (view) => { currentView.value = view }

const toggleSidebar = () => {
  collapsed.value = !collapsed.value
  document.documentElement.style.setProperty('--app-sidebar-w', collapsed.value ? '3.5rem' : '15rem')
  if (collapsed.value) {
    meuNegocio.value = false
    cadastros.value  = false
    vendas.value     = false
    estoque.value    = false
    financeiro.value = false
  }
}
</script>

<template>
  <Toast />

  <div class="app-container">

    <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
    <aside class="app-sidebar" :class="{ 'is-collapsed': collapsed }">

      <div class="app-brand">
        <span v-if="!collapsed" class="app-brand-logo" aria-label="bling">
          <img
            :src="logoSrc"
            alt="bling"
            class="app-brand-wordmark"
            draggable="false"
          />
        </span>
        <Button
          :icon="collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
          variant="text"
          size="small"
          rounded
          class="app-brand-toggle"
          :aria-label="collapsed ? 'Expandir menu' : 'Recolher menu'"
          @click="toggleSidebar"
        />
      </div>

      <nav class="app-nav">
        <ul class="app-nav-list">

          <!-- ── Meu Negócio ─────────────────────────────────────────────────── -->
          <li>
            <a
              class="app-nav-item"
              :class="{ 'is-open': meuNegocio && !collapsed }"
              @click="collapsed ? toggleSidebar() : (meuNegocio = !meuNegocio)"
            >
              <i class="pi pi-chart-line" />
              <span>Meu Negócio</span>
              <i class="app-nav-chevron" :class="meuNegocio ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </a>
            <Transition name="layout-submenu">
              <ul v-show="meuNegocio && !collapsed" class="app-nav-sub">
                <li class="app-nav-group-label">Dashboards</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-chart-bar" /><span>Dashboard geral</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-chart-bar" /><span>Dashboard vendas</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-chart-bar" /><span>Dashboard produtos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-chart-bar" /><span>Dashboard clientes</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-sliders-h" /><span>Curva ABC</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-flag" /><span>Metas</span></a></li>
              </ul>
            </Transition>
          </li>

          <!-- ── Cadastros ────────────────────────────────────────────────────── -->
          <li>
            <a
              class="app-nav-item"
              :class="{ 'is-open': cadastros && !collapsed }"
              @click="collapsed ? toggleSidebar() : (cadastros = !cadastros)"
            >
              <i class="pi pi-database" />
              <span>Cadastros</span>
              <i class="app-nav-chevron" :class="cadastros ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </a>
            <Transition name="layout-submenu">
              <ul v-show="cadastros && !collapsed" class="app-nav-sub">
                <li class="app-nav-group-label">Cadastros</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-tag" /><span>Produtos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-users" /><span>Clientes e fornecedores</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-user" /><span>Vendedores</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-id-card" /><span>Funcionários</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-building-columns" /><span>Contas Financeiras</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-list" /><span>Categorias Financeiras</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-credit-card" /><span>Formas de pagamento</span></a></li>
                <li class="app-nav-group-label">Ferramentas</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-folder" /><span>Categorias de produtos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-list" /><span>Listas de preços</span></a></li>
              </ul>
            </Transition>
          </li>

          <!-- ── Vendas ──────────────────────────────────────────────────────── -->
          <li>
            <a
              class="app-nav-item"
              :class="{ 'is-open': vendas && !collapsed }"
              @click="collapsed ? toggleSidebar() : (vendas = !vendas)"
            >
              <i class="pi pi-shopping-cart" />
              <span>Vendas</span>
              <i class="app-nav-chevron" :class="vendas ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </a>
            <Transition name="layout-submenu">
              <ul v-show="vendas && !collapsed" class="app-nav-sub">
                <li class="app-nav-group-label">Gestão</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-megaphone" /><span>Gestão de anúncios</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-globe" /><span>Loja Virtual</span></a></li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'pedidos' }"
                    @click="navigate('pedidos')"
                  ><i class="pi pi-file" /><span>Pedidos de venda</span></a>
                </li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file-export" /><span>Notas fiscais de saída</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-receipt" /><span>NFC-e</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-desktop" /><span>Frente de caixa</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-download" /><span>Importar pedidos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-briefcase" /><span>Propostas comerciais</span></a></li>
                <li class="app-nav-group-label">Logística</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-truck" /><span>Objetos de postagem</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-replay" /><span>Logística reversa</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-shopping-bag" /><span>Checkout de pedidos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-print" /><span>Impressão de etiquetas</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-send" /><span>Envios Melhor Envio</span></a></li>
                <li class="app-nav-group-label">Serviços</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file-edit" /><span>Contratos</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-wrench" /><span>Ordens de serviço</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-truck" /><span>CT-e</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file" /><span>Notas de serviço</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-dollar" /><span>Cobranças</span></a></li>
              </ul>
            </Transition>
          </li>

          <!-- ── Estoque ─────────────────────────────────────────────────────── -->
          <li>
            <a
              class="app-nav-item"
              :class="{ 'is-open': estoque && !collapsed }"
              @click="collapsed ? toggleSidebar() : (estoque = !estoque)"
            >
              <i class="pi pi-box" />
              <span>Estoque</span>
              <i class="app-nav-chevron" :class="estoque ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </a>
            <Transition name="layout-submenu">
              <ul v-show="estoque && !collapsed" class="app-nav-sub">
                <li class="app-nav-group-label">Compras</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file-import" /><span>Pedidos de compra</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file-import" /><span>Notas fiscais de entrada</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-users" /><span>Fornecedores</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-chart-line" /><span>Sugestão de Compras</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-check-circle" /><span>Check-in de Recebimentos</span></a></li>
                <li class="app-nav-group-label">Estoque</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-box" /><span>Lançamentos de estoque</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-search" /><span>Conferência de estoque</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-cog" /><span>Ordens de produção</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-building" /><span>Depósitos</span></a></li>
              </ul>
            </Transition>
          </li>

          <!-- ── Financeiro ──────────────────────────────────────────────────── -->
          <li>
            <a
              class="app-nav-item"
              :class="{ 'is-open': financeiro && !collapsed }"
              @click="collapsed ? toggleSidebar() : (financeiro = !financeiro)"
            >
              <i class="pi pi-wallet" />
              <span>Financeiro</span>
              <i class="app-nav-chevron" :class="financeiro ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </a>
            <Transition name="layout-submenu">
              <ul v-show="financeiro && !collapsed" class="app-nav-sub">

                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'agenda' }"
                    @click="navigate('agenda')"
                  >
                    <i class="pi pi-calendar" />
                    <span>Meu Financeiro</span>
                  </a>
                </li>

                <li class="app-nav-group-label">Gestão financeira</li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'contas-financeiras' }"
                    @click="navigate('contas-financeiras')"
                  >
                    <i class="pi pi-building-columns" />
                    <span>Caixas e bancos</span>
                  </a>
                </li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'contas' }"
                    @click="navigate('contas')"
                  >
                    <i class="pi pi-arrow-circle-down" />
                    <span>Contas a receber</span>
                  </a>
                </li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'contas-pagar' }"
                    @click="navigate('contas-pagar')"
                  >
                    <i class="pi pi-arrow-circle-up" />
                    <span>Contas a pagar</span>
                  </a>
                </li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-arrows-h" /><span>Remessas e retornos</span></a></li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'conciliacao' }"
                    @click="navigate('conciliacao')"
                  >
                    <i class="pi pi-arrows-h" />
                    <span>Ficha Financeira</span>
                  </a>
                </li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-percentage" /><span>Comissões</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-desktop" /><span>Controle de caixa</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file" /><span>Faturamento agrupado</span></a></li>

                <li class="app-nav-group-label">Marketplaces</li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'carteiras-marketplace' }"
                    @click="navigate('carteiras-marketplace')"
                  >
                    <i class="pi pi-shopping-bag" />
                    <span>Carteiras de marketplace</span>
                  </a>
                </li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'carteiras-pos' }"
                    @click="navigate('carteiras-pos')"
                  >
                    <i class="pi pi-credit-card" />
                    <span>Carteiras de POS</span>
                  </a>
                </li>

                <li class="app-nav-group-label">Tributos e contabilidade</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file" /><span>DAS MEI</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-file" /><span>GNRE e DARE-SP</span></a></li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-user" /><span>Espaço meu contador</span></a></li>

                <li class="app-nav-group-label">Soluções financeiras</li>
                <li><a class="app-nav-item app-nav-item--child app-nav-item--disabled"><i class="pi pi-star" /><span>Bling Conta</span></a></li>

                <li class="app-nav-group-label">Análise</li>
                <li>
                  <a
                    class="app-nav-item app-nav-item--child"
                    :class="{ 'is-selected': currentView === 'relatorios' }"
                    @click="navigate('relatorios')"
                  >
                    <i class="pi pi-chart-bar" />
                    <span>DRE</span>
                  </a>
                </li>

              </ul>
            </Transition>
          </li>

          <!-- ── Assistente Bling ───────────────────────────────────────────── -->
          <li>
            <a
              href="#"
              class="app-nav-item app-nav-assistente"
              :class="{ 'is-selected': chatOpen }"
              @click.prevent="toggleChat"
            >
              <i class="pi pi-sparkles" />
              <span>Assistente Bling</span>
            </a>
          </li>

        </ul>
      </nav>

      <div class="app-sidebar-footer">
        <Button
          label="Style Guide"
          icon="pi pi-palette"
          variant="text"
          size="small"
          class="app-footer-styleguide"
          @click="currentView = 'styleguide'"
        />
        <Button
          icon="pi pi-cog"
          rounded
          variant="text"
          aria-label="Configurações de interface"
          class="app-footer-settings"
          @click="settingsPanel?.toggle($event)"
        />
      </div>

      <!-- Painel de configurações -->
      <AppSettingsPanel ref="settingsPanel" />

    </aside>

    <!-- ── Conteúdo ────────────────────────────────────────────────────────── -->
    <main class="app-content">
      <StyleGuide v-if="currentView === 'styleguide'" />
      <ContasAPagarView v-else-if="currentView === 'contas-pagar'" />
      <AgendaFinanceiraView v-else-if="currentView === 'agenda'" />
      <ContasFinanceirasView v-else-if="currentView === 'contas-financeiras'" />
      <CarteirasMarketplaceView v-else-if="currentView === 'carteiras-marketplace'" />
      <CarteiraPosView v-else-if="currentView === 'carteiras-pos'" />
      <ConciliacaoBancariaView v-else-if="currentView === 'conciliacao'" />
      <RelatoriosView v-else-if="currentView === 'relatorios'" @navigate="navigate" />
      <PedidosDeVendaView v-else-if="currentView === 'pedidos'" />
      <ContasAReceberView v-else />
    </main>

    <!-- AI Chat -->
    <AIChatSidebar
      :visible="chatOpen"
      :current-view="currentView"
      @close="toggleChat"
    />

  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
  background: var(--p-surface-ground);
}

/* ── Sidebar ────────────────────────────────────────────────────────────────── */
.app-sidebar {
  width: 15rem;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bling-dark-green);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
  transition: width 0.2s ease;
  z-index: 100;
  font-size: 13px; /* não escala com data-font-size — configuração de fonte afeta só o conteúdo */
}

.app-sidebar.is-collapsed {
  width: 3.5rem;
}

/* ── Brand ──────────────────────────────────────────────────────────────────── */
.app-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1rem 0.875rem;
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
  white-space: nowrap;
}

.app-brand-logo {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.app-brand-wordmark {
  height: 2rem;
  width: auto;
  display: block;
  object-fit: contain;
  object-position: left center;
}

/* No estado colapsado mostra só a letra "b" do logo — crop lateral */
.app-brand-monogram-img {
  height: 1.75rem;
  width: 1.75rem;
  display: block;
  object-fit: cover;
  object-position: left center;
}

.app-brand-toggle {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--sidebar-text-muted) !important;
}

.app-brand-toggle:hover {
  color: var(--sidebar-text) !important;
  background: var(--sidebar-hover-bg) !important;
}

.app-sidebar.is-collapsed .app-brand {
  padding: 0.875rem 0.5rem;
  justify-content: center;
  gap: 0;
}


.app-sidebar.is-collapsed .app-brand-toggle {
  margin-left: 0;
}

/* ── Navegação ─────────────────────────────────────────────────────────────── */
.app-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--sidebar-border) transparent;
}

.app-nav-list,
.app-nav-sub {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--p-border-radius-md);
  cursor: pointer;
  color: var(--sidebar-text);
  font-size: 0.8125rem;
  font-weight: 400;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  user-select: none;
}

.app-nav-item i {
  font-size: 0.875rem;
  opacity: 0.8;
}

.app-nav-item:hover:not(.app-nav-item--disabled) {
  background: var(--sidebar-hover-bg);
  color: #fff;
}

.app-nav-item:hover:not(.app-nav-item--disabled) i {
  opacity: 1;
}

.app-nav-item.is-selected {
  background: var(--sidebar-selected-bg);
  color: var(--bling-green);
  font-weight: 600;
}

.app-nav-item.is-selected i {
  opacity: 1;
  color: var(--bling-green);
}

.app-nav-item.is-selected:hover {
  background: var(--app-nav-selected-hover-bg);
}

.app-nav-item--disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.app-nav-item--child {
  padding-left: calc(0.75rem + 1.5rem);
}

.app-nav-chevron {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--sidebar-text-muted);
  transition: color 0.15s;
}

.app-nav-separator {
  height: 1px;
  background: var(--sidebar-border);
  margin: 2px 0.5rem;
}

.app-nav-group-label {
  padding: 0.75rem 0.75rem 0.125rem calc(0.75rem + 1.5rem);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sidebar-text-muted);
  user-select: none;
}

/* Estado recolhido — itens com apenas ícone */
.app-sidebar.is-collapsed .app-nav-item {
  justify-content: center;
  padding: 0.5rem;
}

.app-sidebar.is-collapsed .app-nav-item span,
.app-sidebar.is-collapsed .app-nav-chevron {
  display: none;
}

/* ── Submenu: animação estilo Avalon/Sakai ──────────────────────────────────── */
.layout-submenu-enter-from,
.layout-submenu-leave-to {
  max-height: 0;
  opacity: 0;
}

.layout-submenu-enter-active {
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.15s ease;
}

.layout-submenu-leave-active {
  overflow: hidden;
  transition: max-height 0.15s ease, opacity 0.1s ease;
}

.layout-submenu-enter-to,
.layout-submenu-leave-from {
  max-height: 60rem;
  opacity: 1;
}

/* ── Footer ────────────────────────────────────────────────────────────────── */
.app-sidebar-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
  white-space: nowrap;
}

.app-sidebar-footer :deep(.p-button) {
  color: var(--sidebar-text-muted) !important;
}

.app-sidebar-footer :deep(.p-button:hover) {
  color: var(--sidebar-text) !important;
  background: var(--sidebar-hover-bg) !important;
}

.app-sidebar.is-collapsed .app-footer-settings {
  display: flex;
}

.app-sidebar.is-collapsed .app-sidebar-footer {
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.app-sidebar.is-collapsed .app-sidebar-footer {
  justify-content: center;
  padding: 0.75rem 0.5rem;
}

.app-sidebar.is-collapsed .app-footer-styleguide {
  display: none;
}

/* ── Área de conteúdo ───────────────────────────────────────────────────────── */
.app-content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  margin-right: var(--app-chat-w, 0px);
  transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-nav-assistente {
  position: relative;
}

</style>
