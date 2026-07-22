# Mapeamento Técnico — Relatório Consultivo de Projeto com IA

> Insumo para escrever o PRD. Precisão de campo/tipo/`file:line`. Repo: `copa-decision-shield`.
> Todos os trechos foram verificados no código atual (branch `claude/kind-bardeen-rKhPC`).

---

## PONTO 1 — Interfaces de content de entry (`src/lib/register.ts`)

Todas verbatim, com linha. `?` = opcional.

**PulseContent** (`:34-41`): `text`, `fact_text`, `interpretation_text: string`; `classification: 'fact'|'decision'|'result'|'doubt'`; `input_method: 'text'|'voice'`; `has_mixed_interpretation: boolean`.

**StructuredCContent** (`:56-62`): `fact_text`, `interpretation_text`, `hypothesis_text: string`; `imv_possible?: string`; `root_cause_chain?: RootCauseChain`.
- `RootCauseChain` (`:49-54`): `steps: RootCauseStep[]`, `root_cause: string`, `completed: boolean`, `steps_taken: number`.
- `RootCauseStep` (`:43-47`): `question`, `answer: string`, `step_number: number` (1-5).

**StructuredOContent** (`:96-104`): `resources`, `frictions`, **`bottleneck`** (⚠ não `main_bottleneck`); `lever_filter?: LeverItem[]` (Mód.2); `inventory_4d?: Inventory4D` (Mód.3); `recombinations?: RecombinationItem[]` (Mód.4); `selected_recombination?: string`.
- `LeverItem` (`:64-74`): `id`, `idea: string`; `impact`/`control`/`effort`/`repeatability`/`measurement: boolean|null`; `result: 'lever'|'noise'|'incomplete'`; `no_count: number`.
- `Inventory4D` (`:83-88`): `density`/`direction`/`delay`/`desire: Inventory4DItems`. `Inventory4DItems` (`:77-81`): `item1`/`item2`/`item3: string`.
- `RecombinationItem` (`:90-94`): `id`, `idea: string`, `selected: boolean`.

**StructuredPContent** (`:142-156`): `action: string`; `reversible`/`cheap`/`specific`/`measurable: boolean|null`; `metric: string`; `deadline: string|null`; `cut_rule: string`; `layer: OperationalLayer|null`; `ethical_check?: string|null`; `execution_plan?: ExecutionPlan`; `action_plan?: ActionPlan`; `cost_benefit?: CostBenefitData`.
- ⚠ `situational_fit*` (citado no CLAUDE.md) **não existe** nesta interface.
- `ActionPlan` (`:106-114`): `what`,`why`,`how`,`when`,`who_is_affected`,`how_much`,`generated_at: string`.
- `CostItem` (`:116-121`): `id`,`nome: string`; `valor: number`; `grau: 1|2|3|4|5`.
- `BenefitItem` (`:123-127`): `id`,`descricao: string`; `grau: 1|2|3|4|5`.
- `CostBenefitData` (`:131-140`): `custos: CostItem[]`, `beneficios: BenefitItem[]`, `total_custo`/`grau_medio_custo`/`grau_medio_beneficio: number`, `relacao: 'FAVORÁVEL'|'EQUILIBRADO'|'DESFAVORÁVEL'`, `created_at`/`updated_at: string`.
- `ExecutionPlan`/`ExecutionPhase` vêm de `@/types/app` (não de register.ts).

**StructuredAContent** (`:158-168`): `fact_text`, `interpretation_text`, `principle_text`, `decision`, `what_worked: string`; `hidden_cost: string|null`; `repeat_rule`, `cut_rule_next`, `next_bottleneck: string`.

**CorrectiveContent** (`:170-173`): `correct_version`, `why_previous_was_imprecise: string`.

**QuickReviewContent** (`:177-183`): `what_happened: string`; `met_expectation: 'yes'|'partial'|'no'`; `next_step: string`; `elevated_to_apa: boolean`; `linked_structured_p_id: string`.

**DecisionRecordContent** (`:185-191`): `decision`,`context`,`main_risk`,`validation_signal: string`; `review_date?: string`. ⚠ Interface existe mas **não há `saveDecisionRecord`** em register.ts.

**PassiveEvent** (`:657-669`): `kind: 'route_visit'|'register_abandoned'|'register_completed'|'time_between_registers'|'p_imv_interrupted'`; `route?`,`entry_type?: string`; `ms_since_last_entry?`,`hour_local?`,`weekday_local?: number`.

