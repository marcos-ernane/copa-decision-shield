# CLAUDE.md — App Operador de Precisão — PRD v3.0 Reference

## Princípios Invioláveis

- "O app não organiza tarefas. O app protege decisões."
- "Quem decide é sempre o usuário."
- "O app não é ferramenta de produtividade. É sistema de formação operacional aplicado na realidade."
- **Proibido:** transformar em gerenciador de tarefas, criar chatbot conversacional livre, introduzir gamificação/streaks/rankings, substituir julgamento humano por decisões automáticas, gerar conteúdo motivacional vago sem âncora em dados reais.
- **Obrigatório:** reduzir fricção cognitiva, preservar uso em baixa energia, respeitar tempos operacionais (30s, 90s, 5min, 15min), extensões aditivas — nada das versões anteriores removido.

---

## Stack Técnica

**Frontend (implementado):** React 18 + TypeScript (strict) · Tailwind CSS v3 JIT · shadcn/ui · Zustand v4 · **TanStack Router v1** (NOT React Router — o PRD cita React Router v6 mas a implementação usa TanStack Router v1)

**Backend:** Supabase (Auth + PostgreSQL + Realtime + Storage) · RLS em TODAS as tabelas · Supabase Edge Functions (cron, Stripe webhooks, AssistantFacilitatorEngine)

**IA:** AssistantFacilitatorEngine via Edge Function · Anthropic Claude API (ou OpenAI) · Requisições pontuais — NUNCA streaming conversacional · Cache 15min por contexto · Timeout 3s → null silencioso

**Mobile:** Capacitor v5 · @capacitor/local-notifications · @capacitor/speech · @capacitor/haptics

**Pagamentos:** Stripe · subscriptions + one-time + trial 14 dias

**Exportação:** jsPDF + html2canvas (Manual do Operador, Prova de Transferência)

**Persistência dual:** Supabase (autenticado) + GuestStorage/localStorage (guest) — migração automática ao criar conta.

---

## Schema de Dados (Seção 02)

Todas as tabelas têm `ENABLE ROW LEVEL SECURITY` com policy `USING (auth.uid() = user_id)`.

### profiles (extensão de auth.users)
```
id UUID PK → auth.users
display_name TEXT NOT NULL DEFAULT ''
onboarding_profile TEXT CHECK IN ('sobrecarga','travado','cetico','crise')
onboarding_completed BOOLEAN DEFAULT FALSE
came_from TEXT CHECK IN ('book','course','organic','bundle')
book_anchors_enabled BOOLEAN DEFAULT TRUE
entry_alignment_enabled BOOLEAN DEFAULT TRUE
reading_mode_enabled BOOLEAN DEFAULT FALSE
community_link TEXT
compass_enabled BOOLEAN DEFAULT TRUE          -- v3.0
pact_global_enabled BOOLEAN DEFAULT FALSE     -- v3.0
baseline_completed BOOLEAN DEFAULT FALSE      -- v3.0
treino_principal_id UUID                      -- v3.0
created_at / updated_at TIMESTAMPTZ
```

### projects
```
id UUID PK, user_id UUID FK profiles, name TEXT, north TEXT ("Vai estar melhor quando...")
state TEXT CHECK IN ('new','capturing','organizing','proving','blocked','paused','concluded','archived')
current_bottleneck TEXT, field_reading TEXT, calibrated_action TEXT
current_copa_phase TEXT CHECK IN ('C','O','P','A',NULL)
last_recalled_principle_id UUID
scenario_type TEXT CHECK IN ('fluxo','processo','oferta','relacionamento','pressao')  -- v3.0
current_layer TEXT CHECK IN ('operabilidade','conversao','recorrencia','escala')      -- v3.0
pact_enabled BOOLEAN DEFAULT FALSE           -- v3.0
pact_day_capture INT DEFAULT 1 (0=Dom..6=Sab), pact_day_organize INT DEFAULT 3
pact_day_prove INT DEFAULT 5, pact_day_assess INT DEFAULT 0
pact_started_at TIMESTAMPTZ, pact_last_cycle_at TIMESTAMPTZ
is_treino_principal BOOLEAN DEFAULT FALSE    -- v3.0
created_at, last_entry_at, concluded_at, archived_at, pause_reason
```
Indexes: user_id, state, scenario_type, current_layer.

### entries (todos os tipos de registro)
```
id UUID PK, project_id UUID FK, user_id UUID FK
entry_type TEXT CHECK IN (
  'pulse'             -- <30s: {text, fact_text, interpretation_text, classification, input_method, has_mixed_interpretation}
  'structured_C'      -- {fact_text, interpretation_text, hypothesis_text, imv_possible, photo_urls?: string[]}
  'structured_O'      -- {resources, frictions, main_bottleneck}
  'structured_P'      -- {action, layer_at_entry, reversible, cheap, specific, measurable, metric, deadline,
                      --  cut_rule, situational_fit, situational_fit_response, ethical_check, ethical_check_response,
                      --  execution_plan?: {enabled, phases:[{id,how,who,deadline,status,completed_at,reopen_history}]}}
  'structured_A'      -- {what_happened, why, fact_text, principle_text, decision, repeat_rule,
                      --  cut_rule_next, next_bottleneck, hidden_cost, ai_reformulation_used, ai_reformulation_text}
  'passive'           -- capturado automaticamente
  'corrective'        -- Registro Corretivo
  'copa_session'      -- {capture, blocker_type, proof_action, assessment_signal, assessment_deadline,
                      --  via, entry_alignment_state, book_anchor_shown, scenario_type_at_entry, layer_at_entry}
  'pressure_session'  -- {fact, risk_level, next_step, suggestion_state, used_suggestion,
                      --  reality_check_used, reality_check_response}
  'protocol_5min'     -- v3.0: {scenario_type, fact, friction, micro_action, success_signal}
  'creative_session'  -- v3.0: {alternatives[], selected_alternative, function_question, form_question, criterion}
  'simulation_session'-- v3.0: {scenario_context, scenario_type, layer, fact, friction, imv, metric, principle}
)
content JSONB NOT NULL DEFAULT '{}'
classification TEXT  -- fact | decision | result | doubt (para pulse)
is_clean_fact BOOLEAN DEFAULT TRUE
copa_phase TEXT CHECK IN ('C','O','P','A',NULL)
linked_to UUID REFERENCES entries(id)
edit_history JSONB DEFAULT '[]'
scenario_type_at_entry TEXT CHECK IN ('fluxo','processo','oferta','relacionamento','pressao')  -- v3.0
layer_at_entry TEXT CHECK IN ('operabilidade','conversao','recorrencia','escala')              -- v3.0
ai_assist_used BOOLEAN DEFAULT FALSE
ai_assist_type TEXT  -- 'reformulation'|'metric_clarity'|'apa_support'|'reorientation'|'ethical_check'
created_at TIMESTAMPTZ
```

### principles
```
id UUID PK, project_id UUID FK, user_id UUID FK, apa_entry_id UUID FK entries
content TEXT NOT NULL, tags TEXT[], connections UUID[], versions JSONB, is_archived BOOLEAN
scenario_type TEXT, layer TEXT                -- v3.0
is_master_principle BOOLEAN DEFAULT FALSE     -- v3.0 (revisão mensal)
recall_count INT DEFAULT 0, last_recalled_at TIMESTAMPTZ
created_at / updated_at TIMESTAMPTZ
```

### chapters (Manual do Operador)
```
id UUID PK, project_id UUID FK, user_id UUID FK
north_reached TEXT CHECK IN ('yes','partial','changed')
what_happened TEXT, what_worked TEXT, what_didnt_work TEXT
principles UUID[], restart_note TEXT, final_note TEXT
predominant_scenario_type TEXT, predominant_layer TEXT  -- v3.0
accumulated_imvs INT DEFAULT 0, valid_principles_count INT DEFAULT 0  -- v3.0
discarded_patterns TEXT, evolved_bottleneck TEXT        -- v3.0
created_at TIMESTAMPTZ
```

### baseline_assessments (v3.0)
```
id UUID PK, user_id UUID FK, project_id UUID FK (nullable)
scenario_context TEXT, observable_facts TEXT, existing_resources TEXT
main_frictions TEXT, minimum_intervention TEXT
scores JSONB  -- {observation, resources, diagnosis, creativity, proportionality, pressure, ethics} → 0-5 cada
total_score INT CHECK BETWEEN 0 AND 35
notes TEXT, created_at TIMESTAMPTZ
```

### transfer_proofs (v3.0)
```
id UUID PK, user_id UUID FK
status TEXT CHECK IN ('in_progress','completed')
scenarios JSONB  -- [{scenario_index:1|2|3, context, scenario_type, layer, fact, friction, imv, metric, principle, completed}]
consistency_report TEXT, consistency_score INT (0-100)
final_principle TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
```

### operator_sheets (v3.0)
```
id UUID PK, user_id UUID FK, project_id UUID FK (nullable)
scenario_type TEXT, layer TEXT
fact TEXT, friction TEXT, resource TEXT, imv TEXT, metric TEXT
deadline TIMESTAMPTZ, cut_rule TEXT, principle TEXT
next_bottleneck TEXT, next_action TEXT
mode TEXT DEFAULT 'quick' CHECK IN ('quick','complete')
created_at / updated_at TIMESTAMPTZ
```

### notification_configs
```
id UUID PK, user_id UUID FK, project_id UUID FK (nullable)
notif_type TEXT CHECK IN ('critical','weekly_pulse','personal_invite','pact_reminder')
is_active BOOLEAN, day_of_week INT (0-6), time_hour INT (0-23)
frequency_days INT DEFAULT 3, time_window_start INT DEFAULT 8, time_window_end INT DEFAULT 20
silence_until TIMESTAMPTZ, last_sent_at TIMESTAMPTZ, last_critical_type TEXT
```

### operator_index
```
id UUID PK, user_id UUID UNIQUE FK
clarity_score NUMERIC(5,2), execution_score NUMERIC(5,2), learning_score NUMERIC(5,2)
composite_level TEXT CHECK IN ('starting','developing','operating','solid','precise')
patterns JSONB, qualitative_evolution JSONB
rubric_scores JSONB  -- {observation,resources,diagnosis,creativity,proportionality,pressure,ethics} → 0-5
rubric_total INT DEFAULT 0  -- 0-35
rubric_last_updated TIMESTAMPTZ, last_calculated TIMESTAMPTZ
```

### subscriptions
```
id UUID PK, user_id UUID UNIQUE FK
plan TEXT CHECK IN ('free','trial','annual','lifetime')
stripe_customer_id TEXT, stripe_subscription_id TEXT
trial_ends_at TIMESTAMPTZ, current_period_end TIMESTAMPTZ
source TEXT CHECK IN ('organic','book_code','course_link','bundle')
created_at TIMESTAMPTZ
```

**NOTA:** Comunidade Externa usa apenas `profiles.community_link`. Bússola e Tabela de Fricções são UI estática — sem tabelas próprias.

