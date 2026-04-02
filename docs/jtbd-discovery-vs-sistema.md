# Análise Comparativa: JTBD Discovery vs. Sistema Implementado

> O documento "Discovery JTBD Financeiro" identifica **11 Focus Jobs** que os clientes precisam executar para *"Gerenciar o financeiro com clareza e controle"*. Esta análise mapeia cada job contra o que o sistema atual entrega e o que falta.

---

## Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ✅ | **Entregue** — funcionalidade implementada e funcional |
| ⚠️ | **Parcial** — existe algo implementado mas não cobre totalmente o job |
| ❌ | **Não entregue** — funcionalidade ausente no sistema |

---

## Job 1: Cadastrar contas a pagar
> Registrar obrigações futuras (fornecedores, impostos, despesas fixas)

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Inserir boletos (digitais ou físicos) | ✅ | Formulário completo em `NovaContaPagarPanel.vue` com todos os campos |
| 2. Programar vencimentos recorrentes | ⚠️ | Campos de ocorrência/frequência/parcelas existem, mas não há geração automática das parcelas futuras |
| 3. Classificar por tipo ou canal | ✅ | Categorias implementadas (Vendas, Serviços, Aluguéis, Outros) + canal de venda |
| 4. Alertas de vencimento | ⚠️ | Sistema marca como "Atrasada" visualmente, mas sem notificações push/email proativas |
| 5. Antecipações e adiantamentos | ❌ | Não existe fluxo de adiantamento a fornecedores |
| 6. Anexar comprovantes | ✅ | Document AI com upload de PDF/imagem ao Supabase Storage |
| 7. Cobranças extras de marketplaces | ⚠️ | Pode ser lançado manualmente. "Lançar diferença" em Carteiras Marketplace resolve parcialmente |

**Resumo:** Core entregue. Gaps principais: recorrência automática e alertas proativos.

---

## Job 2: Cadastrar valores a receber
> Registrar vendas a prazo, fiado, receitas previstas

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Cadastrar recebíveis por cliente, data e canal | ✅ | `NovaContaReceberPanel.vue` com cliente, vencimento, canal, categoria |
| 2. Lançar vendas fiado/prazos | ✅ | Fluxo básico funciona — conta a receber com vencimento futuro |
| 3. Importar vendas de marketplaces | ❌ | Não há integração com APIs de marketplaces para importação automática |
| 4. Entradas parciais (split) | ⚠️ | Status "Recebida parcialmente" existe, mas sem fluxo de múltiplas entradas parciais |
| 5. Visualizar por período | ✅ | Filtro de período completo (dia/semana/mês/trimestre/ano + custom) |
| 6. Valor líquido de repasses | ⚠️ | Carteiras Marketplace mostra diferença bruto vs. líquido, sem detalhamento de taxas |
| 7. Ajustar por devoluções/inadimplência | ⚠️ | Cancelamento de recebimento existe, mas sem fluxo específico de devoluções |
| 8. Cancelamentos e estornos | ⚠️ | "Cancelar recebimento" reverte status, sem integração automática com marketplaces |
| 9. Classificar por canal ou cliente | ✅ | Filtros por canal de venda e cliente implementados |

**Resumo:** Core entregue. Gaps: importação automática de marketplaces, pagamentos parciais detalhados.

---

## Job 3: Acompanhar vencimentos
> Saber o que pagar/receber e quando, organizar o caixa

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Agenda de contas e recebimentos futuros | ✅ | Agenda Financeira com todos os lançamentos futuros |
| 2. Cruzar data do pedido com data do repasse | ⚠️ | Carteiras Marketplace tem data de repasse, mas sem cruzamento automático |
| 3. Conferir vencimentos com saldo disponível | ✅ | Totalizadores mostram saldo em bancos + a receber + a pagar + saldo previsto |
| 4. Filtrar por canal | ✅ | Filtro por canal de venda na Agenda |
| 5. Alertas de contas a vencer | ⚠️ | Marcação visual automática de atraso, mas sem notificações proativas |
| 6. Provisionamento de repasses por canal | ⚠️ | Cards de totais por marketplace/POS, mas sem previsão de datas de repasse |
| 7. Reorganizar vencimentos conforme fluxo | ❌ | Não é possível alterar vencimentos em lote ou simular reorganização |
| 8. Estornos como "vencimentos negativos" | ❌ | Não existe conceito de estorno como vencimento monitorável |

**Resumo:** Boa cobertura visual. Falta: alertas proativos, simulação de reorganização de vencimentos.

---

