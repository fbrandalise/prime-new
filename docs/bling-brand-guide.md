# Bling — Guia de Identidade Visual e Posicionamento de Marca

> Documento de referência para design de interfaces e materiais visuais.
> Versão 1.0 · Baseado no posicionamento FutureBrand 2025 · Atualizado em 2026-03-20

---

## 1. Estratégia de Marca

### Brand Idea
> **"Bling muda o jogo com você."**

### Brand Statement
O Bling é a plataforma que muda o jogo do seu negócio, dando mais controle à sua operação, impulsionando suas vendas e acelerando sua escala.

### Propósito
Transformar negócios para crescerem e prosperarem por meio da tecnologia.

### Personalidade da Marca

| Traço | Atributos |
|---|---|
| **Obstinado** | #determinado #intenso #encorajador |
| **Decodificador** | #intuitivo #simples #inteligente |
| **Responsivo** | #parceiro #flexível #adaptável |

### Tom de voz
- Direto, pragmático e resolutivo
- Próximo, otimista e encorajador
- Nunca técnico ou corporativo demais
- Usa linguagem do empreendedor, não do ERP

---

## 2. Paleta de Cores

### Paleta oficial aprovada (7 cores — usar EXCLUSIVAMENTE estas)

| Token | Nome | Hex | Uso |
|---|---|---|---|
| `--bling-green` | Bling Green | `#00F070` | CTA, destaques, logo em fundos escuros, badges ativos, sidebar neon |
| `--bling-dark-green` | Bling Dark Green | `#043329` | Sidebar padrão, headers, fundos de seção principal |
| `--bling-black` | Bling Black | `#151515` | Tipografia principal, sidebar escura, ícones |
| `--bling-beige` | Bling Beige | `#F9FFE5` | Fundos de página quentes, áreas de conteúdo warm |
| `--bling-green-ii` | Bling Green II | `#D1FFD1` | Fundos mint, tags de sucesso, áreas de destaque suave |
| `--bling-gray` | Bling Gray | `#F2F1ED` | Fundos neutros padrão, separadores, áreas secundárias |
| `--bling-white` | Bling White | `#FFFFFF` | Cards, modais, texto em fundos escuros |

> **Regra absoluta:** Nunca usar cores fora desta paleta. Para estados (hover, border, shadow) usar rgba() das cores acima.

### Escala do Bling Green para PrimeVue / design tokens

```
50:  #EDFFF5   ← backgrounds sutis
100: #D1FFD1   ← Bling Green II (aprovado)
200: #9AFFB8
300: #55FF90
400: #1AFF78   ← hover de botões
500: #00F070   ← COR PRINCIPAL — hero color (aprovado)
600: #00C05A   ← active/pressed state
700: #008F42
800: #006830
900: #00451E
950: #002510
```

### Combinações aprovadas de cor

| Fundo | Texto/Elemento | Contexto |
|---|---|---|
| `#043329` (dark green) | `#00F070` (neon) | Logo, nav ativa, sidebar |
| `#043329` (dark green) | `#FFFFFF` | Texto genérico na sidebar |
| `#00F070` (neon) | `#043329` (dark green) | Botões CTA, sidebar neon |
| `#151515` (black) | `#00F070` (neon) | Logo/acento em sidebar preta |
| `#151515` (black) | `#FFFFFF` | Texto em sidebar preta |
| `#F9FFE5` (beige) | `#043329` (dark green) | Conteúdo em fundo quente |
| `#D1FFD1` (green ii) | `#043329` (dark green) | Conteúdo em fundo mint |
| `#F2F1ED` (gray) | `#151515` (black) | Conteúdo padrão |
| `#FFFFFF` | `#151515` (black) | Cards, modais |

### ⚠️ Combinações proibidas
- Qualquer cor fora da paleta de 7 cores aprovadas
- `#00F070` sobre `#D1FFD1` (contraste insuficiente, cores próximas)
- Branco sobre `#00F070` sem peso bold 700+ (contraste baixo)

---

## 3. Tipografia

### Família principal: **Lexend**
> Google Fonts: `https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap`

