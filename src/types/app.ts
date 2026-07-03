// Tipos globais do App Operador de Precisão v3.0
// Método COPA: Captura → Organização → Prova → Aferição

export type ScenarioType =
  | 'fluxo'
  | 'processo'
  | 'oferta'
  | 'relacionamento'
  | 'pressao';

export type OperationalLayer =
  | 'operabilidade'
  | 'conversao'
  | 'recorrencia'
  | 'escala';

export type AuthState =
  | 'GUEST'
  | 'AUTHENTICATED_FREE'
  | 'AUTHENTICATED_TRIAL'
  | 'AUTHENTICATED_ANNUAL'
  | 'AUTHENTICATED_LIFETIME';

export type ProjectState =
  | 'new'
  | 'capturing'
  | 'organizing'
  | 'proving'
  | 'blocked'
  | 'paused'
  | 'concluded'
  | 'archived';

export type EntryType =
  | 'pulse'
  | 'structured_C'
  | 'structured_O'
  | 'structured_P'
  | 'structured_A'
  | 'corrective'
  | 'passive'
  | 'quick_review'
  | 'inbox';

export type CopaPhase = 'C' | 'O' | 'P' | 'A';

// ---------- Pacto de Execução Semanal ----------

export type PactPhase = 'capture' | 'organize' | 'prove' | 'assess';

export interface WeeklyCycleDay {
  phase: PactPhase;
  day_of_week: number; // 0=Dom..6=Sáb
  time_hour: number;   // 0..23
  completed_this_week: boolean;
  last_completed_at: string | null;
}

export interface WeeklyCycle {
  capture: WeeklyCycleDay;
  organize: WeeklyCycleDay;
  prove: WeeklyCycleDay;
  assess: WeeklyCycleDay;
  week_start: string; // ISO date (segunda-feira) usada para reset semanal
}

// ---------- Plano de Execução da IMV (Seção 37) ----------

export type ExecutionPhaseStatus = 'pendente' | 'concluída';

export interface ExecutionReopenRecord {
  previous_deadline: string; // ISO
  new_deadline: string;      // ISO
  changed_at: string;        // ISO
}

export interface ExecutionPhase {
  id: string;
  how: string;
  who: string | null;
  deadline: string;                        // ISO — obrigatoriamente < deadline da IMV
  status: ExecutionPhaseStatus;
  completed_at: string | null;
  reopen_history: ExecutionReopenRecord[];
}

export interface ExecutionPlan {
  enabled: boolean;
  phases: ExecutionPhase[];
}

export type ExecutionProgressColor = 'green' | 'blue' | 'amber' | 'red' | 'none';