**Protocol5Content** (`:712-719`): `type: ScenarioType`; `fact_text`,`friction_text`,`micro_action`,`signal: string`; `layer: OperationalLayer|null`.

**Clareza Operacional (Módulo 9)** — ⚠ NÃO é entry_type e NÃO tem interface. Salvo por `saveClaritySession` (`:698-708`) como `entry_type:'passive'` com content literal `{ kind:'clarity_session', m1, m2, m3, m4 }` (todos `string`). Discriminador: `content.kind === 'clarity_session'`.

**Sem interface tipada:** `pressure_session`, `creative_session`, `copa_session` (aceitos por `insertEntry`/constraint, sem interface). `simulation_session` via `insertSimulationEntry` (`:737-752`), content `{ simulation_id, simulation_title }`.

---

## PONTO 2 — `Project`, `Entry`, acesso (`src/types/database.ts`, `src/lib/projects.ts`)

**`Project`** (`database.ts:36-62`): `id`,`user_id`,`name`,`north: string`; `state: ProjectState`; `current_bottleneck`/`field_reading`/`calibrated_action: string|null`; `current_copa_phase: CopaPhase|null`; `last_recalled_principle_id: string|null`; `scenario_type: ScenarioType|null`; `current_layer: OperationalLayer|null`; `pact_enabled: boolean`; `pact_day_capture/organize/prove/assess: number`; `pact_started_at`/`pact_last_cycle_at: string|null`; `is_treino_principal: boolean`; `created_at: string`; `last_entry_at`/`concluded_at`/`archived_at`/`pause_reason: string|null`.

**`Entry`** (`database.ts:74-91`): `id`,`project_id`,`user_id: string`; `entry_type: EntryTypeDB`; `content: Record<string, unknown>`; `classification: string|null`; `is_clean_fact: boolean`; `copa_phase: CopaPhase|null`; `linked_to: string|null`; `edit_history: unknown[]`; `scenario_type_at_entry: ScenarioType|null`; `layer_at_entry: OperationalLayer|null`; `ai_assist_used: boolean`; `ai_assist_type: string|null`; `inbox_processed?: boolean`; `created_at: string`.
- ⚠ `content` é `Record<string, unknown>` — o tipo concreto depende do `entry_type` em runtime (cast manual).

**`getProject(id)`** (`projects.ts:37-44`): guest → `GuestStorage.getProjects().find(...)`; auth → `supabase.from('projects').select('*').eq('id',id).maybeSingle()`.
**`listEntries(projectId)`** (`projects.ts:46-57`): guest → `GuestStorage.getEntries().filter(project_id===)` **sem ordenação**; auth → `supabase … .order('created_at',{ascending:false})`. ⚠ **Guest não ordena** — não confiar na ordem do array.
Padrão dual em todo o arquivo: `const {data:{session}} = await supabase.auth.getSession(); if(!session){GuestStorage…} else {supabase…}`.

---

## PONTO 3 — Adicionar `entry_type: 'project_report'`

**Constraint atual** (migration mais recente que o toca: `supabase/migrations/20260703130000_add_decision_record_entry_type.sql:7-28`). Valores permitidos hoje (15): `pulse, structured_C, structured_O, structured_P, structured_A, passive, corrective, copa_session, pressure_session, protocol_5min, creative_session, simulation_session, quick_review, inbox, decision_record`. Migrations posteriores (entry_images, app_knowledge_base) **não** tocam o constraint.

**`EntryType`** (`app.ts:34-44`): union de 10 valores, termina em `decision_record`.
**`EntryTypeDB`** (`database.ts:65-72`): `EntryType | 'copa_session'|'pressure_session'|'protocol_5min'|'creative_session'|'simulation_session'|'inbox'`.
**`insertEntry`** aceita (`register.ts:195`): `EntryType | 'passive'|'protocol_5min'|'creative_session'|'simulation_session'|'copa_session'|'pressure_session'`.

**Caminho exato para `'project_report'`:**
1. **Nova migration** (ex. `2026072x..._add_project_report_entry_type.sql`) com DROP + ADD do constraint reproduzindo os 15 valores + `'project_report'`. **Nunca editar migration antiga.**
2. **`app.ts:34-44`** → adicionar `| 'project_report'`.
3. **`database.ts` (EntryTypeDB)** → automático (herda `EntryType`).
4. **`register.ts:195`** → automático (herda `EntryType`). Opcional: criar `saveProjectReport()` + `ProjectReportContent` seguindo o molde de `saveQuickReview` (`:636-653`, que passa `linked_to`, `copa_phase`, `*_at_entry`).