## Job 4: Pagar contas
> Liquidar contas e registrar a baixa

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Efetuar pagamento no banco | ❌ | Não há integração bancária (Open Banking/Pix API) — pagamento é externo |
| 2. Aprovação de pagamentos (times) | ⚠️ | Fluxo "Para Aprovação" existe via Document AI, mas sem workflow multi-usuário com roles |
| 3. Pagamentos parciais ou renegociados | ⚠️ | "Paga parcialmente" como status existe, mas sem fluxo detalhado de parciais |
| 4. Baixar comprovante e anexar | ✅ | Upload de documentos via Document AI / Storage |
| 5. Lançar pagamentos feitos fora da plataforma | ✅ | Pode criar conta a pagar e dar baixa manualmente |
| 6. Organizar por data de repasse | ⚠️ | Filtros de período existem, mas não há reorganização visual |

**Resumo:** Baixa funciona bem. Gaps: integração bancária, aprovação multi-usuário, parciais detalhados.

---

## Job 5: Confirmar recebimentos
> Garantir que o dinheiro entrou e dar baixa

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Verificar depósitos na conta | ⚠️ | Conciliação bancária importa extrato, mas não há conexão automática (Open Banking) |
| 2. Dar baixa manual ou automática | ✅ | Baixa manual funciona. Auto-match na conciliação sugere correspondências |
| 3. Confirmar com base em previsões | ✅ | Conciliação cruza extrato com contas previstas |
| 4. Corrigir valores de gateways/marketplaces | ⚠️ | "Lançar diferença" em Carteiras Marketplace resolve parcialmente |
| 5. Corrigir baixas incorretas ou duplicadas | ✅ | "Cancelar recebimento" e "Desconciliar" implementados |
| 6. Classificar por canal ou cliente | ✅ | Filtros implementados |
| 7. Validar valor real vs. valor bruto | ⚠️ | Carteiras Marketplace mostra diferença, mas sem detalhamento automático de taxas |

**Resumo:** Bem coberto com conciliação bancária + baixas. Gap: conexão automática com banco.

---

## Job 6: Fazer conciliação bancária
> Conferir extrato bancário vs. lançamentos do sistema

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Classificar divergências | ⚠️ | Itens pendentes são visíveis, mas não há relatório formal de divergências |
| 2. Importar extrato bancário | ✅ | OFX (XML + SGML) e CSV suportados |
| 3. Conciliar entradas e saídas | ✅ | Auto-match (valor exato + ±3 dias) + conciliação manual + multi-link |
| 4. Conciliar por canal de venda | ⚠️ | Conciliação é por conta financeira, não segmenta por canal |
| 5. Monitorar estornos indevidos | ❌ | Não há monitoramento específico de estornos |
| 6. Detectar diferenças plataforma vs. extrato | ⚠️ | Carteiras Marketplace mostra diferenças, mas sem cruzamento automático |
| 7. Gerar relatório de inconsistências | ❌ | Não há relatório exportável de inconsistências |
| 8. Finalizar fechamento diário/semanal/mensal | ❌ | Não existe conceito de "fechamento" de período |

**Resumo:** Import e match funcionam muito bem. Gaps: relatório de inconsistências, fechamento de período, Open Banking.

---

## Job 7: Gerar relatórios financeiros
> DRE, fluxo de caixa consolidado, relatórios gerenciais

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Relatório de entradas e saídas | ⚠️ | Agenda Financeira mostra entradas/saídas + gráfico, mas sem relatório formal exportável |
| 2. DRE simplificada por canal | ❌ | Não implementado — menu "Relatórios" está desabilitado |
| 3. Comparar performance entre períodos | ❌ | Não há comparativo mês a mês ou ano a ano |
| 4. Lucro líquido do mês | ❌ | Não existe cálculo de lucro líquido |
| 5. Monitorar taxas de plataformas | ⚠️ | Carteiras Marketplace mostra taxas por transação, sem consolidação periódica |
| 6. Impacto de estornos e cancelamentos | ❌ | Não há análise de impacto |
| 7. Diferenças vendas vs. NF emitidas | ❌ | Fora do escopo (não há módulo de NF-e) |
| 8. Margem real por canal | ❌ | Não implementado |
| 9. Exportar para contabilidade | ❌ | Não há exportação de dados |

**Resumo:** ❌ **Este é o maior gap do sistema.** Relatórios financeiros e gerenciais não existem.

---

## Job 8: Definir e ajustar preços de venda
> Precificação com base em custos, taxas e margem

| Job Step | Status | Detalhe |
|----------|--------|---------|
| Todos os steps (1–7) | ❌ | Nada implementado. Não há módulo de precificação. |

**Resumo:** ❌ Totalmente fora do escopo atual. Clientes continuarão usando planilhas.

---

## Job 9: Garantir registro correto e completo
> Auditoria, integridade dos dados, dupla checagem

| Job Step | Status | Detalhe |
|----------|--------|---------|
| 1. Mapear custos fixos | ⚠️ | Categorias existem, mas não há dashboard de custos fixos |
| 2. Comparar faturas com vendas | ⚠️ | Carteiras Marketplace compara parcialmente |
| 3. Garantir entradas e saídas por período | ✅ | Agenda Financeira com totalizadores |
| 4. Verificar consistência de registros | ⚠️ | Conciliação ajuda, mas não há auditoria formal |
| 5. Corrigir inconsistências | ✅ | Edição, cancelamento, desconciliação disponíveis |
| 6. Atualizar valores com ajustes | ✅ | Edição de contas a receber/pagar funciona |
| 7. Permissionamento de usuários | ❌ | Não há sistema de permissões/roles — acesso é único |

