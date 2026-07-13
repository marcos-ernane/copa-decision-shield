// Motor dos 5 Porquês — análise de causa raiz opcional no Formato C (PRD-ITEM-04).
// Sem IA: o usuário pensa, o app estrutura.

import type { RootCauseChain, RootCauseStep } from './register';

// Gera a primeira pergunta a partir do fact_text da entry.
// Usa apenas a primeira linha do fact_text.
export function generateFirstQuestion(factText: string): string {
  const firstLine = factText.split('\n').find((l) => l.trim()) ?? factText;
  const trimmed = firstLine.trim();
  return `Por que ${trimmed}?`;
}

// Gera a próxima pergunta a partir da resposta anterior.
// Trunca a resposta a 80 chars para manter a pergunta legível.
export function generateNextQuestion(answer: string): string {
  const trimmed = answer.trim();
  const base = trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;
  return `Por que ${base}?`;
}

// Verifica se o fluxo deve terminar.
// Termina quando o usuário declara causa raiz OU ao atingir 5 passos.
export function shouldTerminate(
  steps: RootCauseStep[],
  userDeclaredRoot: boolean,
): boolean {
  return userDeclaredRoot || steps.length >= 5;
}

// Monta o objeto RootCauseChain final para persistência.
export function buildChain(
  steps: RootCauseStep[],
  userDeclaredRoot: boolean,
): RootCauseChain {
  return {
    steps,
    root_cause: steps[steps.length - 1].answer,
    completed: userDeclaredRoot || steps.length >= 5,
    steps_taken: steps.length,
  };
}

// Constantes de validação usadas pela UI.
export const ROOT_CAUSE_MIN_ANSWER_LENGTH = 10;
export const ROOT_CAUSE_MAX_ANSWER_LENGTH = 300;
export const ROOT_CAUSE_COUNTER_THRESHOLD = 200;
export const ROOT_CAUSE_MAX_STEPS = 5;