Mínimo obrigatório: **migration + `app.ts`**. Resto é automático por herança de tipo.

---

## PONTO 4 — PaywallGate e planos

**`PaywallGate`** (`src/components/PaywallGate.tsx`). Props (`:17-23`): `feature: PlanFeature`, `children`, `fallback?`, `showUpgradePrompt?` (default true), `reason?`.
- Bypass: `ALWAYS_FREE_ROUTES=['/pressure','/register/pulse','/register/structured']` (por prefixo, `:37`) e `ALWAYS_FREE_FEATURES=['copa_unlimited','pressure_unlimited','pulse_unlimited']`.
- Decisão (`:41-43`): `const allowed = typeof value==='boolean' ? value : value > 0`. ⚠ **Feature numérica: qualquer `>0` libera — não conta uso.**
- Bloqueado + `showUpgradePrompt` → children esmaecidos sob overlay clicável → `<UpgradeSheet>`.

**`planLimits.ts`**: só `FREE_LIMITS` (`:50-88`) e `PAID_LIMITS` (`:90-127`). `PLAN_LIMITS = { free:FREE, trial:PAID, paid:PAID }` (`:132-136`).
- `getPlanLimits(authState)` (`:138-143`): TRIAL→trial; ANNUAL/LIFETIME→paid; **GUEST e FREE→free**.
- `useAuthState()` (`:169-221`): `supabase.auth.getSession()` → sem sessão = `GUEST`; com sessão busca `subscriptions` e deriva via `deriveAuthState` (`:147-159`, trial expirado→FREE). Retorna `{authState, subscription, userId, email, loading}`; reage a `onAuthStateChange`.

**Exemplo:** `routes/creative.tsx:12` → `<PaywallGate feature="creative_flow" reason="Criatividade Funcional">`. Outros: `transfer_proof`, `CompassHome`, `SimulationLibrary`. Flags booleanas molde: `pdf_export`, `weekly_report`, `ai_assist_suggestions`, `manual_enabled`, `panel_enabled`.

**Para o relatório:**
- **(a) recomendado** — flag booleana `project_report: boolean` (false/true nos dois objetos + rótulo em `PaywallGate.labelForFeature`), envolver o botão com `<PaywallGate>`. Zero contagem.
- **(b) quota mensal** — ⚠ **nenhum limite numérico é aplicado hoje** (`structured_per_month:5`, `max_active_projects:1` existem mas não há verificação em runtime). Exigiria construir: campo numérico + helper que conta entries `project_report` do mês (Supabase count com `created_at >= início do mês` + GuestStorage no guest) + abrir `UpgradeSheet` manualmente ao exceder. Preferir (a) salvo requisito explícito.

---

## PONTO 5 — Cooldown / rate-limit

**Não existe mecanismo genérico reutilizável.** Só dois específicos:
- **Anti-abuso do Modo Pressão** (`src/lib/pressure.ts:72-101`): `countPressureActivations(projectId, days)` **deriva de `created_at`** das entries `pressure_session` numa janela; `shouldShowAbuseWarning` = `count >= 5` em 7 dias. Sem storage extra. **É o padrão a copiar.**
- **Cooldown de notificações** (`notifications.ts`): acoplado a `notification_configs` (`silence_until`, `frequency_days`) — não reutilizável.

**Cooldown de 7 dias por `created_at` da `project_report` mais recente: viável e correto, sem storage extra.** `listEntries` já traz tudo; auth vem ordenado desc, **guest não** → usar `Math.max`:
```ts
const COOLDOWN_MS = 7*24*60*60*1000;
function reportCooldown(entries: Entry[]) {
  const reports = entries.filter(e => e.entry_type === 'project_report');
  if (!reports.length) return { blocked:false, nextAvailableAt:null };
  const lastMs = Math.max(...reports.map(e => new Date(e.created_at).getTime()));
  return (Date.now()-lastMs) < COOLDOWN_MS
    ? { blocked:true, nextAvailableAt:new Date(lastMs+COOLDOWN_MS) }
    : { blocked:false, nextAvailableAt:null };
}
```
Funciona idêntico em guest/auth e migra junto com as entries (persistência dual).

---