Lexend é uma fonte variable com foco em legibilidade. Seus contornos arredondados dialogam diretamente com a geometria do logo.

### Escala tipográfica

| Role | Peso | Tamanho | Line-height | Uso |
|---|---|---|---|---|
| Display | 800 | 3rem+ | 1.1 | Headlines de campanha, onboarding |
| H1 | 700 | 2rem | 1.2 | Títulos de página |
| H2 | 600 | 1.5rem | 1.3 | Seções principais |
| H3 | 600 | 1.125rem | 1.35 | Cards, subtítulos |
| Body Large | 400 | 1rem | 1.6 | Texto editorial |
| Body | 400 | 0.875rem | 1.5 | Texto de interface padrão |
| Body Small | 400 | 0.8125rem | 1.5 | Labels, metadados |
| Caption | 500 | 0.75rem | 1.4 | Tags, badges, botões pequenos |
| Overline | 600 | 0.625rem | 1 | Labels de categoria (ALL CAPS) |

### CSS snippet padrão
```css
font-family: 'Lexend', system-ui, -apple-system, sans-serif;
font-weight: 400;
-webkit-font-smoothing: antialiased;
```

---

## 4. Logo

### Conceito
Wordmark tipográfico todo em minúsculas: **bling**
Fonte customizada com base em Lexend, com modificações:
- O **"n"** está invertido (virado), simbolizando mudança de perspectiva — a *virada de jogo*
- O **"g"** tem um descender especial que ancora e equilibra a composição
- Terminações com cantos arredondados trazem leveza e aspecto humano
- Contraste entre formas cheias (b, o, g) e lineares (l, i, n) cria sensação de movimento

### Variações aprovadas

| Variação | Fundo | Logo Color | Quando usar |
|---|---|---|---|
| Principal | `#0D3828` (dark green) | `#00E85A` (neon) | Sidebar, app, materiais dark |
| Invertida | `#00E85A` (neon) | `#0D3828` (dark green) | Backgrounds neon, campanhas |
| Light | `#F8F8E8` (beige) | `#0D3828` (dark green) | Fundos claros, documentos |
| Mint | `#C8F5D0` (green ii) | `#0D3828` (dark green) | Variação secundária em fundos mint |
| White | `#FFFFFF` | `#0D3828` (dark green) | Interfaces brancas, PDFs |

### Com tagline
```
bling  muda o jogo
       com você
```
Tagline em Lexend Regular, tamanho ~40% da altura do logo.

### Lockup para sub-produtos (arquitetura de portfólio)
```
bling GESTÃO
bling COMMERCE
bling PDV
bling CONTA DIGITAL
bling ENVIOS
```
O nome do sub-produto é em Lexend ALL CAPS, menor que o logotipo.

### Elemento gráfico: o "n" invertido
O "n" isolado, invertido, serve como elemento de suporte e mascote gráfico da marca.
Pode ser usado em fundos ou como ícone/app icon.
Paleta: `#C8F5D0` (mint) sobre `#0D3828` (dark green) — variação preferida.

### Área de proteção
Mínimo de 1× a altura do logo em todos os lados.

---

## 5. Componentes de Interface (UI Patterns)

### Sidebar de navegação
```
Fundo:          #0D3828 (Bling Dark Green)
Borda direita:  rgba(255,255,255,0.08)
Logo:           wordmark em #00E85A
Texto nav:      rgba(255,255,255,0.85)
Texto muted:    rgba(255,255,255,0.45)
Item hover bg:  rgba(255,255,255,0.07)
Item ativo bg:  rgba(0,232,90,0.15)
Item ativo text: #00E85A
Group labels:   rgba(255,255,255,0.45) · ALL CAPS · letter-spacing 0.08em
```

### Botões
| Variante | Fundo | Texto | Borda | Hover |
|---|---|---|---|---|
| Primary (filled) | `#00E85A` | `#0D3828` | — | `#1FE972` |
| Secondary (outline) | transparente | `#0D3828` | `#0D3828` | `#F2F5EE` bg |
| Ghost (text) | transparente | `#0D3828` | — | `#F2F5EE` bg |
| Danger | `#EF4444` | `#FFFFFF` | — | `#DC2626` |