---

## Autenticação e Onboarding (Seção 03)

### AuthState (types/auth.ts)
```typescript
export type AuthState =
  | 'GUEST'                   // localStorage/Capacitor Preferences
  | 'AUTHENTICATED_FREE'
  | 'AUTHENTICATED_TRIAL'
  | 'AUTHENTICATED_ANNUAL'
  | 'AUTHENTICATED_LIFETIME';
```

**[REQ-AUTH-01]** App funciona sem conta (GuestStorage). NUNCA bloquear por falta de conta.
**[REQ-AUTH-02]** Ao criar conta (Magic Link ou Google OAuth), migrar dados locais para Supabase.
**[REQ-AUTH-03]** 3 nudges de cadastro como `<RegistrationNudge />` bottom-sheet (nunca alert nativo):
1. Primeiro princípio extraído (APA concluída) → "Garanta que ele não se perde..."
2. Primeiro projeto concluído → "Seu primeiro capítulo do Manual está pronto..."
3. 7 dias corridos como guest → "Você está usando o app há 7 dias..."

### Onboarding — 4 Fases
**[REQ-ONB-01]** Só termina quando usuário executa o primeiro registro. *(Era "o primeiro COPA de Bolso"; com o fluxo removido, o onboarding conclui levando ao Registro Estruturado.)*

- **Fase 1 (Reconhecimento):** Tela abertura → Texto "O Espelho" (texto exato obrigatório) → Diagnóstico rápido (4 opções: sobrecarga/travado/cetico/crise) → Nome
- **Fase 2 (Contrato):** O que o app NÃO vai fazer (texto exato obrigatório) · variante para `came_from='course'`
- **Fase 3 (Primeiro Projeto):** Nome + Norte ("Vai estar melhor quando...") + oferta opcional de Linha de Base ([REQ-ONB-02])
- **Fase 4 (Primeira Ação):** ao concluir a Fase 3, navega para `/register/structured` — o operador faz o primeiro registro pelos formatos do método. *(Era um COPA de Bolso guiado, removido junto com o fluxo em rota.)*

**Implementação real:** `OnboardingFlow.tsx` é um componente de fases em estado local (`p1_logo` → `p1_mirror` → `p1_diagnostic` → `p1_name` → `p2_contract`/`p2_course_variant` → `p3_project` → `p3_baseline_offer`), não um conjunto de rotas. Persistência dual: escreve em `profiles` quando há sessão, e sempre em `GuestStorage`.

---

## Navegação Global (Seção 04)

**[REQ-NAV-01]** FABs de **Capturar** e Modo Pressão visíveis em todas as telas (exceto onboarding, fluxos modais fullscreen, Modo Leitura ativo). Máximo 2 toques para ativação. *(Era "FAB de COPA" até a remoção do fluxo em rota — Seção 07.)*
**[REQ-NAV-02]** Bottom Nav nunca esconde ao fazer scroll.
**[REQ-NAV-03]** Ao voltar de qualquer fluxo, retornar ao ponto exato — nunca à Home.
**[REQ-NAV-05]** Bottom Nav: **Início · Painel · Bússola · Diário** (4 abas).

### Rotas Completas (TanStack Router v1)
```
/onboarding (OnboardingShell)
  index → OnboardingMirror
  (fases em estado local, não rotas — ver Onboarding acima)

/ (AppShell)
  index → HomeScreen
  /project/new
  /project/:id (ProjectEntryRouter)
  /project/:id/dashboard
  /project/:id/diagnosis
  /project/:id/edit
  /project/:id/conclude
  /project/:id/sheet          -- v3.0
  /project/:id/pact           -- v3.0
  /project/:id/capacity       -- v3.0
  /project/:id/plan-detail    -- Plano de Execução (REQ-PLANEXEC-26)

  (o grupo /copa foi REMOVIDO — ver Seção 07. A captura rápida é um
   bottom-sheet acionado pelo FAB CAPTURAR, sem rota própria)

  /pressure (PressureShell)
    index → PressureRealityCheck
    /activation · /fact · /risk · /step · /suggestion · /done

  /protocol5 (Protocol5Shell)  -- v3.0
    index → Protocol5Type
    /fact · /friction · /action · /signal · /done

  /register/pulse
  /register/structured
  /register/corrective/:entryId

  /panel
  /panel/index-detail
  /panel/rubric               -- v3.0
  /panel/baseline             -- v3.0
  /panel/transfer             -- v3.0

  /compass (CompassShell)     -- v3.0
    index → CompassHome
    /protocol · /sheet · /guide · /friction
    /maintenance · /simulation · /simulation/:id
    (o Índice por Sintoma NÃO fica aqui — é a aba /diary/symptoms.
     O Protocolo 5 Minutos NÃO fica aqui — é a rota /protocol5 na raiz;
     a Bússola apenas linka para ela, como o FAB também faz)

  /diary (DiaryShell)
    index → TimelineTab
    /principles · /symptoms · /gargalos · /decisoes · /weekly
    /manual · /manual/:chapterId
    (era "/symptom" no singular — a aba é "symptoms". É aqui que vive o
     Índice por Sintoma, não na Bússola)

  /creative (CreativeShell)   -- v3.0
    index → CreativeDiverge
    /function · /converge · /done

  /settings
  /settings/notifications
  /settings/help
  (Plano, Conta, Modo Leitura, Assistente de IA e Bússola NÃO são sub-rotas:
   são seções dentro da própria tela /settings, em SettingsScreen.tsx.
   Só Notificações e Ajuda têm rota própria)

  /reading-mode
  /baseline/new               -- v3.0
```

---

## Tela Inicial e Projetos (Seção 05)

### HomeScreen
Ordenação: `blocked` → `proving` → `capturing/organizing` → `new` → `paused` → `concluded` (colapsado)

**ProjectCard exibe:** ícone de estado + nome + Norte (truncado) + chip de tipo (v3.0) + dias sem registro (se > 5 dias).

```typescript
const STATE_DISPLAY: Record<ProjectState, { icon: string; label: string; color: string }> = {
  new:        { icon: '○', label: 'Novo',        color: 'text-slate-400' },
  capturing:  { icon: '◎', label: 'Capturando',  color: 'text-amber-500' },
  organizing: { icon: '◈', label: 'Organizando', color: 'text-amber-500' },
  proving:    { icon: '▶', label: 'Em teste',    color: 'text-green-600' },
  blocked:    { icon: '  ', label: 'Travado',    color: 'text-red-500'   },
  paused:     { icon: '⏸', label: 'Pausado',     color: 'text-slate-400' },
  concluded:  { icon: '✓', label: 'Concluído',   color: 'text-green-700' },
  archived:   { icon: '□', label: 'Arquivado',   color: 'text-slate-300' },
};
```

**Principle Recall passivo:** projeto `blocked` ou `new` → exibe no máximo 1 princípio relevante abaixo do card. Nunca em `proving`. Nunca como notificação.

### ProjectEntryRouter
```typescript
function determineEntryType(project: Project): 'direct' | 'calibrated' | 'new_cycle' {
  if (!project.last_entry_at) return 'new_cycle';
  const days = daysSince(project.last_entry_at);
  if (days < 7)  return 'direct';     // → ProjectDashboard
  if (days < 14) return 'calibrated'; // → CalibratedReturnScreen
  return 'new_cycle';                 // → DiagnosisFlow completo
}
```

### ProjectDashboard
Seções (ordem obrigatória): nome/Norte/tipo/camada → Onde Estou Agora (fase + barra IMV) → O Que Está Governando (gargalo atual) → Semana do Operador (se pacto ativo) → Meu Histórico → Capacidade Acumulada (v3.0) → Alerta do Motor → Principle Recall → botões [+ REGISTRAR] [ANALISAR]

**[REQ-DASH-01]** Botão "Concluir projeto" APENAS no menu `[•••]`.
**[REQ-DASH-02]** "Semana do Operador" só aparece se `pact_enabled = true`.
**[REQ-DASH-03]** "Capacidade Acumulada" alimentada pelo IndexCalculator.

### Cálculo de Estado (automático)
**[REQ-PROJ-02]** Usuário só altera `paused` e `archived` manualmente. Os demais são calculados:
- `new` → sem entradas
- `capturing` → tem `pulse` ou `structured_C` mas sem IMV definida
- `organizing` → tem `structured_O` mas sem IMV
- `proving` → tem `structured_P` com deadline futuro
- `blocked` → nenhuma entrada há > 7 dias AND não é paused/concluded/archived

---

## Motor de Diagnóstico (Seção 06)

**[REQ-DIAG-01]** Ativado apenas em: onboarding de projeto novo e Tipo C (novo ciclo > 14 dias ou fase concluída).

### DiagnosisFlow — 4 Perguntas
1. **Situação** → sinaliza fase COPA: A=C, B=O, C=P, D=A
2. **Tipo de Cenário** (v3.0) → 5 opções → salvo em `projects.scenario_type`
3. **Camada Operacional** (v3.0) → 4 opções → salvo em `projects.current_layer`
4. **Velocidade** → A=avançou, B=parou, C=recuou, D=pulou etapas

**[REQ-DIAG-02]** Se Q4=D: `gentle_alert` obrigatório: "Você foi direto para ação sem mapear o campo..."

### DiagnosisEngine Interface
```typescript
interface DiagnosisOutput {
  field_reading:     string;       // leitura do estado real
  calibrated_action: string;       // ação para os próximos 15-30min
  gentle_alert:      string | null;
  suggested_format:  'C' | 'O' | 'P' | 'A';
  scenario_type:     ScenarioType | null;
  layer:             OperationalLayer | null;
}
```
Verificações: 1=consistência declaração vs. registros · 2=profundidade fatos/IMVs · 3=tempo na mesma fase · 4=coerência entre projetos · 5=tipo × fase COPA · 6=camada × fase COPA.

**[REQ-DIAG-03]** Engine NUNCA altera `scenario_type` ou `current_layer` automaticamente — apenas sugere reclassificação.

---

## Captura Universal (Seção 07)

> **MUDANÇA DE ARQUITETURA — o COPA de Bolso foi REMOVIDO.**
>
> O fluxo de 4 telas em rota própria (`/copa`, `COPAShell`, `COPAEntryAlignment`,
> `COPACapture`, `COPAOrganize`, `COPAProve`, `COPAAssess`, `COPADone` e
> `src/lib/copa.ts`) não existe mais no código. Decisão de produto: o botão
> CAPTURAR sozinho já resolvia a entrada rápida, e o COPA em rota duplicava o
> que o Registro Estruturado já fazia melhor.
>
> Os arquivos permanecem recuperáveis na branch `fix/imvs-count-dashboard`,
> que guarda o histórico anterior à migração do Lovable.
>
> **Onde o método COPA vive hoje:** nos 4 formatos do Registro Estruturado
> (Seção 09) — Formato C (Captura), O (Organização), P (Prova/IMV) e
> A (Aferição/APA). Nada do método foi perdido; mudou o ponto de entrada.

