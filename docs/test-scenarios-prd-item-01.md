# Cenários de Teste — PRD-ITEM-01 v2.0 — Ciclo Aberto de APA

Cobertura manual para o fluxo de Revisão Rápida (quick_review) e detecção de ciclos abertos.

---

## CT-01 — detectOpenCycles: nenhum ciclo quando todos os structured_P têm APA vinculada

**Pré-condição:** projeto com 1 `structured_P` e 1 `structured_A` cujo `linked_to` aponta para esse `structured_P`.
**Ação:** chamar `detectOpenCycles(entries)`.
**Resultado esperado:** array vazio.

---

## CT-02 — detectOpenCycles: nenhum ciclo quando structured_P tem quick_review vinculada

**Pré-condição:** projeto com 1 `structured_P` e 1 `quick_review` cujo `linked_to` aponta para esse `structured_P`.
**Ação:** chamar `detectOpenCycles(entries)`.
**Resultado esperado:** array vazio.

---

## CT-03 — detectOpenCycles: ciclo detectado quando structured_P não tem APA nem quick_review

**Pré-condição:** projeto com 1 `structured_P` sem nenhuma entry ligada a ele.
**Ação:** chamar `detectOpenCycles(entries)`.
**Resultado esperado:** array com 1 `OpenCycle` contendo `imv.id` igual ao id do `structured_P`.

---

## CT-04 — detectOpenCycles: ordena por daysOpen decrescente

**Pré-condição:** projeto com 2 `structured_P` sem avaliação; o primeiro criado há 5 dias, o segundo há 10 dias.
**Ação:** chamar `detectOpenCycles(entries)`.
**Resultado esperado:** primeiro elemento da array é o de 10 dias; `daysOpen` do segundo elemento é 5.

---

## CT-05 — OpenCycleCard: renderiza com borda âmbar quando ciclo existe

**Pré-condição:** ProjectDashboard de projeto com 1 `structured_P` sem avaliação.
**Ação:** navegar para o dashboard do projeto.
**Resultado esperado:** card com borda esquerda âmbar (#D97706), ícone `AlertCircle`, label "CICLO ABERTO" visível.

---

## CT-06 — ReviewResultScreen: salva quick_review com conteúdo correto

**Pré-condição:** acessar `/project/:id/review/:entryId` com `entryId` de um `structured_P` existente.
**Ação:** preencher `what_happened` (≤300 chars), selecionar `met_expectation = 'partial'`, preencher `next_step` (≤200 chars) e clicar em "Salvar resultado".
**Resultado esperado:**
- nova entry do tipo `quick_review` criada com `copa_phase = 'A'` e `linked_to = entryId`
- `content.met_expectation = 'partial'`
- `content.elevated_to_apa = false`
- ciclo desaparece do dashboard após salvar.

---

## CT-07 — ReviewResultScreen: "Salvar e aprofundar com APA completa" navega para FormatA com contexto

**Pré-condição:** mesma que CT-06.
**Ação:** preencher campos mínimos e clicar em "Salvar e aprofundar com APA completa".
**Resultado esperado:**
- quick_review salva com `elevated_to_apa = true`
- navegação para `/register/structured?format=A&linkedTo=<entryId>`
- campo `fact_text` de FormatA pré-preenchido com o `what_happened` digitado.

---

## CT-08 — Timeline: quick_review aparece com label "Revisão Rápida"

**Pré-condição:** projeto com pelo menos 1 `quick_review` salva.
**Ação:** abrir Diário → aba Linha do Tempo.
**Resultado esperado:** card da entry exibe chip "Revisão Rápida" e ícone `R`.

---

## CT-09 — Timeline: met_expectation 'yes' exibe badge verde

**Pré-condição:** `quick_review` com `met_expectation = 'yes'`.
**Ação:** visualizar card na Timeline.
**Resultado esperado:** badge "Atingiu" em verde (`text-op-success`), sem badge âmbar ou vermelho.

---

## CT-10 — Timeline: met_expectation 'partial' exibe badge âmbar

**Pré-condição:** `quick_review` com `met_expectation = 'partial'`.
**Ação:** visualizar card na Timeline.
**Resultado esperado:** badge "Parcialmente" em âmbar (`text-op-amber`).

---

## CT-11 — Timeline: met_expectation 'no' exibe badge vermelho

**Pré-condição:** `quick_review` com `met_expectation = 'no'`.
**Ação:** visualizar card na Timeline.
**Resultado esperado:** badge "Não atingiu" em vermelho (`text-op-danger`).

---

## CT-12 — IndexCalculator: quick_review conta como 0.7 no execution_score

**Pré-condição:** projeto com 2 `structured_P` e 1 `quick_review` vinculada a um deles (sem nenhum `structured_A`).
**Ação:** calcular o índice via `IndexCalculator.calculate(entries, projects)`.
**Resultado esperado:** `execution_score` equivalente a `(0.7 / 2) × 100 = 35`, sem penalidade de atraso para o `structured_P` coberto pela `quick_review`.