## PONTO 6 — Vínculo P→A e ciclos completos

**`detectOpenCycles()`** (`src/lib/openCycle.ts:23-82`). Vínculo A→P por **dois mecanismos**:
1. **Explícito `linked_to`** (`:27-35`): `structured_A` **ou** `quick_review` com `linked_to != null` fecha o P cujo `id` = `linked_to`. Campo `Entry.linked_to: string|null` (`database.ts:83`).
2. **Fallback temporal legado** (`:39-51`): APAs **sem** `linked_to` → qualquer APA com `created_at > P.created_at` fecha o P (heurístico; escopado ao projeto porque o array vem de `listEntries`).
Não há vínculo por ordem. Dedup final por `projectId|action.trim().toLowerCase()` (mesma chave de `imv.ts`).

**`src/lib/imv.ts`** (fonte única de "IMV distinto"): `distinctIMVKey(e)` = `` `${project_id}|${action.toLowerCase()||id}` `` (`:16-19`); `distinctIMVs(entries)` = 1 representante (mais recente) por chave (`:26-37`); `countDistinctIMVs` (`:40-46`).

**Não existe função de ciclos COMPLETOS.** Forma correta (combina `closedByLink` de openCycle + `distinctIMVs` de imv.ts):
```ts
import { distinctIMVs } from '@/lib/imv';
function countCompleteCycles(entries: Entry[]): number {
  const closedByLink = new Set(entries
    .filter(e => (e.entry_type==='structured_A'||e.entry_type==='quick_review') && e.linked_to!=null)
    .map(e => e.linked_to as string));
  const aTs = entries.filter(e => e.entry_type==='structured_A' && !e.linked_to)
    .map(e => new Date(e.created_at).getTime());
  return distinctIMVs(entries).filter(p => {
    if (closedByLink.has(p.id)) return true;
    const pt = new Date(p.created_at).getTime();
    return aTs.some(t => t > pt);
  }).length;
}
```
Gradação do relatório: `countCompleteCycles(entries) >= 2`.
⚠ **Ressalva:** `distinctIMVs` mantém o P mais recente; se a IMV foi re-salvada **depois** de já ter APA no P antigo, o `linked_to` aponta pro id antigo (descartado) e o ciclo pode ser subcontado. Para robustez, mapear `linked_to` também pela `distinctIMVKey` do P referenciado. Registrar como nota no PRD.

---

## PONTO 7 — Guest e IA

**Padrão: features de IA NÃO tratam GUEST de forma especial — botão VISÍVEL e HABILITADO, sem aviso de login.**
- `routes/clarity.tsx`: zero referências a `GUEST/authState/userId/login`. Gate é **prontidão de dados** (`canCompose(entries)` → estado `'no_cycle'`), não auth. Usa `listProjects/getProject/listEntries` (roteiam guest internamente).
- `components/help/HelpCenterChat.tsx`: zero gate de auth.
- `AssistantFacilitatorEngine.ts`: chama a Edge Function com `ANON_KEY` fixa (sem token). Só `PAID_TRIGGERS` (`:23-28`: `SUGGESTION_BUTTON_*`, `PRESSURE_DONT_KNOW`) exigem `userIsPaid()` → `null` p/ guest. **`CLARITY_COMPOSER` e `HELP_CENTER_QUERY` NÃO são pagos.**

**Relatório deve seguir:** botão sempre visível/habilitado; gate por prontidão de dados (Ponto 11); se for pago, adicionar o trigger a `PAID_TRIGGERS` (retorna `null` p/ não-pago) **ou** `<PaywallGate>`. Degradação silenciosa no `null`.

---

## PONTO 8 — Timeline: entry_types especiais (`TimelineTab.tsx`)

Não há `switch` único — `renderEntryCard(e,count,inOperationalView)` (`:399`) com cascata de `if`/IIFE. Três mapas no topo governam a exibição:
- `TYPE_ICON` (`:96-108`), `TYPE_LABEL` (`:110-126`), `ENTRY_TYPES` (filtros, `:33-47`), `entryPreview(e)` (`:62-88`).
- Cards especiais: `structured_O` (3R/4D/Alavanca/Recombinação, `:456-602`); `structured_C` (Quadros + causa raiz, `:605-633,768-797`); `structured_P` (execution_plan `:711-734`, action_plan `:799-812`, cost_benefit `:814-833`); `decision_record` (`:835-867`); `quick_review` (`:678-691`); `pressure_session/corrective/inbox` (badges).
- **Fallback genérico** (`:635-639`): `<p>{entryPreview(e)}</p>`.