### O botão CAPTURAR

FAB fixo → abre o `UniversalCaptureSheet` (bottom-sheet), não uma rota.

Registra um pensamento antes que ele se perca, mesmo sem saber ainda a qual
projeto pertence:
- **Com projeto** → cria um Pulso (`entry_type = 'pulse'`).
- **Sem projeto** → vai para o Inbox e fica em espera. Depois o operador decide:
  virar Pulso, abrir no Registro Estruturado (Formato C) ou descartar.

O Inbox nunca bloqueia o fluxo — captura agora, organiza quando fizer sentido.

### O que restou do fluxo antigo

| Item | Situação |
|---|---|
| `entry_type = 'copa_session'` | **legado, somente leitura.** Nada grava mais. Timeline e Painel ainda contam essas entradas para não perder histórico de quem usou o fluxo antigo |
| Entry Alignment [REQ-COPA-00] | a tela não existe mais; sobrou apenas o toggle `entry_alignment_enabled` em Configurações |
| `<SuggestionSheet />` (3 estados) | migrou para o **Modo Pressão** (`PressureNextStep`), única tela que ainda o usa |
| Métrica obrigatória, badges de reversível/específico, camada, campo ético | vivos no **Formato P** (Seção 09) |
| Convite ao Plano de Execução (Tela 3.5) | vive no **Formato P**, após salvar a IMV (Seção 37) |

**[REQ-COPA-03]** Métrica obrigatória na IMV — permanece válido, agora no Formato P.
**[REQ-COPA-04]** Reversível=NÃO → badge laranja. Específico=NÃO → badge amarelo — idem.

---

## Modo Pressão (Seção 08)

Objetivo: próximo passo em 15 minutos. 3 acessos: FAB vermelho · widget · comando de voz.

**[REQ-PRESS-00]** Pressure Reality Check (opcional, nunca bloqueia): "Se nada fosse feito agora, o que de pior aconteceria?" → IA analisa — se vaga: sugere o Registro Estruturado · se urgência real: avança direto.
**[REQ-PRESS-00B]** "Entrar no Modo Pressão mesmo assim" sempre presente e igualmente acessível.
**[REQ-PRESS-00C]** Resposta salva em `reality_check_response`.

**Tela 0 (Ativação, auto-avança 3s):** fundo brand-navy, texto branco: "Respira. Você tem o que precisa para o próximo passo."

**Tela 1 (Fato):** campo sem dica pedagógica, sem sugestão.

**Tela 2 (Risco):** Urgência real → avança direto · Urgência moderada → mensagem 2s depois avança · Pressão de percepção → CalibrateScreen (3 fatos concretos).

**Tela 3 (Próximo Passo):** "Menor ação possível nos próximos 15 minutos" + campo ético opcional (se urgência real, v3.0) + [NÃO SEI → Tela 3B]

**Tela Done:** [Registrar resultado] → PulseRegister · [FECHAR]. *(O botão [ABRIR COPA COMPLETO] saiu junto com o fluxo em rota — Seção 07.)*

**[REQ-PRESS-01]** Após 5 ativações em 7 dias no mesmo projeto: `AbuseWarningScreen` (NUNCA bloqueia).
**[REQ-PRESS-02]** Frase da IA no Anti-Abuso: apenas dados reais do histórico, linguagem operacional.

---

## Sistema de Registro (Seção 09)

**[REQ-REG-01]** Pulso: < 30 segundos do toque até salvo.

### Registro de Pulso
Campo texto/voz + classificação obrigatória: fato observado / decisão / resultado / dúvida
Motor detecta interpretações → badge suave (não bloqueia) [REQ-REG-02]

### Registro Estruturado — 4 Formatos
**Formato C (structured_C):** 4 passos: Quadro 1=fatos observados · Quadro 2=interpretações separadas · Quadro 3=hipóteses testáveis · Passo 4=Fotos de cenário opcionais (até 2 fotos Antes + até 2 fotos Depois, JPEG/PNG/WebP, sem restrição de plano)

**Formato O (structured_O):** Mapa 3R: recursos disponíveis · fricções/obstáculos · gargalo principal

**Formato P (structured_P):** ação + reversível/barato/específico/mensurável + Métrica (OBRIGATÓRIA) + prazo + regra de corte + camada + campo ético opcional + campo `execution_plan` opcional (ver Seção 37). O campo `execution_plan` é adicionado ao `content` JSONB após o convite da Tela 3.5 — não é um novo `entry_type`. [REQ-PLANEXEC-19]

**Formato A (APA — structured_A):** o que aconteceu + por que + **Princípio extraído** (destaque visual: borda cyan, label azul — campo mais importante) + decisão + O que funcionou sem criar dano (v3.0) + repeat_rule + cut_rule_next + next_bottleneck + Fotos de cenário opcionais (até 2 fotos Antes + até 2 fotos Depois, mesmo padrão do Formato C)

**[REQ-REG-04]** Campo princípio extraído: destaque visual especial (borda cyan, label "O aprendizado desta análise:" azul).
**[REQ-REG-05]** IA nunca substitui texto da APA sem ação explícita.

### Registro Corretivo (Zona Vermelha — saída universal)
Referência ao original (exibido, não editável) + "O que estava incorreto" + "O que de fato aconteceu". Original sempre preservado na Linha do Tempo com ícone vinculado.

---

## Painel do Operador (Seção 10)

4 seções scroll vertical. Visão de todos os projetos.

**Seção 1 — Índice do Operador:** 3 rings (Clareza/Execução/Aprendizado 0-100) + nível composto + Rubrica 0-35 (v3.0) com link para `/panel/rubric`

**Seção 2 — Evolução (v3.0):** linha de base inicial vs. mais recente. Se `baseline_completed = false`: convite ao diagnóstico.

**Seção 3 — Visão Geral de Projetos:** lista compacta com tipo/camada + distribuição por tipo e camada (v3.0).

**Seção 4 — Banco de Princípios:** últimos 3 + "Ver banco completo" → `/diary/principles`

**Seção 5 — Padrões do Operador:** [REQ-PANEL-01] atualizado a cada 14 dias pelo PatternEngine. 4 cards: ponto forte · padrão a observar · como evoluiu · bloqueio mais frequente.

**Seção 6 — Evolução Qualitativa:** [REQ-PANEL-02] máximo 2 frases, apenas dados reais, mínimo 5 registros no período. Zero linguagem motivacional.

**Seção 7 — Prova de Transferência (v3.0):** após 3 projetos concluídos ou 10 ciclos COPA. → `/panel/transfer`

---

## Diário e Manual (Seção 11)

**4 abas:** Linha do Tempo · Banco de Princípios · Índice por Sintoma · Relatório Semanal

**Filtros adicionais v3.0 na Timeline:** tipo de cenário · camada operacional · tipo de entry.

**Banco de Princípios — Principle Recall:** [REQ-DIARY-02] threshold 50% relevância. SuggestionEngine usa tipo+camada. Filtros v3.0: `[Todos] [Por tipo ▾] [Por camada ▾] [Princípio mestre ★]`

**Manual do Operador:** lista de ChapterCards (nome + data + badge Norte + tipo + camada predominante). ChapterDetail: Norte original · o que aconteceu · IMVs positivas · IMVs descartadas · padrões descartados · gargalo que evoluiu · princípios extraídos · "Se eu recomeçasse..." · nota final editável.

**Plano de Execução na Timeline:** entradas `structured_P` com `execution_plan.enabled = true` exibem as fases do plano inline no card da Timeline, respeitando todos os filtros existentes (Período, Cenário, Camada, Tipo de Entrada) sem filtros adicionais. [REQ-PLANEXEC-20]

**[REQ-DIARY-01]** Exportação PDF via jsPDF + html2canvas com Capacitor Share API.

---

## Conclusão de Projeto (Seção 12)

Botão "Concluir projeto" APENAS no menu `[•••]` — [REQ-DASH-01].

**4 verificações pré-conclusão** (orienta, não bloqueia): IMV ativa sem APA · APA sem princípio · < 3 registros · sem tipo definido (v3.0)

**Fluxo 3 telas + Celebração:**
1. "O Norte foi alcançado?" (SIM/PARCIALMENTE/NÃO — O NORTE MUDOU) + o que aconteceu
2. "Se eu recomeçasse, o que faria diferente na primeira semana?"
3. Preview do capítulo + [CONFIRMAR E CONCLUIR]
4. Celebração sóbria com dados concretos (X projetos, N princípios, tipo, camada) + [VER MEU MANUAL] [FAZER PROVA DE TRANSFERÊNCIA]

**[REQ-CONCLUDE-01]** Zero texto motivacional genérico. Zero emojis excessivos. Apenas dados reais.

---

## Sistema de Edição (Seção 13)

### Zona Verde (edição livre, sem aviso)
Nome do projeto · Norte (antes da 1ª APA) · texto de pulsos · princípios extraídos · nota final do capítulo · prazo de IMV não-iniciada · configurações de notificação · repeat_rule · cut_rule_next · tipo de cenário · camada operacional

### Zona Amarela (modal com impacto antes de confirmar)
Norte após APA concluída · tipo de bloqueio em Formato O concluído · resultado de IMV com princípio · critérios de IMV em andamento · camada de IMV já executada

### Zona Vermelha (bloqueada — sempre oferece Registro Corretivo)
Data/hora de qualquer registro · fase COPA em registro concluído · conteúdo de Capítulo salvo · classificação de urgência no Modo Pressão · score da Linha de Base após geração do relatório

### Zonas Temporais do Plano de Execução da IMV (extensão da Seção 13 para fases)
**[REQ-PLANEXEC-09]** Fase dentro do prazo → edição livre de Como, Quem e Quando (equivalente Zona Verde).
**[REQ-PLANEXEC-10]** Fase com prazo vencido e não concluída → Como e Quem bloqueados. Único caminho disponível: reabertura do campo Quando.
**[REQ-PLANEXEC-11]** Após reabertura de prazo → fase retorna ao estado "dentro do prazo", campos Como e Quem voltam editáveis.
**[REQ-PLANEXEC-12]** Reabertura apresenta exclusivamente o campo Quando — sem acesso a Como/Quem até nova data ser confirmada.
**[REQ-PLANEXEC-13]** Novo prazo deve ser anterior ao prazo-limite da IMV principal (mesma validação de criação). Se não houver espaço temporal, informa claramente.
**[REQ-PLANEXEC-14]** Toda reabertura registrada em `reopen_history` da fase: prazo anterior, novo prazo, data/hora do ajuste. Histórico interno — não exibido em destaque na UI, disponível para extensão futura do PatternEngine.

---

## Notificações (Seção 14)

**Hierarquia:** Alertas Críticos (sempre ativos) → Pulso Semanal → Lembretes do Pacto (quando ativo) → Convite Pessoal → Modo Silêncio (pausar tudo)