### Cards
```
Fundo:          #FFFFFF ou #F8F8F5
Borda:          1px solid #E8EDE8
Border-radius:  12px
Box-shadow:     0 1px 4px rgba(13,56,40,0.06)
```
Cards com destaque positivo usam borda ou badge em `#C8F5D0`.

### Tags / Badges de status financeiro
| Status | Fundo | Texto |
|---|---|---|
| Recebido / Pago | `#C8F5D0` | `#00461B` |
| Pendente | `#FEF3C7` | `#92400E` |
| Atrasado | `#FEE2E2` | `#991B1B` |
| Cancelado | `#F1F5F9` | `#475569` |

### Inputs
```
Border:         1px solid #D1D8D1
Border-radius:  8px
Focus border:   #00E85A
Focus shadow:   0 0 0 3px rgba(0,232,90,0.15)
Background:     #FFFFFF
Placeholder:    #94A394
```

### Gráficos e Datavis
- Cor primária de dados: `#00E85A`
- Cor secundária: `#0D3828`
- Cor terciária: `#C8F5D0`
- Grid lines: `#E8EDE8`
- Labels: `#475569` (body) / `#1E293B` (emphasis)
- Background de gráfico: `#FFFFFF` ou `#F8F8F5`

---

## 6. Iconografia

### Estilo de ícones
Os ícones Bling seguem o estilo de "card tiltado" — cada ícone vive dentro de um container quadrado com bordas arredondadas, levemente inclinado (transform: rotate(-5deg) ou perspectiva 3D suave), sobre fundo `#00E85A`, com o símbolo em `#0D3828`.

### Ícones de interface
Para uso em navegação e UI: **PrimeIcons** (já integrado)
Tamanho padrão: 0.875rem–1rem na sidebar, 1rem–1.125rem no conteúdo

---

## 7. Fotografia e Imagens

### Diretrizes
- Empreendedores reais em situações de trabalho ativo (não poses artificiais)
- Tons quentes, naturais, com iluminação orgânica
- Predominância de tons verdes/neutros no ambiente
- Foco no produto/operação, não só no rosto
- **Evitar**: Stock photography genérica, imagens corporativas formais, diversidade artificialmente forçada

### Tratamento de imagens
- Fotos em containers com bordas arredondadas (12–16px)
- Podem ser levemente inclinadas (máx. ±3°) para dinamismo
- Contraste ligeiramente elevado — imagens vibrantes, não melancólicas

### Overlay de cor para composição
Quando sobre fundo neon (`#00E85A`) ou dark green (`#0D3828`), usar imagens com:
- Cantos arredondados `border-radius: 12px`
- Sombra suave `box-shadow: 0 8px 32px rgba(13,56,40,0.3)`

---

## 8. Motion e Animações

### Princípios
- Movimentos com propósito: sempre comunicam mudança de estado
- Curvas ease-out para elementos entrando, ease-in para saindo
- Durações: micro (100ms), padrão (200ms), macro (300ms)

