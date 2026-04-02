import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useCarTour({ onStart } = {}) {

  // ── Sistema unificado de motions ───────────────────────────────────────────
  // clearTimeout e clearInterval compartilham namespace de IDs no browser.
  let _mids           = []
  let _searchOriginal = undefined
  let _pendingClose   = null  // callback para fechar dropdown/panel aberto pela simulação

  function _t(fn, ms)  { const id = setTimeout(fn, ms);  _mids.push(id); return id }
  function _iv(fn, ms) { const id = setInterval(fn, ms); _mids.push(id); return id }

  const TOUR_CLASSES = ['tour-pulse', 'tour-bounce', 'tour-shake', 'tour-focus', 'tour-row-hl', 'tour-typing']

  function clearMotions() {
    _mids.forEach(clearTimeout)
    _mids = []

    // Fecha dropdown/panel que foi aberto pela simulação
    if (_pendingClose) {
      _pendingClose()
      _pendingClose = null
    }

    // Remove todas as classes de motion
    TOUR_CLASSES.forEach(cls => {
      document.querySelectorAll(`.${cls}`).forEach(el => el.classList.remove(cls))
    })

    // Remove ripples injetados
    document.querySelectorAll('.tour-ripple').forEach(el => el.remove())

    // Restaura campo de busca
    const input = document.querySelector('.car-search input')
    if (input && _searchOriginal !== undefined) {
      input.value = _searchOriginal
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.style.caretColor = ''
      _searchOriginal = undefined
    }
  }

  // ── Motions individuais ────────────────────────────────────────────────────

  // Glow ring pulsante
  function motionPulse(sel) {
    document.querySelector(sel)?.classList.add('tour-pulse')
  }

  // Bob vertical suave
  function motionBounce(sel) {
    document.querySelector(sel)?.classList.add('tour-bounce')
  }

  // Shake periódico
  function motionShake(sel) {
    const el = document.querySelector(sel)
    if (!el) return
    const shake = () => {
      el.classList.remove('tour-shake')
      void el.offsetWidth // força reflow para reiniciar a animação
      el.classList.add('tour-shake')
    }
    shake()
    _iv(shake, 2000)
  }

  // Cicla tour-focus entre filhos correspondentes ao seletor
  function motionCycle(parentSel, childSel, ms = 850) {
    const children = [...document.querySelectorAll(`${parentSel} ${childSel}`)]
    if (!children.length) return
    let i = 0
    const tick = () => {
      children.forEach(c => c.classList.remove('tour-focus'))
      children[i % children.length].classList.add('tour-focus')
      i++
    }
    tick()
    _iv(tick, ms)
  }

  // Scan de linhas da tabela
  function motionScanRows() {
    const rows = [...document.querySelectorAll('.p-datatable .p-datatable-tbody tr')]
    if (!rows.length) return
    let i = 0
    const tick = () => {
      rows.forEach(r => r.classList.remove('tour-row-hl'))
      rows[i % rows.length].classList.add('tour-row-hl')
      i++
    }
    tick()
    _iv(tick, 270)
  }

  // Anima checkbox do cabeçalho: check → uncheck em loop
  function motionCheckbox() {
    const cb = document.querySelector('.p-datatable .p-datatable-thead .p-checkbox')
    if (!cb) {
      // fallback: pulsa o thead inteiro
      motionPulse('.p-datatable .p-datatable-thead')
      return
    }
    let checked = false
    const tick = () => {
      checked = !checked
      cb.classList.toggle('tour-focus', checked)
    }
    _t(tick, 500)
    _iv(tick, 1000)
  }

  // Clique simulado num botão que abre dropdown/panel — fecha via Escape no clearMotions
  function motionClickAndShow(sel) {
    const btn = document.querySelector(sel)
    if (!btn) return
    motionPulse(sel)
    _t(() => {
      btn.click()
      // Registra o fechamento: pressiona Escape (fecha Menus, Popovers e Dialogs do PrimeVue)
      _pendingClose = () => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape', code: 'Escape', bubbles: true, cancelable: true,
        }))
      }
    }, 700)
  }

  // Stagger pulse nos cards de overview
  function motionStaggerCards() {
    const cards = [...document.querySelectorAll('.car-overview-panel > *')]
    if (!cards.length) { motionPulse('.car-overview-panel'); return }
    const cycle = () => {
      cards.forEach(c => c.classList.remove('tour-pulse'))
      cards.forEach((c, i) => _t(() => c.classList.add('tour-pulse'), i * 200))
    }
    cycle()
    _iv(cycle, cards.length * 200 + 1600)
  }

  // Typewriter na busca
  function motionSearch(query) {
    const input = document.querySelector('.car-search input')
    if (!input) return
    if (_searchOriginal === undefined) _searchOriginal = input.value
    input.value = ''
    input.style.caretColor = 'var(--p-primary-color, #6366f1)'
    input.closest('.car-search')?.classList.add('tour-typing')

    let i = 0
    const type = () => {
      if (i < query.length) {
        input.value += query[i++]
        input.dispatchEvent(new Event('input', { bubbles: true }))
        _t(type, 80 + Math.random() * 60)
      } else {
        _t(erase, 1400)
      }
    }
    const erase = () => {
      if (input.value.length > 0) {
        input.value = input.value.slice(0, -1)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        _t(erase, 45)
      } else {
        _t(() => motionSearch(query), 800)
      }
    }
    _t(type, 400)
  }

  // Bounce + ripples expansivos no FAB
  function motionChatFab() {
    const fab = document.querySelector('.app-nav-assistente')
    if (!fab) return
    fab.classList.add('tour-bounce')
    const spawnRipple = () => {
      const r = document.createElement('span')
      r.className = 'tour-ripple'
      fab.appendChild(r)
      setTimeout(() => r.remove(), 1500)
    }
    spawnRipple()
    _iv(spawnRipple, 1600)
  }

  // ── Ciclo de breadcrumb: cicla em cada link ────────────────────────────────
  function motionBreadcrumb() {
    motionCycle('.car-breadcrumb', 'li', 900)
  }

  // ── Ciclo no seletor de período ────────────────────────────────────────────
  function motionPeriodSelector() {
    motionCycle('.car-toolbar .p-selectbutton', '.p-togglebutton, button, [role="option"]', 750)
  }

  // ── Ciclo no toggle de visualização ───────────────────────────────────────
  function motionViewToggle() {
    motionCycle('.car-view-toggle', 'button, .p-togglebutton, [role="option"]', 1000)
  }

  // ─────────────────────────────────────────────────────────────────────────

  function start() {
    onStart?.()

    const driverObj = driver({
      showProgress:     true,
      progressText:     '{{current}} de {{total}}',
      nextBtnText:      'Próximo',
      prevBtnText:      'Anterior',
      doneBtnText:      'Concluir',
      allowClose:       true,
      overlayOpacity:   0.55,
      smoothScroll:     true,
      animate:          true,
      popoverClass:     'car-tour-popover',

      steps: [
        // ── 0. Boas-vindas ────────────────────────────────────────────────
        {
          popover: {
            title:       'Bem-vindo ao Contas a receber',
            description: 'Este tour apresenta todas as funcionalidades da tela. Leva menos de 2 minutos e cobre desde filtros e gráficos até IA e atalhos de teclado.',
            side:        'over',
            align:       'center',
          },
        },

        // ── 1. Navegação ──────────────────────────────────────────────────
        {
          element: '.car-breadcrumb',
          popover: {
            title:       'Navegação contextual',
            description: 'O breadcrumb mostra onde você está na hierarquia do sistema: <strong>Financeiro → Contas a receber</strong>. Clique nos itens para navegar entre módulos.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionBreadcrumb() },
          onDeselected()  { clearMotions() },
        },

        // ── 2. Seletor de conta financeira ────────────────────────────────
        {
          element: '.car-conta-chip',
          popover: {
            title:       'Filtro por conta financeira',
            description: 'Filtre as contas por banco, carteira ou caixa. Clique no chip para abrir a lista de contas disponíveis.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionClickAndShow('.car-conta-chip') },
          onDeselected()  { clearMotions() },
        },

        // ── 3. Menu de ações (exportação) ─────────────────────────────────
        {
          element: '.car-actions-btn',
          popover: {
            title:       'Ações e exportação',
            description: 'Acesse ações globais: <strong>exportar CSV, Excel ou PDF</strong> com os dados filtrados, importar registros ou excluir selecionados.',
            side:        'bottom',
            align:       'end',
          },
          onHighlighted() { motionClickAndShow('.car-actions-btn') },
          onDeselected()  { clearMotions() },
        },

        // ── 4. Overview — cards totalizadores ─────────────────────────────
        {
          element: '.car-overview-panel',
          popover: {
            title:       'Resumo financeiro',
            description: 'Cards com os totais do período filtrado: <strong>A receber, Em atraso e Recebido</strong>. Cada card mostra a variação percentual (↑↓) em relação ao período anterior.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionStaggerCards() },
          onDeselected()  { clearMotions() },
        },

        // ── 5. Botão de gráficos ──────────────────────────────────────────
        {
          element: '.car-overview-actions',
          popover: {
            title:       'Gráficos interativos',
            description: 'Clique no ícone de <strong>gráfico de barras</strong> para expandir visualizações: evolução mensal, distribuição por situação e ranking de clientes — todos interativos com Chart.js.',
            side:        'bottom',
            align:       'end',
          },
          onHighlighted() { motionBounce('.car-overview-actions') },
          onDeselected()  { clearMotions() },
        },

        // ── 6. Barra de busca ─────────────────────────────────────────────
        {
          element: '.car-search',
          popover: {
            title:       'Busca rápida',
            description: 'Pesquise por <strong>cliente, vencimento ou valor</strong>. Dica: pressione <kbd style="border:1px solid #ccc;border-radius:3px;padding:0 4px;font-family:monospace">/</kbd> no teclado para focar a busca instantaneamente.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionSearch('Loja Estrela') },
          onDeselected()  { clearMotions() },
        },

        // ── 7. Seletor de período ─────────────────────────────────────────
        {
          element: '.car-toolbar .p-selectbutton',
          popover: {
            title:       'Seletor de período',
            description: 'Alterne entre <strong>Hoje, Semana, Mês, Trimestre e Ano</strong>. Os cards de resumo, gráficos e a tabela filtram automaticamente ao mudar o período.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionPeriodSelector() },
          onDeselected()  { clearMotions() },
        },

        // ── 8. DatePicker de período personalizado ────────────────────────
        {
          element: '.car-date-filter-trigger',
          popover: {
            title:       'Período personalizado',
            description: 'Para intervalos específicos, selecione um <strong>range de datas</strong> no calendário. O período preset é desmarcado automaticamente.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionPulse('.car-date-filter-trigger') },
          onDeselected()  { clearMotions() },
        },

        // ── 9. DataTable ──────────────────────────────────────────────────
        {
          element: '.p-datatable',
          popover: {
            title:       'Tabela de contas',
            description: 'Clique nos cabeçalhos para <strong>ordenar</strong>. Clique em uma célula para <strong>editar inline</strong> (cliente, vencimento, forma de pagamento, situação). Arraste a borda dos cabeçalhos para <strong>redimensionar colunas</strong>.',
            side:        'top',
            align:       'start',
          },
          onHighlighted() { motionScanRows() },
          onDeselected()  { clearMotions() },
        },

        // ── 10. Seleção múltipla e ações em lote ─────────────────────────
        {
          element: '.p-datatable .p-datatable-thead',
          popover: {
            title:       'Seleção e ações em lote',
            description: 'Marque o checkbox do cabeçalho para <strong>selecionar todos</strong>. Com registros selecionados, uma barra de ações aparece: marcar como recebido, antecipar, editar em massa, enviar cobranças e excluir.',
            side:        'bottom',
            align:       'start',
          },
          onHighlighted() { motionCheckbox() },
          onDeselected()  { clearMotions() },
        },

        // ── 11. Toggle de visualização ────────────────────────────────────
        {
          element: '.car-view-toggle',
          popover: {
            title:       'Modo de visualização',
            description: 'Alterne entre <strong>tabela</strong> (padrão) e <strong>cards</strong> — uma visão mais visual por conta, útil em telas menores ou para revisão rápida.',
            side:        'bottom',
            align:       'end',
          },
          onHighlighted() { motionViewToggle() },
          onDeselected()  { clearMotions() },
        },

        // ── 12. Atalhos de teclado ────────────────────────────────────────
        {
          element: '.car-kbd-trigger',
          popover: {
            title:       'Atalhos de teclado',
            description: 'Clique nesta tecla <strong>?</strong> — ou pressione <kbd style="border:1px solid #ccc;border-radius:3px;padding:0 4px;font-family:monospace">?</kbd> no teclado — para ver todos os atalhos disponíveis. Use <kbd style="border:1px solid #ccc;border-radius:3px;padding:0 4px;font-family:monospace">N</kbd> para nova conta e <kbd style="border:1px solid #ccc;border-radius:3px;padding:0 4px;font-family:monospace">/</kbd> para busca.',
            side:        'bottom',
            align:       'end',
          },
          onHighlighted() { motionClickAndShow('.car-kbd-trigger') },
          onDeselected()  { clearMotions() },
        },

        // ── 13. Assistente IA ─────────────────────────────────────────────
        {
          element: '.app-nav-assistente',
          popover: {
            title:       'Assistente IA + Insights',
            description: 'O item <strong>Assistente Bling</strong> no menu abre o assistente para perguntas sobre seus dados financeiros. Na aba <strong>Insights</strong>, análises automáticas detectam inadimplência, concentração de risco e anomalias — com ações recomendadas.',
            side:        'top',
            align:       'end',
          },
          onHighlighted() { motionChatFab() },
          onDeselected()  { clearMotions() },
        },

        // ── 14. Encerramento ──────────────────────────────────────────────
        {
          popover: {
            title:       'Você está pronto!',
            description: 'Conheça todas as funcionalidades a fundo explorando a tela. Dúvidas? Clique em <strong>Iniciar tour</strong> novamente a qualquer momento.',
            side:        'over',
            align:       'center',
          },
        },
      ],

      onDestroyed() { clearMotions() },
    })

    driverObj.drive()
  }

  return { start }
}