**Para `project_report` sem quebrar o genérico:** (1) `TYPE_ICON['project_report']`; (2) `TYPE_LABEL['project_report']`; (3) `ENTRY_TYPES` += `{v:'project_report',label:'Relatório'}`; (4) `entryPreview` += `if (e.entry_type==='project_report') return c.summary || '—'`; (5) opcional IIFE de detalhe no expand (molde: cost_benefit `:814-833` — botão abre sheet). **Não registrar nos 3 mapas = chip some** (card ainda renderiza pelo genérico).

---

## PONTO 9 — IndexCalculator: exclusões (`src/engines/IndexCalculator.ts`)

Exclusão atual (`:115-118`) — roda **antes** do guarda de mínimo e de todos os cálculos:
```ts
const entries = allEntries.filter(
  (e) => e.entry_type !== 'inbox' && e.entry_type !== 'decision_record',
);
```
**Adicionar** `&& e.entry_type !== 'project_report'` aqui exclui de clarity/execution/learning/rubrica de uma vez. (Requer `project_report` no union `EntryType` p/ não dar erro TS.)
- Índices: clarity = `pulse`; execution = `distinctIMVs(structured_P)` + `structured_A` + `quick_review×0.7` − penalidade; learning = `principles` (array externo).
⚠ **Outros consumidores que também podem contar `project_report` indevidamente:** `src/hooks/usePanelData.ts`, `TimelineTab.tsx`, `src/lib/projectHealth.ts` (cálculo de estado do projeto). Aplicar exclusão onde fizer sentido.

---

## PONTO 10 — Edge Function de IA (`supabase/functions/assistant-facilitator/index.ts`)

**Contrato:** `POST` `{ trigger: string, context: object }` → `{ suggestion: string|null }`. `verify_jwt=false` (anônimo). Fluxo (`Deno.serve` `:425`): CORS/método → parse (`:436`) → **valida `trigger` contra `VALID_TRIGGERS` Set (`:322-342`)** (senão `{suggestion:null}`) → anonimiza (`:444-449`) → cache 15min (exceto Help) → `callClaude` → `{suggestion}`. Exceção global → `{suggestion:null}`.

**Anonimização** (`anonymize`, `:313-318`): ⚠ **fraca** — só mascara datas (DD/MM/AAAA e ISO) e descarta chaves `user_name`/`project_name`/`user_id`. **Texto livre (nomes em `fact`, `north`) NÃO é anonimizado.**

**API:** Anthropic (NÃO OpenAI). Endpoint `https://api.anthropic.com/v1/messages`; modelo **`claude-haiku-4-5-20251001`** (único p/ todos); `x-api-key: ANTHROPIC_API_KEY`. Sem key → `null`.

**Replicar CLARITY_COMPOSER → PROJECT_REPORT_CONSULTANT (4 edições):**
1. Novo bloco em `TRIGGER_PROMPTS` (Clareza está `:109-148`).
2. Branch no ternário `system` (`:359-380`) — Clareza usa **só** `TRIGGER_PROMPTS['CLARITY_COMPOSER']` (sem `SYSTEM_PROMPT` base). Adicionar `isReportConsultant`.
3. Branches em `timeoutMs` (`:364`) e `max_tokens` (`:391`).
4. Adicionar a `VALID_TRIGGERS` (`:341`).

**Timeout/tokens (servidor):** Clareza 25000ms/1000tok · Report(transfer) 7500/480 · Help 10000/500 · Default 4000/180.
⚠ **Timeout do servidor deve ser > cliente** (senão o cliente aborta antes). Hoje Clareza: servidor 25000, **cliente 10000** → cliente é o limite.

**Maior payload hoje:** `buildPayload` da Clareza (`src/lib/clarityComposer.ts:79-126`), `CompositorPayload` 15 campos curtos. ⚠ **Sem limite/truncamento no código** — o relatório varrendo TODAS as entries será muito maior; **truncar/resumir no builder antes do `JSON.stringify`**.