### Tokens de animação
```css
--transition-micro:    100ms ease;
--transition-standard: 200ms ease;
--transition-macro:    300ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Animações de entrada de conteúdo
```css
/* Fade + slide up leve */
@keyframes bling-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: bling-enter 200ms ease forwards;
```

---

## 9. Estrutura de Layout de Interface

### App Shell (padrão)
```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (240px / 56px collapsed)  │ CONTENT AREA    │
│ bg: #0D3828                       │ bg: #F2F5EE     │
│                                   │ overflow-y auto │
│ [bling logo]        [toggle]      │                 │
│ ─────────────────────────────     │ [Breadcrumb]    │
│ Financeiro ▾                      │ [Page Header]   │
│   Meu Financeiro                  │ [Content]       │
│   ── Entradas ──                  │                 │
│   Contas a receber  ← selected    │                 │
│   ...                             │                 │
└─────────────────────────────────────────────────────┘
```

### Breakpoints sugeridos
| Breakpoint | Width | Comportamento |
|---|---|---|
| Mobile | < 768px | Sidebar colapsada, overlay ao expandir |
| Tablet | 768–1280px | Sidebar colapsada (56px) por padrão |
| Desktop | > 1280px | Sidebar expandida (240px) por padrão |

### Espaçamento base
- **Grid base**: 4px
- **Espaçamento padrão**: 16px, 24px, 32px
- **Padding de página**: 24px (desktop) / 16px (mobile)
- **Gap de card grid**: 16px

---

## 10. Identidade Verbal

### Concept criativo
*"Muda o jogo com você"* — a marca está do lado do empreendedor, não acima dele.

### Boas práticas de comunicação

**Faça:**
- Escreva em 1ª pessoa ao falar com o usuário: "você consegue", "seu negócio"
- Use verbos de ação: controlar, vender, crescer, escalar, dominar
- Seja direto: "Pague agora" > "Efetuar pagamento"
- Valide a competência do empreendedor
- Use o nome "Bling" sem "o" antes (não "o Bling")

**Não faça:**
- Jargão técnico desnecessário: "módulo fiscal", "lançamento contábil"
- Linguagem passiva: "foi realizado", "deve ser efetuado"
- Exagero aspiracional vazio: "transforme sua vida", "o futuro é agora"
- Infantilizar: excesso de emojis, exclamações, tom condescendente

### Microcopy padrão para UI

| Contexto | Texto |
|---|---|
| Botão salvar | "Salvar" |
| Botão cancelar | "Cancelar" |
| Estado vazio | "Nenhum resultado. Tente outro filtro." |
| Erro de carregamento | "Não foi possível carregar. Tente novamente." |
| Ação irreversível | "Isso não pode ser desfeito. Tem certeza?" |
| Loading | "Carregando..." |
| Sucesso | "Feito!" ou ação específica: "Conta salva!" |

---

## 11. Referências Rápidas (cheatsheet para IA)

Para qualquer interface Bling, aplique:

```
PALETA APROVADA (apenas estas 7 cores — nunca sair delas):
  #00F070  Bling Green      — CTA, logo em fundo escuro, sidebar neon
  #043329  Bling Dark Green — sidebar padrão, headers
  #151515  Bling Black      — sidebar escura, tipografia principal
  #F9FFE5  Bling Beige      — fundos de página quentes
  #D1FFD1  Bling Green II   — fundos mint, success suave
  #F2F1ED  Bling Gray       — fundos neutros padrão
  #FFFFFF  Bling White      — cards, modais, texto em fundo escuro

FONTES:
  Tudo em Lexend. Weight 400 (body), 600 (ênfase), 700 (títulos), 800 (display).

SIDEBAR (tema Floresta — padrão):
  bg #043329 | logo neon #00F070 | texto rgba(255,255,255,0.85)
  item ativo: bg rgba(0,240,112,0.15) + cor #00F070

SIDEBAR (tema Neon):
  bg #00F070 | logo #043329 | texto rgba(4,51,41,0.9)
  item ativo: bg rgba(4,51,41,0.15) + cor #043329

SIDEBAR (tema Preto / Escuro):
  bg #151515 | logo neon #00F070 | texto rgba(255,255,255,0.85)

PÁGINA/CONTEÚDO:
  Floresta: bg #F2F1ED | Bege: bg #F9FFE5 | Menta: bg #D1FFD1
  cards bg #FFFFFF | borda: rgba() das cores de fundo

BOTÃO PRIMÁRIO:
  bg #00F070 | texto #043329 | border-radius 8px

BORDER-RADIUS:
  Botões: 8px | Cards: 12px | Modais: 16px | Tags: 6px

STATUS FINANCEIRO (usar rgba das cores aprovadas):
  ✅ Pago/Recebido: bg rgba(0,240,112,0.15) cor #043329
  ⏳ Pendente: bg rgba(249,255,229,0.8) cor #043329
  ❌ Atrasado: bg rgba(21,21,21,0.08) cor #151515

TAGLINE: "muda o jogo com você" (minúsculo, sem ponto final)
PERSONALIDADE: direto, próximo, encorajador — nunca técnico ou corporativo
```

---

*Documento gerado a partir do material de posicionamento e identidade visual Bling 2025 (FutureBrand).*
