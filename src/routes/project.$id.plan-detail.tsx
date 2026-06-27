import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { listEntries } from '@/lib/projects';
import {
  calcProgress,
  calcProgressColor,
  getPhaseTimeState,
} from '@/lib/executionPlan';
import type { ExecutionPlan, ExecutionProgressColor } from '@/types/app';
import type { Entry } from '@/types/database';

export const Route = createFileRoute('/project/$id/plan-detail')({
  component: PlanDetailPage,
});

type StructuredPContent = {
  action?: string;
  deadline?: string | null;
  execution_plan?: ExecutionPlan;
};

const COLOR_BAR: Record<ExecutionProgressColor, string> = {
  green: 'bg-op-success',
  blue:  'bg-brand-blue',
  amber: 'bg-op-amber',
  red:   'bg-op-danger',
  none:  'bg-op-gray/20',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function PlanDetailPage() {
  const { id } = Route.useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listEntries(id).then((entries) => {
      const found = [...entries]
        .filter((e) => e.entry_type === 'structured_P')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .find((e) => {
          const c = e.content as StructuredPContent;
          return c.execution_plan?.enabled === true;
        });
      setEntry(found ?? null);
      setLoading(false);
    });
  }, [id]);

  const plan = entry ? (entry.content as StructuredPContent).execution_plan! : null;
  const imvAction = entry ? ((entry.content as StructuredPContent).action ?? '') : '';
  const imvDeadline = entry ? ((entry.content as StructuredPContent).deadline ?? null) : null;

  const imvOverdue = imvDeadline ? new Date(imvDeadline) < new Date() : false;
  const progress = plan ? calcProgress(plan) : null;
  const color = plan ? calcProgressColor(plan, imvOverdue) : 'none';

  const onTime = plan
    ? plan.phases.filter((p) => getPhaseTimeState(p) === 'on_time').length
    : 0;

  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 sticky top-0 bg-op-black z-10">
        <BackButton />
        <h1 className="text-heading text-op-white">Plano de Execução</h1>
        <CloseButton className="ml-auto" />
      </header>

      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-small text-op-gray">Carregando…</p>
        ) : !plan ? (
          <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-6 text-center">
            <p className="text-body text-op-gray">
              Nenhum plano de execução ativo neste projeto.
            </p>
          </div>
        ) : (
          <>
            {/* IMV de referência */}
            <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-3 space-y-1">
              <p className="text-label text-op-gray uppercase tracking-wider">IMV desta etapa</p>
              <p className="text-body text-op-white/70 italic">{imvAction || '—'}</p>
              {imvDeadline && (
                <p className={`text-small ${imvOverdue ? 'text-op-danger' : 'text-op-gray'}`}>
                  Prazo da IMV: {formatDate(imvDeadline)}
                  {imvOverdue && ' · vencido'}
                </p>
              )}
            </div>

            {/* Estatísticas de progresso */}
            <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-4 space-y-3">
              <p className="text-small font-medium text-op-white">Como foi calculado</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-op-black/40 px-3 py-2">
                  <p className="text-display font-bold text-op-white">{progress!.total}</p>
                  <p className="text-label text-op-gray">etapa{progress!.total !== 1 ? 's' : ''} no total</p>
                </div>
                <div className="rounded-lg bg-op-success/10 border border-op-success/20 px-3 py-2">
                  <p className="text-display font-bold text-op-success">{progress!.completed}</p>
                  <p className="text-label text-op-gray">concluída{progress!.completed !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-lg bg-op-black/40 px-3 py-2">
                  <p className="text-display font-bold text-op-white">{onTime}</p>
                  <p className="text-label text-op-gray">dentro do prazo</p>
                </div>
                <div className={`rounded-lg px-3 py-2 ${progress!.overdue > 0 ? 'bg-op-amber/10 border border-op-amber/20' : 'bg-op-black/40'}`}>
                  <p className={`text-display font-bold ${progress!.overdue > 0 ? 'text-op-amber' : 'text-op-white'}`}>
                    {progress!.overdue}
                  </p>
                  <p className="text-label text-op-gray">vencida{progress!.overdue !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-small text-op-gray">Progresso</p>
                  <p className="text-small text-op-white">{progress!.completed}/{progress!.total} etapas</p>
                </div>
                <div className="h-2 rounded-full bg-op-gray/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${COLOR_BAR[color]}`}
                    style={{ width: `${progress!.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Legenda de cores */}
            <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-4 space-y-3">
              <p className="text-small font-medium text-op-white">O que cada cor significa</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-op-success mt-0.5 shrink-0" />
                  <div>
                    <p className="text-small text-op-white font-medium">Verde</p>
                    <p className="text-label text-op-gray">Progresso saudável — todas as etapas dentro do prazo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-brand-blue mt-0.5 shrink-0" />
                  <div>
                    <p className="text-small text-op-white font-medium">Azul</p>
                    <p className="text-label text-op-gray">Plano avançando — sem etapas vencidas.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-op-amber mt-0.5 shrink-0" />
                  <div>
                    <p className="text-small text-op-white font-medium">Âmbar</p>
                    <p className="text-label text-op-gray">Há etapas com prazo vencido. Reabra o prazo ou conclua para continuar.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-op-danger mt-0.5 shrink-0" />
                  <div>
                    <p className="text-small text-op-white font-medium">Vermelho</p>
                    <p className="text-label text-op-gray">O prazo da IMV venceu. Registre o resultado na etapa [A] Aferição.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista somente leitura das fases */}
            {plan.phases.length > 0 && (
              <div className="space-y-2">
                <p className="text-small font-medium text-op-white px-1">Etapas do plano</p>
                {plan.phases.map((phase, i) => {
                  const ts = getPhaseTimeState(phase);
                  return (
                    <div
                      key={phase.id}
                      className={`rounded-xl border bg-op-navy px-4 py-3 space-y-1 ${
                        ts === 'done'
                          ? 'border-op-success/40'
                          : ts === 'overdue'
                          ? 'border-op-danger/60'
                          : 'border-op-gray/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-label font-semibold text-op-cyan uppercase tracking-wider">
                          Etapa {i + 1}
                        </span>
                        {ts === 'done' ? (
                          <span className="flex items-center gap-1 text-label text-op-success">
                            <CheckCircle2 className="size-3.5" />
                            Concluída
                          </span>
                        ) : ts === 'overdue' ? (
                          <span className="flex items-center gap-1 text-label text-op-danger">
                            <AlertTriangle className="size-3.5" />
                            Vencida
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-label text-op-gray">
                            <Clock className="size-3.5" />
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className={`text-body ${ts === 'overdue' ? 'text-op-white/40' : 'text-op-white'}`}>
                        {phase.how}
                      </p>
                      {phase.who && (
                        <p className="text-small text-op-gray">Responsável: {phase.who}</p>
                      )}
                      <p className={`text-small ${ts === 'overdue' ? 'text-op-danger' : ts === 'done' ? 'text-op-gray' : 'text-op-white/70'}`}>
                        Prazo: {formatDate(phase.deadline)}
                        {ts === 'done' && phase.completed_at
                          ? ` · concluída em ${formatDate(phase.completed_at)}`
                          : null}
                        {ts === 'overdue' ? ' · vencido' : null}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