**3 Alertas Críticos** (automáticos, uma única vez por situação):
1. IMV vencendo: prazo < 24h sem APA
2. Padrão de abandono: mesmo ponto de parada de projetos anteriores
3. Projeto inativo: > 14 dias sem registro em projeto ativo

**Lembretes do Pacto (v3.0):** quando `pact_enabled = true` — Seg/Qua/Sex/Dom no horário configurado.
**[REQ-PACT-NOTIF-01]** Lembretes do Pacto substituem notificações genéricas do projeto.
**[REQ-PACT-NOTIF-02]** Tom: convite, nunca cobrança.

**Regras invioláveis:**
- **[REQ-NOTIF-01]** Máximo 1 notificação por dia por usuário.
- **[REQ-NOTIF-02]** Alerta crítico: 1 vez por situação — nunca repetido.
- **[REQ-NOTIF-03]** Tom: convite, nunca cobrança. Zero streak.
- **[REQ-NOTIF-04]** Modo Silêncio: 3 dias / 1 semana / 2 semanas / sem prazo.

---

## Modelo de Negócio / Paywall (Seção 15)

### Planos e Limites
```typescript
const PLAN_LIMITS = {
  free: {
    max_active_projects: 1, structured_per_month: 5, timeline_days: 30, max_principles: 10,
    panel_enabled: false, weekly_report: false, manual_enabled: false,
    cloud_sync: false, pdf_export: false, ai_assist_suggestions: false,
    // v3.0 gratuito:
    baseline_assessments: true, pact_execution: true, operator_sheet_quick: true,
    compass_basic: true, friction_matrix: true, protocol_5min: true,
    simulations: true, // 2 gratuitas
    maintenance_routine: true, diagnostic_guide: true,
    // v3.0 pago:
    operator_sheet_complete: false, compass_full: false,
    creative_flow: false, transfer_proof: false,
    // SEMPRE ILIMITADO (todos os planos):
    copa_unlimited: true, pressure_unlimited: true, pulse_unlimited: true,
    critical_alerts: true, book_anchor_hints: true, entry_alignment: true,
    pressure_reality_check: true, principle_recall: true,
  },
  annual: { /* tudo ilimitado/ativado */ },
  lifetime: { /* idêntico ao annual */ },
  trial: { /* idêntico ao annual — 14 dias */ },
};
```

**[REQ-PLAN-01]** Captura (Pulso/Inbox) e Modo Pressão são SEMPRE ilimitados em todos os planos.
**[REQ-PLAN-02]** Paywall como bottom-sheet contextual — NUNCA full-screen blocker.
**[REQ-PLAN-03]** Paywall NUNCA durante Captura, Registro Estruturado ou Modo Pressão.

### Preços Stripe
- `price_annual_197` → R$ 197/ano
- `price_annual_147_book` → R$ 147/ano (leitor do livro)
- `price_annual_147_course` → R$ 147/ano (aluno do curso)
- `price_lifetime_497` → R$ 497 one-time
- `price_lifetime_397_course` → R$ 397 one-time (aluno do curso)
- Trial: 14 dias sem cartão. Comunicação UMA VEZ no dia 12.

---

## Engines Internas (Seção 16)

### IndexCalculator (src/engines/IndexCalculator.ts)
```typescript
interface OperatorIndex {
  clarity_score: number;    // pulsos is_clean_fact=true / total
  execution_score: number;  // structured_A / structured_P (penalidade delay > 7d)
  learning_score: number;   // min(principles × 5 + uniqueProjects × 10, 100)
  composite: number;
  level: 'starting'|'developing'|'operating'|'solid'|'precise';
  rubric_scores: { observation, resources, diagnosis, creativity, proportionality, pressure, ethics }; // 0-5
  rubric_total: number; // 0-35
}
```
Nunca desce abruptamente. Congela em pausa. Atualizado após cada registro.

### PatternEngine (src/engines/PatternEngine.ts)
```typescript
interface OperatorPattern {
  type: 'strength' | 'watch' | 'evolution' | 'frequent_blocker';
  title: string; description: string; tool_suggestion: string | null;
  scenario_type?: ScenarioType; layer?: OperationalLayer; // v3.0
}
```
Atualizado a cada 14 dias. Máximo 4 padrões. v3.0: identifica tipos/camadas com padrão de dificuldade recorrente. Abandon pattern: > 2 projetos na mesma fase → alerta crítico. Qualitative evolution: máximo 2 frases, mínimo 5 registros.

### SuggestionEngine (src/engines/SuggestionEngine.ts)
[REQ-LAYER-03] Usa tipo + camada + fase COPA como base mínima de contexto. Threshold Principle Recall: 50%.

### AssistantFacilitatorEngine (src/engines/AssistantFacilitatorEngine.ts)
**NUNCA** funciona como chat livre. Apenas em gatilhos listados:
`COPA_CAPTURE_INTERPRETATION` · `COPA_IMV_METRIC_VAGUE` · `COPA_APA_PRINCIPLE_GENERIC` · `COPA_IMV_SITUATIONAL_FIT` · `PRESSURE_ABUSE_PATTERN` · `PRESSURE_REALITY_CHECK` · `SUGGESTION_BUTTON_COPA_PROVE` · `SUGGESTION_BUTTON_COPA_ASSESS` · `SUGGESTION_BUTTON_PRESSURE` · `COPA_RECURRENT_DEVIATION` · `ETHICAL_CHECK_SUPPORT` · `CREATIVE_DIVERGE_SUPPORT`

*Os prefixos `COPA_` são identificadores reais em `AssistantFacilitatorEngine.ts` e na Edge Function — nomeiam a fase do método, não o fluxo em rota removido. **Não renomear**: mudar a string quebra o `switch` do system prompt no servidor.*

Implementação: Edge Function · cache 15min · timeout 3s → null · fallback offline → null. Anonimiza antes de enviar à LLM. System prompt: "Você é um facilitador operacional... Nunca toma decisões. Nunca diz ao usuário o que fazer. Linguagem direta, factual, operacional. Máximo 2 frases."

**[REQ-ETHIC-03]** Nunca ignora custo humano ou sistêmico nas sugestões.

---

## Design System (Seção 17)

### Tokens Tailwind (tailwind.config.ts)
```typescript
colors: {
  brand: {
    navy:  '#1B2A4A', // headers, backgrounds escuros
    blue:  '#2563EB', // CTAs primários, links ativos
    cyan:  '#0EA5E9', // destaque campo APA
    green: '#16A34A', // estado proving, confirmações
    amber: '#D97706', // estado organizing, Zona Amarela
    red:   '#DC2626', // blocked, Modo Pressão, Zona Vermelha
  },
  surface: { 1: '#F1F5F9', 2: '#E2E8F0', 3: '#94A3B8', 4: '#475569' },
  text: { primary: '#0F172A' },
},
fontFamily: { sans: ['Inter','SF Pro Display','system-ui','sans-serif'], mono: ['JetBrains Mono',...] }
```

### Escala Tipográfica
| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| display | 28px | 700 | Títulos de tela, princípio central |
| title | 22px | 700 | Nome do projeto, seções do Painel |
| heading | 17px | 600 | Labels de seção |
| body | 15px | 400 | Conteúdo, descrições |
| small | 13px | 400 | Metadados, datas |
| label | 11px | 600 | Badges, tags, chips de tipo, BookAnchorHints |

### Componentes Globais Críticos (v3.0)
`<VoiceInput />` · `<FABButton />` · `<ProjectStateIcon />` · `<IMVProgressBar />` · `<PrincipleCard />` · `<PaywallGate />` · `<RegistrationNudge />` · `<EditZoneGuard zone='green'|'yellow'|'red' />` · `<SuggestionSheet />` · `<BookAnchorHint />` · `<AIReformulation />` · `<PrincipleRecallPrompt />` · `<QualitativeEvolution />` · `<PressureRealityCheckScreen />` · `<UniversalCaptureSheet />` · `<ScenarioTypeChip />` · `<LayerChip />` · `<BaselineProgressBar />` · `<PactWeekView />` · `<AccumulatedCapacityCard />` · `<FrictionMatrixCell />` · `<OperatorSheetField />` · `<CompassSection />` · `<TransferProofStep />`

*`<EntryAlignmentScreen />` saiu com o COPA em rota (Seção 07); restou só o toggle `entry_alignment_enabled`. `<SuggestionSheet />` hoje é usado apenas pelo Modo Pressão.*

**Componentes do Plano de Execução da IMV (Seção 37):**
`<ExecutionPlanInvite />` · `<ExecutionPlanView />` · `<ExecutionPhaseCard />` · `<ExecutionPhaseForm />` · `<ExecutionProgressBar />`

### Princípios Visuais Invioláveis
1. Mobile first — 375px
2. Uma ação por tela
3. Texto é o produto
4. Estados visuais claros
5. Feedback < 100ms
6. Zero gamificação visual (sem streaks, sem confete excessivo)
7. IA invisível por padrão — sugestões apenas com ação explícita
8. BookAnchorHints são sussurros — 11px, cor surface-3
9. Tipo e Camada são contexto, não destaque
10. Bússola é mapa consultável — nunca interrompe fluxo com sugestões não solicitadas

---

## Requisitos Não-Funcionais (Seção 18)

### Performance
- Time to Interactive: < 2s em 4G
- Captura start: < 500ms (bottom-sheet montado no App Shell)
- Modo Pressão start: < 300ms (montado em background)
- Pulse save: < 200ms (optimistic UI — local first)
- AssistantFacilitatorEngine: < 3s (timeout → null silencioso) [REQ-PERF-01]
- Bússola load: < 300ms (conteúdo estático)

### Offline First
Funciona offline: Captura · Registro Estruturado · Modo Pressão · Pulso · Leitura do Diário · Entry Alignment · Bússola (100%) · Tabela de Fricções · Guia Diagnóstico · Protocolo 5 Minutos · Folha do Operador · Simulações · Linha de Base.
Requer online: Stripe · Magic Link auth · AssistantFacilitatorEngine · Prova de Transferência (relatório IA).

### Segurança
RLS em todas as tabelas · Capacitor SecureStorage para dados sensíveis · Stripe: nunca armazenar cartão · LLM: Edge Function anonimiza antes de enviar.

---

## Comunidade Externa (Seção 19)

O app oferece apenas um link externo configurável (`profiles.community_link`). Sem tabelas próprias.

**[REQ-COMM-01]** Não hospeda chat/fórum. **[REQ-COMM-02]** Não rastreia comportamento na comunidade. **[REQ-COMM-03]** Sem notificações sobre atividade externa. **[REQ-COMM-04]** Link nunca aparece em Captura, Registro Estruturado, Modo Pressão, Onboarding, Conclusão. **[REQ-COMM-05]** Texto obrigatório: "Espaço opcional para troca entre operadores. O uso é voluntário e externo ao app."

Localizações: rodapé da HomeScreen (label 11px, surface-3) + Configurações.