**Cliente — Padrão A (oficial): `askFacilitator`** (`src/engines/AssistantFacilitatorEngine.ts`): `askFacilitator(trigger, context): Promise<string|null>`. **`fetch` direto** para `FUNCTIONS_URL` hardcoded (`:53`) com `ANON_KEY` (`:54`). Timeout cliente (`:109`): Help 22000 · Clareza 10000 · demais 3000. Erro/timeout → `null` silencioso (nunca erro na UI). Cache 15min (Map, exceto Help). `PAID_TRIGGERS` (`:23-28`) exigem `userIsPaid()`. Clareza chama assim (`clarity.tsx:91`) + `parseResult` (`clarityComposer.ts:178`).

**Cliente — Padrão B (fallback offline): `TransferProofScreen.tsx:150-178`** usa `supabase.functions.invoke(...)` + timeout 8s + **`generateLocalReport()` (fallback local)** mesclado via `parseRemoteReport(suggestion, local)`. **É o padrão a imitar para graceful degradation do relatório.**

**Deploy:** manual — `supabase functions deploy assistant-facilitator --project-ref nvkjzdhpjrbaietwcnmg`. Secrets: `ANTHROPIC_API_KEY` (obrig.), `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` (só Help). ⚠ Adicionar novo trigger = mudança de **código** → **exige redeploy** (o sync de conhecimento não).

---

## PONTO 11 — Modal de confirmação reutilizável

`AlertDialog` (shadcn, `@/components/ui/alert-dialog`). Import canônico: `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle`.

Exemplos verbatim: apagar custo/benefício (`FormatP.tsx:1116-1138`) e regenerar Clareza (`clarity.tsx:441-462`, controlado por `showRegenConfirm`, só abre se há edições).

**Aviso "seria mais completo com a Aferição concluída":** `const [showAferAviso,setShowAferAviso]=useState(false)`; ao clicar em Gerar, se Aferição não concluída (`copaProgress.allDone` / presença de `structured_A`) → `setShowAferAviso(true)` em vez de gerar; `AlertDialogAction` = "Gerar mesmo assim" (prossegue — **orientação, não bloqueio**, padrão do app), `AlertDialogCancel` = "Voltar". Sem wrapper próprio — usar os primitivos.

---

## PONTO 12 — Padrão jsPDF

jsPDF em `exportManual.ts`, `actionPlan.ts`, `sheet.ts`, `transfer.ts`. Deps: `jspdf`+`html2canvas` (dev), `@capacitor/share`, `@capacitor/core`.

**Padrão A (recomendado p/ relatório textual): `src/lib/actionPlan.ts:38-118`** — texto nativo jsPDF (sem html2canvas): `new jsPDF({unit:'pt',format:'a4'})`, `margin=48`, cursor `y` incremental, título 20pt bold, `splitTextToSize(text, pageW-margin*2)` para wrap, pares label(9pt)/valor(12pt).
**Saída (idêntica nas 4 libs, `:100-118`):** mobile → `pdf.output('blob')` + `FileReader.readAsDataURL` + `Share.share({url:dataURL})`; web → `pdf.save(fileName)`. `fileName = 'nome-'+ISO.slice(0,10)+'.pdf'`. `catch` silencioso p/ cancelamento.
⚠ **Sem paginação multi-página** no Padrão A — se o relatório for longo, adicionar antes de cada campo: `if (y > pageH - margin) { pdf.addPage(); y = margin; }` (**não existe** hoje).

**Padrão B (visual/estilizado): `exportManual.ts:9-52`** — `html2canvas(el,{scale:2})` → PNG → `addImage`, 1 página por `.chapter-page`. Usar só se precisar reproduzir estilização da tela.

---

## PONTO 13 — Dashboard: seção de ferramentas (`src/routes/project.$id.dashboard.tsx`)

**Não há "seção de ferramentas" agrupada** — cada ferramenta é uma `<section>` empilhada em `<main className="px-6 py-6 space-y-6 max-w-md mx-auto">` (`:573`), condicional a ter dados:
- Plano de Execução da IMV (`:804-826`), Plano de Ação 5W2H (`:828-848`, `ActionPlanSheet`), Custo/Benefício (`:850-877`, `CostBenefitSheet` readOnly), **Clareza Operacional (`:1225-1249`)**.
- **Clareza é a âncora natural** — gate por prontidão: `composable = canCompose(entries)` (`:392`); botão `Gerar Clareza` → `navigate({to:'/clarity',search:{projectId:id}})` senão texto instrutivo.

