// PactWeekView — semana do operador.
// Progresso determinado exclusivamente por registros reais no banco — sem intervenção manual.

import { Link, useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import type { WeeklyCycle, PactPhase } from '@/types/app';

const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PHASE_TO_FORMAT: Record<PactPhase, 'C' | 'O' | 'P' | 'A'> = {
  capture: 'C',
  organize: 'O',
  prove: 'P',
  assess: 'A',
};

const PHASE_TO_ENTRY_TYPE: Record<PactPhase, string> = {
  capture: 'structured_C',
  organize: 'structured_O',
  prove: 'structured_P',
  assess: 'structured_A',
};

const PHASE_LABEL: Record<PactPhase, string> = {
  capture: 'Captura', organize: 'Organização', prove: 'Prova', assess: 'Aferição',
};

const PHASE_DESC: Record<PactPhase, string> = {
  capture: 'O que está acontecendo agora',
  organize: 'Qual é o principal gargalo',
  prove: 'Qual ação mínima testar',
  assess: 'O que o teste revelou',
};

export type EntryPhases = { capture: boolean; organize: boolean; prove: boolean; assess: boolean };

interface Props {
  projectId: string;
  cycle: WeeklyCycle;
  entryPhases?: EntryPhases;
}

const PHASE_ORDER: PactPhase[] = ['capture', 'organize', 'prove', 'assess'];

export function PactWeekView({ projectId, cycle, entryPhases }: Props) {
  const navigate = useNavigate();
  const today = new Date().getDay();

  function isDone(phase: PactPhase) {
    return entryPhases?.[phase] ?? false;
  }

  // Uma fase só está disponível para registro se todas as anteriores na ordem
  // C→O→P→A já tiverem sido feitas. Sem isso, o dia configurado não é suficiente.
  function isBlockedByPredecessor(phase: PactPhase): boolean {
    const idx = PHASE_ORDER.indexOf(phase);
    return PHASE_ORDER.slice(0, idx).some((prev) => !isDone(prev));
  }

  const doneCount = PHASE_ORDER.filter(isDone).length;
  const allDone = doneCount === PHASE_ORDER.length;

  function handlePhaseClick(phase: PactPhase) {
    if (isDone(phase)) {
      void navigate({
        to: '/diary',
        search: { projectId, type: PHASE_TO_ENTRY_TYPE[phase] } as never,
      });
      return;
    }
    // Fase bloqueada pela predecessora — não navega
    if (isBlockedByPredecessor(phase)) return;
    void navigate({
      to: '/register/structured',
      search: { projectId, format: PHASE_TO_FORMAT[phase] } as never,
    });
  }

  return (
    <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
      {/* Cabeçalho com progresso */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-label text-op-gray uppercase">Semana do Operador</h2>
          <p className="text-small text-op-white mt-0.5">
            {allDone
              ? 'Semana completa!'
              : doneCount === 0
              ? 'Nenhuma fase feita ainda'
              : `${doneCount} de ${PHASE_ORDER.length} fases concluídas`}
          </p>
        </div>
        <Link
          to="/project/$id/pact"
          params={{ id: projectId }}
          className="text-label text-muted-foreground hover:text-foreground"
        >
          Editar
        </Link>
      </div>

      {/* Barra de progresso */}
      <div className="flex gap-1">
        {PHASE_ORDER.map((phase) => (
          <div
            key={phase}
            className={`h-1 flex-1 rounded-full transition-colors ${
              isDone(phase)
                ? 'bg-[color:var(--color-status-success,#16a34a)]'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Lista de fases */}
      <ul className="space-y-0.5">
        {PHASE_ORDER.map((phase) => {
          const day = cycle[phase];
          const done = isDone(phase);
          const blocked = !done && isBlockedByPredecessor(phase);
          const isToday = day.day_of_week === today;
          // "hoje" só aparece se a fase está disponível (não bloqueada e não feita)
          const availableToday = isToday && !done && !blocked;

          return (
            <li
              key={phase}
              className={`rounded-md ${availableToday ? 'bg-[color:var(--color-op-navy-elevated)]' : ''}`}
            >
              <button
                type="button"
                onClick={() => handlePhaseClick(phase)}
                disabled={blocked}
                className={`w-full flex items-center gap-3 px-1 py-2.5 text-left ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                aria-label={`${PHASE_LABEL[phase]}: ${done ? 'concluído' : blocked ? 'aguardando fase anterior' : 'pendente'}`}
              >
                {/* Indicador de status */}
                <span
                  className={
                    'inline-flex items-center justify-center size-5 rounded-full flex-shrink-0 transition-colors ' +
                    (done
                      ? 'bg-[color:var(--color-status-success,#16a34a)] text-white'
                      : availableToday
                      ? 'border-2 border-foreground'
                      : 'border border-border')
                  }
                >
                  {done && <Check className="size-3" strokeWidth={3} />}
                </span>

                {/* Dia + label + descrição */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-small font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {PHASE_LABEL[phase]}
                    </span>
                    {availableToday && (
                      <span className="text-label px-1.5 py-0.5 rounded bg-op-amber text-op-black font-semibold">
                        hoje
                      </span>
                    )}
                    {isToday && blocked && (
                      <span className="text-label px-1.5 py-0.5 rounded bg-op-gray/20 text-op-gray">
                        aguarda anterior
                      </span>
                    )}
                  </div>
                  <p className="text-label text-op-gray">
                    {DAY_FULL[day.day_of_week]} · {PHASE_DESC[phase]}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="text-label text-center text-op-gray pt-1">
          Pacto da semana cumprido
        </p>
      )}
    </section>
  );
}