**Resumo:** Funcionalidades básicas de correção existem. Gaps: permissionamento e auditoria formal.

---

## Job 10: Interpretar indicadores para decisões
> Análise de DRE, margem, ticket médio, rentabilidade por canal

| Job Step | Status | Detalhe |
|----------|--------|---------|
| Todos os steps (1–6) | ❌ | Nada implementado. Não há dashboards analíticos, DRE gerencial, ou indicadores. |

**Resumo:** ❌ Totalmente ausente. Depende da implementação de Relatórios (Job 7).

---

## Job 11: Projetar cenários e metas financeiras
> Simulação de fluxo de caixa futuro, cenários, metas

| Job Step | Status | Detalhe |
|----------|--------|---------|
| Todos os steps (1–7) | ❌ | Nada implementado. Não há simulação de cenários ou metas. |

**Resumo:** ❌ Totalmente ausente. Este é o job mais avançado e depende de todos os anteriores.

---

## Resumo Executivo

### O que o sistema ENTREGA BEM (core operacional)

1. **Cadastro de contas a pagar e receber** — formulários completos, categorias, canais
2. **Acompanhamento de vencimentos** — Agenda Financeira com totalizadores, gráfico, filtros
3. **Baixas e cancelamentos** — fluxo completo com sincronia automática com a Agenda
4. **Conciliação bancária** — import OFX/CSV, auto-match, multi-link
5. **Document AI** — extração inteligente de boletos/NFs com fluxo de aprovação
6. **Carteiras Marketplace/POS** — rastreamento de diferenças, lançamento de ajustes
7. **Antecipação de recebíveis** — com cálculo de custo

---

### Gaps críticos ordenados por impacto

| Prioridade | Gap | Jobs Impactados | Complexidade |
|-----------|-----|----------------|-------------|
| 🔴 P0 | Relatórios financeiros (DRE, Fluxo de Caixa, Margem por canal) | 7, 10, 11 | Alta |
| 🔴 P0 | Alertas e notificações proativas (vencimentos, atrasos) | 1, 3, 5 | Média |
| 🟡 P1 | Recorrência automática — gerar parcelas futuras | 1, 4 | Média |
| 🟡 P1 | Pagamentos parciais detalhados — múltiplas entradas/saídas por título | 2, 4, 5 | Média |
| 🟡 P1 | Permissionamento/Roles — controle de acesso por usuário | 9 | Alta |
| 🟠 P2 | Fechamento de período — conceito de "fechar" dia/semana/mês | 6, 9 | Média |
| 🟠 P2 | Exportação de dados — CSV/PDF para contabilidade | 7 | Baixa |
| 🟠 P2 | Comparativo entre períodos — mês a mês, ano a ano | 7, 10 | Média |
| 🔵 P3 | Integração bancária (Open Banking) — import automático de extrato | 4, 5, 6 | Alta |
| 🔵 P3 | Integração com marketplaces — import automático de vendas/repasses | 2, 5 | Alta |
| 🔵 P3 | Precificação — cálculo de markup/margem com simulação de taxas | 8 | Alta |
| 🔵 P3 | Projeção financeira — simulação de cenários e metas | 11 | Alta |

---

### Cobertura por Job

| Job | Cobertura | Nota |
|-----|----------|------|
| 1. Cadastrar contas a pagar | ⚠️ 75% | Falta recorrência automática e alertas |
| 2. Cadastrar valores a receber | ⚠️ 70% | Falta import marketplace e parciais |
| 3. Acompanhar vencimentos | ⚠️ 70% | Falta alertas proativos e reorganização |
| 4. Pagar contas | ⚠️ 60% | Falta integração bancária e aprovação multi-user |
| 5. Confirmar recebimentos | ✅ 80% | Conciliação cobre bem, falta Open Banking |
| 6. Conciliação bancária | ✅ 75% | Implementado, falta fechamento e relatórios |
| 7. Relatórios financeiros | ❌ 10% | Apenas gráfico básico na Agenda |
| 8. Precificação | ❌ 0% | Não implementado |
| 9. Registro correto e completo | ⚠️ 55% | Falta permissões e auditoria |
| 10. Indicadores para decisões | ❌ 0% | Não implementado |
| 11. Projeção e metas | ❌ 0% | Não implementado |

---

## Conclusão

O sistema cobre muito bem os **jobs operacionais do dia a dia (1–6)**, que são os mais urgentes para os clientes. Os **jobs analíticos e estratégicos (7–11)** representam a próxima fronteira de evolução e são onde os clientes ainda dependem 100% de planilhas externas.