---

## Modo Leitura Passivo (Seção 20)

Ativação via toggle em Configurações. Banner discreto no Bottom Nav quando ativo.

**[REQ-READ-01]** Desativados: botão [+ REGISTRAR] · FABs (substituídos por ícones bloqueados com tooltip) · notificações · métricas · Motor de Diagnóstico.

**[REQ-READ-02]** Permanece acessível: Timeline (somente leitura) · Banco de Princípios (leitura) · Manual do Operador (leitura) · Dashboard (leitura) · conteúdo estático do método · **Bússola completa** · Configurações.

**[REQ-READ-03]** Ao sair: todas as funcionalidades restauradas imediatamente, nenhum dado perdido.

Princípios-base v3.0 adicionados: "Tipo antes de agir" · "Camada antes de planejar" · "Ética antes de escalar"

---

## Glossário (Seção 21)

| Termo | Definição |
|---|---|
| COPA | Captura → Organização → Prova → Aferição |
| IMV | Intervenção de Menor Valor — reversível, barato, específico, mensurável |
| APA | Análise Pós-Ação — resultado de IMV com princípio extraído |
| Norte do Projeto | "Vai estar melhor quando..." |
| Leitura do Campo | Output do DiagnosisEngine |
| Camada 2 | Motor interno invisível ao usuário |
| Tipo de Cenário | Fluxo / Processo / Oferta / Relacionamento / Pressão |
| Camada Operacional | Operabilidade / Conversão / Recorrência / Escala |
| Linha de Base | Diagnóstico 12min + Rubrica 0-35 (7 competências) |
| Rubrica | 7 competências: Observação, Recursos, Diagnóstico, Criatividade, Proporcionalidade, Pressão, Ética |
| Pacto de Execução | Rotina semanal opcional: Seg-Captura, Qua-Organização, Sex-Prova, Dom-Aferição |
| Folha do Operador | Artefato universal: tipo, camada, fato, fricção, recurso, IMV, métrica, prazo, regra de corte, princípio |
| Bússola do Operador | Área central consultável: protocolo, folha, guia diagnóstico, índice por sintoma, fricções, protocolo 5min, manutenção, simulações |
| Tabela de Fricções | Matriz 5×4 (tipo × camada) com fricções típicas |
| Protocolo 5 Minutos | 5 etapas para baixa energia: tipo, fato, fricção, micro-ação, sinal |
| Capacidade Acumulada | IMVs testadas, princípios válidos, padrões descartados, gargalo que evoluiu |
| Ética Operacional | Campo opcional em IMVs/APAs: custo oculto das ações |
| Plano de Execução da IMV | Sub-etapa opcional da Fase [P]: fases com Como/Quem/Quando para orientar a execução de uma IMV entre sua definição e o registro do resultado (APA) |
| Fase do Plano de Execução | Unidade do plano: Como (passo concreto) + Quem (texto livre, opcional) + Quando (prazo anterior ao prazo da IMV) + status pendente/concluída |

---

## Ordem de Desenvolvimento (Seção 22)

23 sprints definidos. Resumo:
- S1=Schema · S2=Auth+Onboarding · S3=Nav+Home+Projetos · S4=COPA *(fluxo em rota, depois removido — Seção 07)* · S5=Pressão · S6=Registro
- S7=DiagnosisEngine · S8=Painel+Diário+Manual · S9=Conclusão · S10=Notificações · S11=Paywall+Stripe
- S12=Comunidade+ModoLeitura · S13=LinhaDeBase · S14=Pacto · S15=Folha+Bússola
- S16=Fricções+Protocolo5min · S17=Manutenção · S18=Criatividade · S19=Simulações
- S20=GuiaDiagnóstico · S21=ProvaTransferência · S22=ÉticaOperacional · S23=Engines finais
- **S24=PlanoExecuçãoIMV** (Seção 37) — pendente de implementação

---

## Tipo de Cenário (Seção 23)

```typescript
type ScenarioType = 'fluxo' | 'processo' | 'oferta' | 'relacionamento' | 'pressao';

const SCENARIO_TYPE_LABELS: Record<ScenarioType, { label: string; description: string; color: string }> = {
  fluxo:          { label: 'Fluxo',          description: 'Movimento de atenção ou demanda', color: 'brand-blue'  },
  processo:       { label: 'Processo',        description: 'Etapas em sequência',             color: 'brand-cyan'  },
  oferta:         { label: 'Oferta',          description: 'Produto, serviço ou decisão',     color: 'brand-green' },
  relacionamento: { label: 'Relacionamento',  description: 'Interação entre pessoas',          color: 'brand-amber' },
  pressao:        { label: 'Pressão',         description: 'Urgência ou risco ativo',          color: 'brand-red'   },
};
```

Pontos de captura: DiagnosisFlow Q2 (obrigatório quando ativado) · NewProjectScreen (obrigatório) · Formato C do Registro Estruturado (opcional) · Dashboard menu `[•••]` (opcional).

**[REQ-TYPE-01]** Todo projeto deve permitir classificação. **[REQ-TYPE-02]** Alteração preserva histórico em `edit_history`. **[REQ-TYPE-03]** Engines usam tipo como variável primária. **[REQ-TYPE-04]** Tipo pré-selecionado como `pressao` no Modo Pressão, mas ajustável.

---

## Camada Operacional (Seção 24)

```typescript
type OperationalLayer = 'operabilidade' | 'conversao' | 'recorrencia' | 'escala';

const LAYER_LABELS: Record<OperationalLayer, { label: string; description: string; color: string }> = {
  operabilidade: { label: 'Operabilidade', description: 'O básico não funciona', color: 'brand-red'   },
  conversao:     { label: 'Conversão',     description: 'Não vira resultado',    color: 'brand-amber' },
  recorrencia:   { label: 'Recorrência',   description: 'Não se repete',          color: 'brand-blue'  },
  escala:        { label: 'Escala',        description: 'Não cresce',             color: 'brand-cyan'  },
};
```

**Triagem de camada:** "Tem movimento?" → NÃO=operabilidade, SIM → "Vira resultado?" → NÃO=conversão, SIM → "Se repete?" → NÃO=recorrência, SIM → "Acompanha demanda maior?" → NÃO=escala, SIM → undefined.

Combinações diagnóstico (exemplos): Fluxo+Conversão · Processo+Operabilidade · Oferta+Recorrência · Relacionamento+Conversão · Pressão+Escala.

**[REQ-LAYER-01]** Toda IMV vinculada a uma camada. **[REQ-LAYER-02]** Revisão preserva histórico. **[REQ-LAYER-03]** DiagnosisEngine cruza camada + fase + tipo. **[REQ-LAYER-04]** Painel exibe distribuição por camada. **[REQ-LAYER-05]** Manual registra camada predominante por capítulo.

---

## Linha de Base e Rubrica (Seção 25)

**Fluxo BaselineAssessmentFlow (7 telas):**
1. Escolha do cenário (2-200 chars)
2. 5 fatos observáveis (sem interpretação)
3. Recursos existentes
4. 3 fricções principais
5. IMV inicial
6. Rubrica: 7 competências × 0-5 = total 0-35
   - Observação · Inventário de Recursos · Diagnóstico · Criatividade Funcional · Proporcionalidade · Pressão · Ética Operacional
7. Resultado: radar chart + mais forte + para desenvolver

**[REQ-BASE-01]** Fluxo formal oferecido na entrada do sistema. **[REQ-BASE-02]** Rubrica persistida e comparável. **[REQ-BASE-03]** Exibida sem gamificação. **[REQ-BASE-04]** 100% voluntária. **[REQ-BASE-05]** Completo → `profiles.baseline_completed = true`.

---

## Pacto de Execução Semanal (Seção 26)

```typescript
type WeeklyCycle = {
  capture:  WeeklyCycleDay; // default: Segunda (1)
  organize: WeeklyCycleDay; // default: Quarta (3)
  prove:    WeeklyCycleDay; // default: Sexta (5)
  assess:   WeeklyCycleDay; // default: Domingo (0)
};
```

**Ativação:** menu `[•••]` no ProjectDashboard → PactSetupScreen. Dias/horários personalizáveis.

**Visualização no Dashboard:** ícones ✔/○ por fase. ✔ → toca para ver registro. ○ → toca para abrir formato correspondente.

**[REQ-PACT-01]** Ativável por projeto ou globalmente. **[REQ-PACT-02]** Totalmente opcional e silencioso. **[REQ-PACT-03]** App celebra retorno — nunca pune interrupção. **[REQ-PACT-04]** Lembretes do Pacto substituem notificações genéricas. **[REQ-PACT-05]** Desativável sem perda de dados.

---

## Folha do Operador (Seção 27)

Artefato universal do método em uma tela. 2 modos: Rápido (< 3min, campos obrigatórios) · Completo (até 15min, todos os campos).

```typescript
interface OperatorSheet {
  scenario_type: ScenarioType | null; layer: OperationalLayer | null;
  fact: string; friction: string; resource: string;   // Diagnóstico
  imv: string; metric: string; deadline: Date | null; cut_rule: string; // Ação
  principle: string; next_bottleneck: string; next_action: string; // Consolidação
  project_id: string | null; mode: 'quick' | 'complete';
}
```

**Pontos de acesso:** Bússola · ProjectDashboard menu `[•••]` · Modo Leitura (somente leitura) · `/project/:id/sheet` · `/compass/sheet`

**[REQ-SHEET-01]** < 3min no modo rápido. **[REQ-SHEET-03]** Vinculável ou independente. **[REQ-SHEET-04]** Histórico de folhas na Bússola. **[REQ-SHEET-05]** Exportável como imagem via Capacitor Share.

---

## Bússola do Operador (Seção 28)

3ª aba do Bottom Nav. Área consultável permanente, 100% offline.

**Subseções obrigatórias:** Protocolo de Bolso · Folha do Operador · Guia Diagnóstico · Índice por Sintoma · Tabela de Fricções · Protocolo 5 Minutos · Rotina de Manutenção · Simulações do Operador

**Protocolo de Bolso:** 6 passos (nomeie tipo → localize camada → escreva fato limpo → nomeie fricção → defina IMV → registre resultado) + critérios de boa operação.

**[REQ-BUSSOLA-01]** Máximo 2 toques. **[REQ-BUSSOLA-02]** 100% offline. **[REQ-BUSSOLA-03]** Conteúdo do método, não métricas do usuário. **[REQ-BUSSOLA-04]** Acessível no Modo Leitura. **[REQ-BUSSOLA-05]** Não interrompe fluxos ativos.

---

## Tabela de Fricções (Seção 29)

Matriz 5×4 (tipo × camada). Conteúdo estático pré-carregado. Cada célula contém 2-4 fricções típicas.
Células completas definidas para: Fluxo/Processo/Oferta/Relacionamento/Pressão × Operabilidade/Conversão/Recorrência/Escala.

