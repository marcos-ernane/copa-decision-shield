// StructuredRegister — fluxo sequencial C → O → P → A.
// Fases concluídas: revisáveis com último registro pré-carregado.
// Próxima fase: destacada e habilitada. Fases futuras: bloqueadas.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { ProjectPicker } from './ProjectPicker';
import { FormatC } from './FormatC';
import { FormatO } from './FormatO';
import { FormatP } from './FormatP';
import { FormatA } from './FormatA';
import { useProjectPicker } from '@/hooks/useProjectPicker';
import { getProject, listEntries } from '@/lib/projects';
import type { StructuredCContent, StructuredOContent, StructuredPContent, StructuredAContent } from '@/lib/register';
import type { Project, Entry } from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

type Format = 'C' | 'O' | 'P' | 'A';
type PhaseStatus = 'done' | 'next' | 'locked';

const LABELS: Record<Format, string> = {
  C: 'C — Análise de Situação',
  O: 'O — Mapa 3R',
  P: 'P — Definição de IMV',
  A: 'A — Análise Pós-Ação',
};

const PHASE_ORDER: Format[] = ['C', 'O', 'P', 'A'];

function computeStatuses(entries: Entry[]): Record<Format, PhaseStatus> {
  const statuses: Record<Format, PhaseStatus> = { C: 'locked', O: 'locked', P: 'locked', A: 'locked' };
  let foundNext = false;
  for (const phase of PHASE_ORDER) {
    if (entries.some((e) => e.entry_type === `structured_${phase}`)) {
      statuses[phase] = 'done';
    } else if (!foundNext) {
      statuses[phase] = 'next';
      foundNext = true;
    }
  }
  return statuses;
}

function lastContent<T>(entries: Entry[], type: string): T | null {
  const sorted = [...entries]
    .filter((e) => e.entry_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return sorted[0]?.content as T ?? null;
}

function lastEntryDate(entries: Entry[], type: string): string | null {
  const sorted = [...entries]
    .filter((e) => e.entry_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return sorted[0]?.created_at ?? null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function StructuredRegister() {
  const navigate = useNavigate();
  const router = useRouter();
  const { projectId, setProjectId, projects } = useProjectPicker();
  const [format, setFormat] = useState<Format>('C');
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const [p, es] = await Promise.all([getProject(projectId), listEntries(projectId)]);
      setProjectData(p ?? null);
      setEntries(es);
      const statuses = computeStatuses(es);
      const next = PHASE_ORDER.find((ph) => statuses[ph] === 'next') ?? 'C';
      setFormat(next);
    })();
  }, [projectId]);

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  const statuses = computeStatuses(entries);
  const allDone = PHASE_ORDER.every((p) => statuses[p] === 'done');
  const scenarioType: ScenarioType | null = projectData?.scenario_type ?? null;
  const currentLayer: OperationalLayer | null = projectData?.current_layer ?? null;

  async function onSaved() {
    if (!projectId) return;
    const newEntries = await listEntries(projectId);
    setEntries(newEntries);
    const newStatuses = computeStatuses(newEntries);
    const next = PHASE_ORDER.find((ph) => newStatuses[ph] === 'next');
    if (next) {
      setFormat(next);
    } else {
      navigate({ to: '/project/$id/dashboard', params: { id: projectId } });
    }
  }

  const isReviewing = statuses[format] === 'done';
  const lastDate = isReviewing ? lastEntryDate(entries, `structured_${format}`) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Registro estruturado</p>
          <p className="text-heading text-foreground">{projectData?.name ?? '…'}</p>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Seletor de fases com status */}
        <div>
          <p className="text-small text-muted-foreground mb-2">Formato:</p>
          <div className="grid grid-cols-2 gap-2">
            {PHASE_ORDER.map((k) => {
              const status = statuses[k];
              const isActive = format === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={status === 'locked'}
                  onClick={() => status !== 'locked' && setFormat(k)}
                  className={[
                    'flex items-center gap-1.5 rounded-md border px-3 py-2 text-small text-left transition-colors',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : status === 'done'
                      ? 'border-[color:var(--color-status-success,#16a34a)] bg-card text-foreground hover:bg-accent'
                      : status === 'next'
                      ? 'border-border bg-card text-foreground hover:bg-accent'
                      : 'border-border bg-card text-muted-foreground opacity-40 cursor-not-allowed',
                  ].join(' ')}
                >
                  {status === 'done' && !isActive && (
                    <CheckCircle2 className="size-3.5 shrink-0 text-[color:var(--color-status-success,#16a34a)]" />
                  )}
                  {status === 'next' && !isActive && (
                    <ArrowRight className="size-3.5 shrink-0" />
                  )}
                  {status === 'locked' && (
                    <Lock className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{LABELS[k]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Indicador de revisão */}
        {isReviewing && lastDate && (
          <p className="text-label text-muted-foreground">
            Último registro: {fmtDate(lastDate)} — edite os campos para salvar uma nova versão.
          </p>
        )}

        {/* Banner ciclo completo */}
        {allDone && isReviewing && (
          <div className="rounded-md bg-[color:var(--color-surface-1)] px-3 py-2">
            <p className="text-small text-foreground">Ciclo COPA completo. Consulte ou atualize qualquer fase.</p>
          </div>
        )}

        {/* Formulários — key muda ao trocar fase ou ao ter novo entry salvo */}
        {format === 'C' && (
          <FormatC
            key={`C-${lastEntryDate(entries, 'structured_C') ?? 'empty'}`}
            projectId={projectId}
            scenarioType={scenarioType}
            currentLayer={currentLayer}
            onSaved={onSaved}
            initialData={statuses['C'] === 'done' ? lastContent<StructuredCContent>(entries, 'structured_C') : null}
          />
        )}
        {format === 'O' && (
          <FormatO
            key={`O-${lastEntryDate(entries, 'structured_O') ?? 'empty'}`}
            projectId={projectId}
            scenarioType={scenarioType}
            currentLayer={currentLayer}
            onSaved={onSaved}
            initialData={statuses['O'] === 'done' ? lastContent<StructuredOContent>(entries, 'structured_O') : null}
          />
        )}
        {format === 'P' && (
          <FormatP
            key={`P-${lastEntryDate(entries, 'structured_P') ?? 'empty'}`}
            projectId={projectId}
            scenarioType={scenarioType}
            onSaved={onSaved}
            initialData={statuses['P'] === 'done' ? lastContent<StructuredPContent>(entries, 'structured_P') : null}
          />
        )}
        {format === 'A' && (
          <FormatA
            key={`A-${lastEntryDate(entries, 'structured_A') ?? 'empty'}`}
            projectId={projectId}
            scenarioType={scenarioType}
            currentLayer={currentLayer}
            onSaved={onSaved}
            initialData={statuses['A'] === 'done' ? lastContent<StructuredAContent>(entries, 'structured_A') : null}
          />
        )}
      </div>
    </div>
  );
}
