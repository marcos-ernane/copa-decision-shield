// copaPhase — qual fase do COPA cada projeto pode fazer agora.
//
// Esta regra vivia como função privada dentro de StructuredRegister.tsx. Por
// não ser alcançável de fora, o Pacto de Hoje reinventou uma versão própria e
// mais pobre — "existe entry desta fase desde segunda?" — que ignorava tanto
// pré-requisito quanto ciclo já fechado. O resultado era o Pacto listar fases
// impossíveis e fases concluídas lado a lado.
//
// Uma regra só, num lugar só. Quem quiser saber o que um projeto tem a fazer
// pergunta aqui.

import type { Entry } from '@/types/database';

export type CopaFormat = 'C' | 'O' | 'P' | 'A';

/**
 * done   — já registrada alguma vez (revisável, não pendente)
 * next   — é a próxima possível: nada a impedir, nada registrado
 * locked — pré-requisito ausente, ou [A] esperando o prazo da IMV / retomada
 */
export type PhaseStatus = 'done' | 'next' | 'locked';

export const PHASE_ORDER: CopaFormat[] = ['C', 'O', 'P', 'A'];

/**
 * Prazo (YYYY-MM-DD) do último `structured_P` se ainda estiver no futuro.
 * Enquanto a IMV não vence não há o que aferir — [A] fica travada.
 */
export function getALockedUntil(entries: Entry[]): string | null {
  const pEntry = [...entries]
    .filter((e) => e.entry_type === 'structured_P')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const deadline = (pEntry?.content as { deadline?: string | null } | undefined)?.deadline ?? null;
  if (!deadline) return null;
  return new Date(deadline + 'T00:00:00').getTime() > Date.now() ? deadline : null;
}

/** Projeto interrompido em [P] com prazo vencido e ainda não retomado. */
export function isAInterrupted(entries: Entry[]): boolean {
  const lastInterruption = [...entries]
    .filter((e) => e.entry_type === 'passive' && (e.content as { kind?: string })?.kind === 'p_imv_interrupted')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!lastInterruption) return false;
  const lastAction = [...entries]
    .filter((e) => e.entry_type === 'structured_P' || e.entry_type === 'structured_A')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!lastAction) return true;
  return new Date(lastInterruption.created_at) > new Date(lastAction.created_at);
}

export function computeStatuses(entries: Entry[]): Record<CopaFormat, PhaseStatus> {
  const aLockedUntil = getALockedUntil(entries);
  const aInterrupted = isAInterrupted(entries);
  const statuses: Record<CopaFormat, PhaseStatus> = { C: 'locked', O: 'locked', P: 'locked', A: 'locked' };
  let foundNext = false;
  for (const phase of PHASE_ORDER) {
    if (entries.some((e) => e.entry_type === `structured_${phase}`)) {
      statuses[phase] = 'done';
    } else if (!foundNext) {
      if (phase === 'A' && (aLockedUntil || aInterrupted)) {
        // A bloqueada pelo prazo do IMV ou por interrupção em [P] — mantém 'locked'
        foundNext = true;
      } else {
        statuses[phase] = 'next';
        foundNext = true;
      }
    }
  }
  return statuses;
}

/**
 * A única fase que o projeto pode registrar agora, ou null quando não há
 * nenhuma — ciclo fechado, ou [A] esperando o prazo da IMV.
 *
 * Null é resposta legítima e frequente: um projeto com o ciclo completo não
 * tem pendência até que alguém abra o próximo.
 */
export function nextPhase(entries: Entry[]): CopaFormat | null {
  const statuses = computeStatuses(entries);
  return PHASE_ORDER.find((p) => statuses[p] === 'next') ?? null;
}