Botão ao final: "[Identificou uma fricção? Registrar]" → abre o Registro Estruturado com tipo e camada pré-selecionados.

**[REQ-FRICTION-01]** Navegável em < 5 segundos. **[REQ-FRICTION-02]** Máximo 2 toques da Home (via Bússola). **[REQ-FRICTION-03]** 100% offline. **[REQ-FRICTION-04]** Salto direto para o Registro Estruturado com tipo+camada pré-configurados.

---

## Protocolo de 5 Minutos (Seção 30)

Para dias de baixa energia. 5 etapas:
1. Nomeie o Tipo (5 chips)
2. Escreva 1 fato limpo (texto/voz)
3. Identifique a fricção + acesso opcional à Tabela
4. Micro-ação nas próximas 2 horas
5. Sinal mínimo de sucesso

Salvo como `entry_type = 'protocol_5min'`. Ícone diferenciado na Timeline.

**[REQ-LOWENERGY-01]** Executável em < 60 segundos. **[REQ-LOWENERGY-02]** Sempre oferece transição para o Registro Estruturado completo. **[REQ-LOWENERGY-03]** 100% offline. **[REQ-LOWENERGY-04]** Campo de fricção com acesso opcional à Tabela sem interromper o fluxo.

---

## Rotina de Manutenção (Seção 31)

Acessível pela Bússola. 3 níveis:

**Semanal (5min):** domingos após Aferição. Verificar: princípios da semana · projetos travados > 7 dias · tipo/camada do projeto principal ainda fazem sentido · maior aprendizado da semana.

**Quinzenal (10min):** princípios duplicados/superados · conexões entre princípios · padrão a observar nas próximas 2 semanas.

**Mensal (15min):** projetos pausados (retomar/arquivar) · reclassificar tipo/camada · eliminar princípios redundantes · consolidar 1 **princípio mestre** (`is_master_principle = true`) · comparar linha de base.

**[REQ-MAINT-01]** Consultável e executável na Bússola. **[REQ-MAINT-02]** Cada etapa tem botão "Pular" visível. **[REQ-MAINT-03]** Revisão mensal gera princípio mestre. **[REQ-MAINT-04]** Revisões concluídas como metadado com campo opcional.

---

## Prova de Transferência (Seção 32)

3 cenários distintos × 6 linhas cada. Tempo estimado: 15-20 minutos.

**Por cenário:** contexto (1-3 frases) + tipo + camada + fato (1 frase) + fricção (1 frase) + IMV (1 frase) + métrica.

**Após 3 cenários:** princípio final (o que atravessa os 3 cenários).

**Relatório de Consistência** (AssistantFacilitatorEngine): consistência de tipo/camada · especificidade de fato · qualidade de IMV · conexão do princípio final. Escala 0-100. Linguagem factual sem aprovação/reprovação.

**[REQ-TRANSFER-01]** 3 cenários × 6 linhas. **[REQ-TRANSFER-02]** Mede autonomia operacional, não acerto. **[REQ-TRANSFER-03]** Linguagem factual. **[REQ-TRANSFER-04]** Princípio final salvável no Banco. **[REQ-TRANSFER-05]** Requer plano pago.

---

## Criatividade Funcional Guiada (Seção 33)

Fluxo para excesso de opções. Não é brainstorming livre — é divergência disciplinada.

**3 etapas:**
1. **Divergir:** "Que função precisa ser realizada?" + gerar até 3 alternativas com o que já existe
2. **Função antes da Forma:** cada alternativa cumpre a função? (Sim/Parcialmente/Não)
3. **Convergir com Critério:** pontuar cada alternativa: Operabilidade (1-3) + Impacto (1-3) + Testabilidade (1-3) = X/9 → [TRANSFORMAR EM IMV]

**Ativação:** Formato O quando bloqueio = "Excesso de opções" · Bússola · `/creative`

**[REQ-CREATIVE-01]** Fluxo opcional para excesso de opções. **[REQ-CREATIVE-02]** Acessível do Formato O e da Bússola. **[REQ-CREATIVE-03]** Conversão direta para IMV ao final. **[REQ-CREATIVE-04]** Requer plano pago. **[REQ-CREATIVE-05]** AssistantFacilitatorEngine no gatilho `CREATIVE_DIVERGE_SUPPORT`.

---

## Simulações do Operador (Seção 34)

Mínimo 5 simulações pré-construídas (conteúdo estático):

| Simulação | Tipo | Camada | Contexto |
|---|---|---|---|
| A loja de acessórios automotivos | Fluxo | Conversão | Movimento existe, não fecha venda |
| A pista de caminhada | Relacionamento | Operabilidade | Usuários sem hábito |
| A fábrica pequena | Processo | Operabilidade | Gargalo oculto na produção |
| O serviço de entrega rápida | Oferta | Conversão | Proposta clara, clientes não aderem |
| A semana que não fecha | Pressão | Operabilidade | Urgências sem critério |

**Estrutura por simulação (4 telas):** contexto + 5 fatos limpos · Operador de Referência aplica método (tipo+camada+Mapa3R+IMV) · Resultado+Princípio · "Agora é você" → abre o Registro Estruturado pré-configurado.

**[REQ-SIM-01]** Mínimo 5 simulações cobrindo 5 tipos. **[REQ-SIM-02]** Cada uma inclui contexto, método, resultado+princípio, convite à aplicação. **[REQ-SIM-03]** 100% offline. **[REQ-SIM-04]** 2 gratuitas, demais pagas. **[REQ-SIM-05]** Personagem: "O Operador de Referência" — sem nome/identidade visual marcante.

---

## Guia Diagnóstico (Seção 35)

Percurso interativo de 5 passos. 2 modos: Guiado (interação sequencial) · Referência (checklist).

**5 passos:**
1. Nomeie o Tipo (5 chips)
2. Localize a Camada (triagem da Seção 24.3)
3. Descreva o Fato (verificação automática: "acho que" → badge · número/observável → ✓)
4. Localize a Fricção (campo livre + acesso à Tabela de Fricções)
5. Defina a IMV → [Criar IMV formal no Formato P] ou [Salvar como nota diagnóstica]

Ao final do Modo Guiado: salvar como `structured_C` ou criar Folha do Operador.

**[REQ-DIAGGUIDE-01]** Bússola em ≤ 2 toques. **[REQ-DIAGGUIDE-02]** 100% offline. **[REQ-DIAGGUIDE-03]** Transição para Registro Estruturado / Folha / nota diagnóstica. **[REQ-DIAGGUIDE-04]** Triagem de camada segue Seção 24.3.

---

## Ética Operacional (Seção 36)

Pergunta central: "Isso resolve sem destruir? Quem paga o custo oculto?"

**No Formato P (IMV):** campo opcional visível (não escondido): "Quem pode pagar o custo oculto desta ação?" → salvo em `content.ethical_check`

**No Formato A (APA):** "O que funcionou sem criar dano" → salvo em `content.hidden_cost`

**No Modo Pressão (urgência real):** "A pressa aqui pode quebrar algo importante?" → salvo em `content`

**BookAnchorHint ético:** "Isso resolve sem destruir?" — princípio ético do COPA, Módulo Base do livro.

**[REQ-ETHIC-01]** Toda IMV deve permitir checagem ética opcional. **[REQ-ETHIC-02]** Toda APA pode registrar custo oculto. **[REQ-ETHIC-03]** AssistantFacilitatorEngine nunca ignora custo humano/sistêmico. **[REQ-ETHIC-04]** Campos éticos sempre opcionais. **[REQ-ETHIC-05]** Rastreado no KPI Ethical Check Fill Rate.

---

## Estado Atual da Implementação

### Implementado (Sprints concluídos)
- **Seções 01-04:** Stack, Schema completo, Auth (cadastro tardio), Onboarding 4 fases, Navegação global com TanStack Router v1, GuestStorage + migração
- **Seção 05:** HomeScreen com ProjectCard, NewProjectScreen, ProjectEntryRouter, ProjectDashboard com Capacidade Acumulada
- **Seção 06:** DiagnosisFlow (4 perguntas incluindo tipo e camada), DiagnosisEngine com verificações 5 e 6
- **Seção 07:** Captura Universal (bottom-sheet do FAB CAPTURAR → Pulso/Inbox). O COPA de Bolso em rota foi **removido**; o método vive nos 4 formatos do Registro Estruturado
- **Seção 08:** Modo Pressão (PressureSession) com Reality Check, AbuseWarningScreen
- **Seção 09:** Sistema de Registro — Pulso + 4 formatos estruturados (FormatC/O/P/A) + Registro Corretivo
- **Seção 10:** Painel do Operador (OperatorPanel) com Índice, Evolução de Linha de Base, Rubrica, Padrões
- **Seção 11:** Diário (Timeline + Banco de Princípios) + Manual do Operador
- **Seção 12:** Conclusão de Projeto com 4 verificações e capítulo gerado
- **Seção 15:** Paywall/Trial implementado (`src/lib/trial.ts`, `src/lib/planLimits.ts`)
- **Seção 16:** Engines — `IndexCalculator.ts`, `PatternEngine.ts`, `DiagnosisEngine.ts`, `SuggestionEngine.ts`, `AssistantFacilitatorEngine.ts`
- **Seção 17:** Design System (tokens Tailwind implementados)
- **Seção 23:** ScenarioType — chips, detecção e `SCENARIO_TYPE_LABELS`
- **Seção 24:** OperationalLayer — chips e `LAYER_LABELS`
- **Seção 25:** BaselineAssessmentFlow, `src/lib/baseline.ts`, histórico no Painel (`/panel/baseline`, `/panel/rubric`)
- **Parcial — Seção 28:** CompassShell com subseções básicas (rotas existem em `src/routes/compass.*`)
- **Parcial — Seção 29:** `compass.friction.tsx` existe
- **Parcial — Seção 30:** `protocol5.tsx` existe
- **Parcial — Seção 31:** `compass.maintenance.tsx` existe
- **Parcial — Seção 32:** `panel.transfer.tsx` existe (placeholder), `src/lib/transfer.ts` existe
- **Parcial — Seção 33:** `creative.tsx` existe, `src/lib/creative.ts` existe
- **Parcial — Seção 34:** `compass.simulations.tsx` existe

- **Seção 38:** Análise de Custo/Benefício — **implementado (PRD-CB-01)**
  - Tipos: `CostItem`, `BenefitItem`, `CostBenefitRelacao`, `CostBenefitData` em `src/lib/register.ts`
  - Lib: `src/lib/costBenefit.ts` (cálculos, formatação, cores)
  - Componente: `src/components/register/CostBenefitSheet.tsx` (bottom-sheet, help screen, readOnly mode)
  - Integrado em: `src/components/register/FormatP.tsx` (botão pós chip-barato, AlertDialog, spread condicional)
  - Leitura no Dashboard: `src/routes/project.$id.dashboard.tsx` (seção "Custo / Benefício", readOnly)
  - Editável na Timeline: `src/components/diary/TimelineTab.tsx` (botão + `updateEntryCostBenefit`)