**Encaixe do "Gerar relatório consultivo":** nova `<section>` **após a Clareza (`:1249`) e antes do Alerta do motor (`:1251`)**, mesma classe (`rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3`), `<h2 className="text-label ...">`, `<Button size="sm" className="w-full gap-2" onClick={() => navigate({to:'/report',search:{projectId:id}})}>`. Gate opcional por `copaProgress.allDone` (`:359`). **Sem limite visual** de botões — apenas empilham com `space-y-6`.

---

## CHECKLIST DE IMPLEMENTAÇÃO (edições por arquivo)

| Camada | Arquivo | Edição |
|---|---|---|
| Schema | nova migration `supabase/migrations/…_add_project_report.sql` | DROP+ADD constraint com os 15 valores + `project_report` |
| Tipo | `src/types/app.ts:34-44` | `\| 'project_report'` (propaga p/ EntryTypeDB e insertEntry) |
| Persistência | `src/lib/register.ts` | `ProjectReportContent` + `saveProjectReport()` (molde `saveQuickReview` `:636-653`) |
| Índices | `src/engines/IndexCalculator.ts:116-118` | `&& e.entry_type !== 'project_report'` |
| Outros consumidores | `usePanelData.ts`, `TimelineTab.tsx`, `projectHealth.ts` | excluir `project_report` onde não deve contar |
| Timeline | `TimelineTab.tsx` | 3 mapas (`TYPE_ICON`/`TYPE_LABEL`/`ENTRY_TYPES`) + `entryPreview` + IIFE opcional |
| IA (server) | `supabase/functions/assistant-facilitator/index.ts` | `TRIGGER_PROMPTS['PROJECT_REPORT_CONSULTANT']` + branch `system`/`timeoutMs`/`max_tokens` + `VALID_TRIGGERS` → **redeploy** |
| IA (client) | `AssistantFacilitatorEngine.ts` | trigger no union + ternário de timeout; (se pago) em `PAID_TRIGGERS` |
| Builder payload | `src/lib/reportComposer.ts` (novo) | ler entries do projeto + selecionar/**truncar** payload + `parseReport` |
| Cooldown | derivado de `created_at` da `project_report` (sem storage) | helper `reportCooldown(entries)` (`Math.max` p/ guest) |
| Ciclos | `src/lib/cycles.ts` (novo) ou em imv.ts | `countCompleteCycles(entries)` (closedByLink + distinctIMVs) |
| Plano | `planLimits.ts` + `PaywallGate.labelForFeature` | flag booleana `project_report` (ou quota — exige contagem manual) |
| PDF | `src/lib/reportPdf.ts` (novo) | molde `actionPlan.ts` + **adicionar `addPage` guard** |
| Modal | onde ficar o botão | `AlertDialog` "Aferição incompleta" (orientação, não bloqueio) |
| Dashboard | `project.$id.dashboard.tsx:~1249` | nova `<section>` "Gerar relatório consultivo" |
| Rota | `src/routes/report.tsx` (novo) | tela do relatório (molde `clarity.tsx`) |

## ACHADOS ESPONTÂNEOS / ARMADILHAS (para o PRD não ter surpresa)

1. **Discrepâncias CLAUDE.md × código:** campo é `bottleneck` (não `main_bottleneck`); `situational_fit*` não existe em StructuredP; `clarity_session` é `passive`+`kind`, não entry_type; `decision_record` tem interface mas nenhum `save*`.
2. **Limites numéricos de plano NÃO são aplicados hoje** (só booleanos funcionam via `>0`). Quota mensal = construir do zero.
3. **Anonimização da IA é fraca** — só datas; texto livre (nomes) vai cru. Se o relatório enviar muitas entries, isso amplia a exposição — considerar sanitização adicional no builder.
4. **Payload sem limite de tamanho** — o relatório varrendo todas as entries pode estourar latência/custo; truncar/priorizar no builder.
5. **Timeout server > client** — configurar o cliente com folga (ex.: relatório 20-25s cliente, servidor ≥ isso).
6. **Guest não ordena entries** — sempre `Math.max`/sort explícito em lógicas de "mais recente".
7. **Fallback offline** existe só no relatório de transferência (`generateLocalReport`) — replicar esse padrão dá graceful degradation ao relatório consultivo.
8. **Redeploy da Edge Function** é manual e necessário ao adicionar o trigger (o CI só sincroniza conhecimento).
9. **Ressalva `distinctIMVs`+`linked_to`** na contagem de ciclos (re-save após APA pode subcontar) — decidir no PRD se aceita a aproximação.
10. **PDF sem paginação** — adicionar `addPage` guard para relatórios longos.
