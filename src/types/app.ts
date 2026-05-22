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
  | 'passive';

export type CopaPhase = 'C' | 'O' | 'P' | 'A';