### Pendente / Incompleto
- **Seção 37:** Plano de Execução da IMV — **pendente de implementação (S24)**
  - Tipos: `ExecutionPhase`, `ExecutionPlan` em `src/types/`
  - Lib: `src/lib/executionPlan.ts`
  - Componentes: `ExecutionPlanInvite`, `ExecutionPlanView`, `ExecutionPhaseCard`, `ExecutionPhaseForm`, `ExecutionProgressBar` em `src/components/copa/` e `src/components/project/`
  - Rota: `src/routes/project.$id.plan-detail.tsx`
  - Arquivos tocados: `src/lib/register.ts` (StructuredPContent), `src/components/register/FormatP.tsx` (convite pós-save), `src/routes/project.$id.dashboard.tsx` (indicador), `src/components/project/ProjectCard.tsx` (indicador), `src/components/diary/TimelineTab.tsx` (fases inline)
- **Seção 13:** Sistema de Edição 3 Zonas — `<EditZoneGuard />` pode estar parcial
- **Seção 14:** Notificações push — configuração existe, lembretes do Pacto pendentes
- **Seção 19:** Comunidade Externa — campo `community_link` no schema, UI pode estar pendente
- **Seção 20:** Modo Leitura — rota existe (`reading-mode.tsx`), completude incerta
- **Seção 26:** Pacto de Execução Semanal — `src/lib/pact.ts` e rotas existem, integração completa pendente
- **Seção 27:** Folha do Operador — `src/lib/sheet.ts` e rotas existem, completude incerta
- **Seção 28:** Bússola — estrutura existe, conteúdo completo pendente (protocolo de bolso, guia diagnóstico)
- **Seção 32:** Prova de Transferência — placeholder, relatório de consistência por IA pendente
- **Seção 35:** Guia Diagnóstico — `compass.guide.tsx` existe, fluxo interativo completo pendente
- **Seção 36:** Ética Operacional — campos éticos podem estar implementados nos formulários, auditoria completa pendente

---

## Plano de Execução da IMV (Seção 37)

Sub-etapa opcional do Formato P (IMV) do Registro Estruturado. Orienta o operador sobre *como* avançar a execução de uma IMV já calibrada, entre sua definição e o registro do resultado (APA). Não é um gerenciador de tarefas — é vinculada a uma única IMV e não se repete em outros canais.

**Princípios de design (extensão dos Princípios Invioláveis):**
- Opcionalidade explícita — nunca obrigatória, segue padrão do Entry Alignment [REQ-COPA-00]
- A IMV não se duplica — o campo "Como" de cada fase descreve *como* executar, nunca *o quê* (já definido na IMV, exibido como cabeçalho fixo)
- Proporcionalidade — campo "Como" limitado a 80-120 caracteres recomendados
- Escopo único — exclusivo do Formato P do Registro Estruturado; Modo Pressão e Protocolo 5min não recebem esta sub-etapa
- Hierarquia de prazos — prazo da IMV é soberano; nenhuma fase pode ter prazo igual ou posterior
- Sem colaboração — "Quem" é texto livre informativo, sem convite, conta ou notificação a terceiros

### 37.1 Gatilho de Ativação

**[REQ-PLANEXEC-01]** Imediatamente após salvar a IMV no Formato P, exibe convite opcional:
> "Quer planejar como vai executar isso?"
> [PLANEJAR EXECUÇÃO] · [PULAR]

**[REQ-PLANEXEC-02]** Pular não altera nenhum comportamento existente. Não bloqueia a navegação para Tela 4.

**[REQ-PLANEXEC-03]** Convite exibido uma única vez por IMV. Não repetido em visitas posteriores se o usuário pulou.

### 37.2 Estrutura de uma Fase

**[REQ-PLANEXEC-04]** Cada fase contém:

| Campo | Descrição | Editabilidade |
|---|---|---|
| **IMV (cabeçalho fixo)** | Texto da ação da IMV (não editável aqui — segue regras da Seção 13) | Somente leitura |
| **Como** | Passo concreto desta fase — frase curta, 80-120 chars recomendados | Zona Verde / bloqueado se vencida |
| **Quem** | Responsável. Texto livre, opcional. Sem conta ou notificação | Zona Verde / bloqueado se vencida |
| **Quando** | Prazo da fase — obrigatoriamente anterior ao prazo-limite da IMV | Zona Verde; reabertura se vencida |

**[REQ-PLANEXEC-05]** Sem limite rígido de quantidade de fases no MVP.

**[REQ-PLANEXEC-06]** Status inicial: `pendente`. Passa a `concluída` exclusivamente por marcação explícita do usuário. Vencimento de prazo **nunca** altera status automaticamente.

### 37.3 Validação de Prazo

**[REQ-PLANEXEC-07]** Na criação ou edição do campo "Quando": validação em tempo real que a data é anterior ao prazo-limite da IMV. Se falhar: campo não salvo + mensagem clara (ex.: "O prazo desta etapa deve ser anterior ao prazo final da IMV: [data]").

**[REQ-PLANEXEC-08]** A mesma validação se aplica na reabertura de prazo de fase vencida.

### 37.4 Zonas de Edição por Estado Temporal (ver também Seção 13)

**[REQ-PLANEXEC-09]** Fase dentro do prazo → Como, Quem e Quando editáveis livremente (Zona Verde).

**[REQ-PLANEXEC-10]** Fase vencida não concluída → Como e Quem bloqueados. Único caminho: reabertura do Quando.

**[REQ-PLANEXEC-11]** Após reabertura → fase retorna a "dentro do prazo", Como e Quem voltam editáveis.

### 37.5 Reabertura de Prazo (Fase Vencida)

**[REQ-PLANEXEC-12]** Ao tentar editar fase vencida: apresenta exclusivamente opção de ajustar o campo Quando.

**[REQ-PLANEXEC-13]** Novo prazo validado conforme [REQ-PLANEXEC-07]. Se IMV próxima do vencimento sem espaço temporal, informa claramente ao usuário.

**[REQ-PLANEXEC-14]** Toda reabertura registrada em `reopen_history` da fase: `{ previous_deadline, new_deadline, changed_at }`. Histórico interno — não exibido em destaque na UI, persistido para extensão futura do PatternEngine.

### 37.6 Hierarquia de Avisos de Prazo

**[REQ-PLANEXEC-15]** Máximo 1 aviso de prazo por vez na tela do projeto, por ordem de prioridade:
1. IMV vencida — usa fluxo de aviso já existente. Prioridade máxima.
2. Fase do plano de execução vencida — exibido apenas se IMV principal ainda no prazo.
3. Nenhum aviso — quando não há pendência.

**[REQ-PLANEXEC-16]** Aviso visual na tela do projeto, sem nova notificação push. Coerente com [REQ-NOTIF-02].

### 37.7 Ajuda Contextual por Fase

**[REQ-PLANEXEC-17]** Cada fase exibe botão/ícone de ajuda com orientação sobre o propósito daquela fase no plano de execução (não sobre o método COPA em geral).

**[REQ-PLANEXEC-18]** Implementação visual preferida: `<BookAnchorHint />` estático (11px), por ser instrucional/estática e mais barato de implementar. Segue o princípio "IA invisível por padrão".

### 37.8 Integração com o Diário

**[REQ-PLANEXEC-19]** As fases NÃO geram novo `entry_type`. São persistidas dentro do `content` da entry `structured_P` existente, no campo `execution_plan`.

**[REQ-PLANEXEC-20]** Fases exibidas na Timeline como parte do card da entry `structured_P` à qual pertencem, respeitando os filtros existentes (Período, Cenário, Camada, Tipo de Entrada) sem filtros adicionais.

### 37.9 Indicador "Execução da IMV"

**[REQ-PLANEXEC-21]** Novo indicador visual no ProjectCard (HomeScreen) e no ProjectDashboard, complementar ao `<IMVProgressBar />` existente.

**[REQ-PLANEXEC-22]** Label: **"Execução da IMV"**.

**[REQ-PLANEXEC-23]** Cálculo:
```
progresso = fases_concluidas (status = 'concluída') / total_de_fases_da_imv_ativa
```
Vencimento de prazo nunca incrementa este contador.

**[REQ-PLANEXEC-24]** Estados visuais (paleta Seção 17):
| Situação | Cor | Token |
|---|---|---|
| Avanço saudável, sem pendência | Verde / Azul | `brand-green` / `brand-blue` |
| Existe fase vencida, IMV no prazo | Âmbar | `brand-amber` |
| IMV principal vencida | Vermelho | `brand-red` |

**[REQ-PLANEXEC-25]** Indicador exibido APENAS quando `execution_plan.enabled = true`. Se o usuário pulou o convite, indicador simplesmente não aparece — nunca vazio ou zerado.

**[REQ-PLANEXEC-26]** Tela de memória de cálculo em `/project/:id/plan-detail`: quantas fases existem, concluídas, vencidas e significado de cada cor. Padrão visual de `/panel/index-detail`.

### 37.10 Navegação

**[REQ-PLANEXEC-27]** Toda tela do fluxo (criação de fase, edição, ajuda, reabertura, memória de cálculo) exibe botão "Voltar" no canto superior esquerdo, padrão visual já estabelecido no app.

**[REQ-PLANEXEC-28]** Botão "Voltar" retorna à tela anterior imediata — nunca à Home, nunca direto ao Dashboard. Conforme [REQ-NAV-03].

### 37.11 Persistência e Modelo de Dados

**[REQ-PLANEXEC-29]** Persistência dual Supabase/GuestStorage, igual ao restante do app. Migração automática ao criar conta.

```typescript
interface ExecutionPhase {
  id: string;
  how: string;                    // Como — passo concreto
  who: string | null;             // Quem — texto livre, opcional
  deadline: string;               // Quando — ISO, anterior ao deadline da IMV
  status: 'pendente' | 'concluída';
  completed_at: string | null;
  reopen_history: Array<{
    previous_deadline: string;
    new_deadline: string;
    changed_at: string;
  }>;
}

interface ExecutionPlan {
  enabled: boolean;
  phases: ExecutionPhase[];
}

// Adicionado ao StructuredPContent existente (src/lib/register.ts):
// execution_plan?: ExecutionPlan
```

### 37.12 Fora de Escopo (Explicitamente)

- Notificação a terceiros referenciados em "Quem"
- Expansão para Modo Pressão ou Protocolo 5min
- Novo `entry_type` — as fases vivem dentro de `structured_P`
- Análise automática de padrões de reabertura pelo PatternEngine (dados persistidos para uso futuro)
- Limite rígido de quantidade de fases

---

## Análise de Custo/Benefício (Seção 38)

Sub-etapa opcional do Formato P (IMV) do Registro Estruturado. Permite ao operador registrar e calcular a relação entre custos e benefícios de uma IMV que marcou o campo "Reversível" como **NÃO** (campo `cheap = false`).

**Princípios de design:**
- Totalmente opcional — nunca obrigatória para salvar a IMV
- Ativada apenas via botão explícito — o sheet nunca abre automaticamente
- Campo `cheap`, componente `YesNo` e chip laranja existentes NÃO foram alterados — o botão é adicionado após o chip
- Dados persistidos no campo JSONB `cost_benefit` dentro do `content` da entry `structured_P` — sem nova tabela SQL
- Plano pago não é exigido — disponível em todos os planos

### 38.1 Gatilho de Ativação

**[REQ-CB-01]** O botão "Analisar custo/benefício →" (ícone `BarChart2`) aparece SOMENTE quando `cheap === false` (IMV não reversível).

**[REQ-CB-02]** Clicar no botão abre o `CostBenefitSheet` (bottom-sheet). Não abre automaticamente.

**[REQ-CB-03]** Se o usuário muda `cheap` de NÃO para SIM enquanto já existe análise salva, exibe `AlertDialog` de confirmação antes de apagar os dados.

**[REQ-CB-04]** Ao salvar a IMV (`performSave`), os dados de custo/benefício são incluídos no `content` como `cost_benefit` (spread condicional — só inclui se existir análise).

### 38.2 Estrutura de Custos

**[REQ-CB-05]** Cada custo (`CostItem`) contém:
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID gerado na criação |
| `nome` | string | Nome do custo (texto livre) |
| `valor` | number | Valor monetário em R$ (≥ 0) |
| `grau` | 1 \| 2 \| 3 \| 4 \| 5 | Grau de impacto (1=muito baixo, 5=muito alto) |

**[REQ-CB-06]** Cores do grau de custo:
- Grau 1-2 → `brand-green` (custo baixo = positivo)
- Grau 3 → `brand-amber` (custo moderado)
- Grau 4-5 → `brand-red` (custo alto = negativo)

### 38.3 Estrutura de Benefícios

**[REQ-CB-07]** Cada benefício (`BenefitItem`) contém:
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID gerado na criação |
| `descricao` | string | Descrição do benefício (texto livre) |
| `grau` | 1 \| 2 \| 3 \| 4 \| 5 | Grau de impacto esperado (1=muito baixo, 5=muito alto) |

**[REQ-CB-08]** Cores do grau de benefício (escala invertida em relação ao custo):
- Grau 1-2 → `brand-red` (benefício baixo = negativo)
- Grau 3 → `brand-amber` (benefício moderado)
- Grau 4-5 → `brand-green` (benefício alto = positivo)

### 38.4 Cálculo da Relação

**[REQ-CB-09]** Cálculo automático ao adicionar/remover itens:
```typescript
total_custo = soma dos valores monetários de todos os CostItem
grau_medio_custo = média dos graus de todos os CostItem
grau_medio_beneficio = média dos graus de todos os BenefitItem
delta = grau_medio_beneficio - grau_medio_custo
relacao = delta >= 1.0 ? 'FAVORÁVEL' : delta <= -1.0 ? 'DESFAVORÁVEL' : 'EQUILIBRADO'
```

**[REQ-CB-10]** Cores da relação:
- `FAVORÁVEL` → `brand-green`
- `EQUILIBRADO` → `brand-amber`
- `DESFAVORÁVEL` → `brand-red`

**[REQ-CB-11]** A relação é exibida no rodapé do sheet APENAS quando há pelo menos 1 custo completo e 1 benefício completo.

### 38.5 Interface CostBenefitSheet

**[REQ-CB-12]** Bottom-sheet com overlay escuro, drag handle, área scrollável e rodapé fixo:
- Cabeçalho: título "Análise de Custo/Benefício" + ícone de ajuda (abre help screen)
- IMV exibida como cabeçalho fixo não editável (contexto)
- Seção "Custos": lista de custos com nome, valor R$ e seletor de grau (círculos 1-5)
- Seção "Benefícios": lista de benefícios com descrição e seletor de grau (círculos 1-5)
- Botões para adicionar novo custo / novo benefício
- Rodapé: total R$, relação calculada, botão [SALVAR ANÁLISE]

**[REQ-CB-13]** Help screen: tela fullscreen dentro do sheet (sobrepõe o sheet) explicando cada campo. Botão X para fechar e retornar ao sheet.

**[REQ-CB-14]** Modo somente leitura (`readOnly`): campos desabilitados, cursor default nos círculos, botão Salvar oculto. Usado no Dashboard.

### 38.6 Integração com o Dashboard

**[REQ-CB-15]** O ProjectDashboard exibe seção "Custo / Benefício" se a entry `structured_P` mais recente com `cost_benefit` definido existir.

**[REQ-CB-16]** O Dashboard abre o `CostBenefitSheet` em modo `readOnly` (somente visualização).

**[REQ-CB-17]** Resumo exibido no Dashboard antes de abrir o sheet: relação (com cor), total em R$.

### 38.7 Integração com a Timeline (Diário)

**[REQ-CB-18]** Entradas `structured_P` que possuem `cost_benefit` exibem botão "Ver análise de custo/benefício" (ícone `BarChart2`) e resumo (relação + total) na Timeline.

**[REQ-CB-19]** O sheet aberto a partir da Timeline é editável (não readOnly). Salvar chama `updateEntryCostBenefit(entryId, newData)` com persistência dual Supabase/GuestStorage.

### 38.8 Persistência e Modelo de Dados

**[REQ-CB-20]** Persistência dual Supabase/GuestStorage, igual ao restante do app. Migração automática ao criar conta.

```typescript
// src/lib/register.ts

export interface CostItem {
  id: string;
  nome: string;
  valor: number;
  grau: 1 | 2 | 3 | 4 | 5;
}

export interface BenefitItem {
  id: string;
  descricao: string;
  grau: 1 | 2 | 3 | 4 | 5;
}

export type CostBenefitRelacao = 'FAVORÁVEL' | 'EQUILIBRADO' | 'DESFAVORÁVEL';

export interface CostBenefitData {
  custos: CostItem[];
  beneficios: BenefitItem[];
  total_custo: number;           // soma dos valores monetários
  grau_medio_custo: number;      // média dos graus dos custos
  grau_medio_beneficio: number;  // média dos graus dos benefícios
  relacao: CostBenefitRelacao;   // calculado pelo delta
  created_at: string;            // ISO — primeira vez que foi salvo
  updated_at: string;            // ISO — última atualização
}

// Adicionado ao StructuredPContent existente:
// cost_benefit?: CostBenefitData
```

**[REQ-CB-21]** `updateEntryCostBenefit(entryId, costBenefit)` — função em `src/lib/register.ts` que atualiza o campo `cost_benefit` dentro do `content` JSONB da entry sem sobrescrever os demais campos.

### 38.9 Fora de Escopo (Explicitamente)

- Análise de custo/benefício no Modo Pressão ou Protocolo 5 minutos
- Relatório comparativo entre múltiplas IMVs
- Categorias fixas de custo (o campo `nome` é texto livre)
- Moedas diferentes de R$ (BRL fixo)
- Integração com Stripe ou cálculos financeiros do negócio

---

## Convenções de Código

**Branch ativa:** `claude/kind-bardeen-rKhPC`

**[REGRA PERMANENTE — NENHUM COMMIT SEM PR]** Todo commit enviado à branch precisa terminar em Pull Request para a `main`. **Ao concluir qualquer commit, oferecer imediatamente a abertura do PR** — não acumular trabalho fora da `main`.

Motivo concreto: já aconteceu de a branch ficar **171 commits à frente** da `main`, com migrations e Edge Functions já aplicadas em produção enquanto o código que dependia delas seguia só na branch. Esse descompasso é perigoso — quem rodar a `main` encontra um banco que já mudou.

Regras práticas:
- O commit é meu; **o clique em Merge é sempre do usuário.** Nunca mergear sozinho.
- Um PR por entrega coerente (uma tarefa, um PRD, uma correção) — não um por commit solto, nem um acumulando semanas.
- Descrever no corpo **o porquê**, não só o quê. O diff já mostra o quê.
- Ao mergear, conferir que a opção é **"Create a merge commit"** — o squash apaga a explicação individual de cada commit.
- Não apagar a branch após o merge: o trabalho continua nela.

**[REGRA PERMANENTE — MOBILE OBRIGATÓRIO]** ~95% dos usuários acessam pelo celular. **Toda e qualquer alteração, ajuste ou nova implementação de código DEVE estar configurada para o uso correto no celular** — nunca só no desktop. Antes de considerar qualquer mudança pronta, verificar:
- **Responsividade a partir de 375px** — sem largura fixa que estoure a tela, sem overflow horizontal; usar `max-w-*`, `flex-wrap`, `min-w-0`, `truncate`/`line-clamp` conforme necessário.
- **Safe-area (iPhone com notch/home indicator)** — elementos fixos/sticky respeitam `env(safe-area-inset-*)`. Padrões já estabelecidos: BottomNav e FABs com `env(safe-area-inset-bottom)`; headers `sticky top-0` cobertos pela regra global em `src/styles.css`. Novos elementos fixos no rodapé/topo devem seguir o mesmo padrão.
- **Alvos de toque** — botões/áreas clicáveis com tamanho confortável para o dedo.
- **Sem `overflow-x: hidden`** que quebre `sticky` — usar `overflow-x: clip` quando precisar conter scroll horizontal.
- **Teclado e telas pequenas** — sheets/modais roláveis (`max-h-[..vh] overflow-y-auto`); conteúdo não some atrás da BottomNav (usar o padding do AppShell).
Em resumo: mobile-first não é opcional — é critério de "pronto" para qualquer entrega.

**Roteamento:** TanStack Router v1 (NOT React Router). Rotas em `src/routes/`, arquivo gerado em `src/routeTree.gen.ts`. Rotas usam convenção de arquivos (`.` como separador de segmento).

**Persistência dual:** Todos os dados do usuário devem funcionar em modo guest via `src/lib/guestStorage.ts` (localStorage/Capacitor Preferences). Ao autenticar, migrar via `src/lib/migrateGuest.ts`. Em operações de escrita/leitura, sempre checar `AuthState` e rotear para Supabase ou GuestStorage.

**Engines:** Todas em `src/engines/`. Imports diretos, não via lazy loading.

**Tipos:** `ScenarioType` e `OperationalLayer` definidos em `src/types/` — importar dali, não redefinir.

**Campos éticos, repeat_rule, cut_rule_next, next_bottleneck:** Sempre opcionais nas interfaces, nunca obrigatórios nos formulários.

**IA:** Chamar `AssistantFacilitatorEngine` apenas nos gatilhos definidos. Timeout 3s → null silencioso. Nunca exibir erro ao usuário quando IA falha.

**Textos exatos:** Onboarding telas 1.2 e 2.1 têm texto exato obrigatório conforme PRD. Não alterar.

**Celebrações:** Apenas dados concretos. Zero emojis excessivos, zero texto motivacional genérico.
