// StructuredRegister — fluxo sequencial C → O → P → A.
// Fases concluídas: revisáveis com último registro pré-carregado.
// Próxima fase: destacada e habilitada. Fases futuras: bloqueadas.
// Navegação em dois níveis: voltar retroage campo a campo, depois tela a tela.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

// Total de passos por formato (passo final = índice TOTAL_STEPS - 1)
const FORMAT_STEPS: Record<'C' | 'O' | 'P' | 'A', number> = { C: 4, O: 3, P: 4, A: 5 };
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

const PHASE_LABEL_TOP: Record<Format, string> = {
  C: '[C] Captura',
  O: '[O] Organização',
  P: '[P] Prova',
  A: '[A] Aferição',
};

const PHASE_LABEL_BOTTOM: Record<Format, string> = {
  C: 'Análise da situação',
  O: 'Mapa 3R',
  P: 'Definição de IMV',
  A: 'Análise pós-ação',
};

const PHASE_NAMES: Record<Format, string> = {
  C: '[C]-CAPTURA DIZ:',
  O: '[O]-ORGANIZAÇÃO DIZ:',
  P: '[P]-PROVA DIZ:',
  A: '[A]-AFERIÇÃO DIZ:',
};

const PHASE_QUESTIONS: Record<Format, string> = {
  C: 'O QUE ESTÁ ACONTECENDO DE VERDADE?',
  O: 'DOS RECURSOS QUE TENHO NO CENÁRIO, O QUE IMPORTA E COMO ELES SE CONECTAM?',
  P: 'QUAL É O MENOR TESTE QUE CONSIGO FAZER PARA CONFIRMAR SE ESTOU CERTO?',
  A: 'O QUE MUDOU, POR QUE MUDOU E O QUE EU FAÇO COM ISSO AGORA?',
};

const PHASE_ORDER: Format[] = ['C', 'O', 'P', 'A'];

function computeStatuses(entries: Entry[]): Record<Format, PhaseStatus> {
  const aLockedUntil = getALockedUntil(entries);
  const statuses: Record<Format, PhaseStatus> = { C: 'locked', O: 'locked', P: 'locked', A: 'locked' };
  let foundNext = false;
  for (const phase of PHASE_ORDER) {
    if (entries.some((e) => e.entry_type === `structured_${phase}`)) {
      statuses[phase] = 'done';
    } else if (!foundNext) {
      if (phase === 'A' && aLockedUntil) {
        // A bloqueada pelo prazo do IMV — mantém 'locked' até a data ser atingida
        foundNext = true;
      } else {
        statuses[phase] = 'next';
        foundNext = true;
      }
    }
  }
  return statuses;
}

// Retorna o prazo (YYYY-MM-DD) do último entry structured_P se ainda estiver no futuro; null caso contrário.
function getALockedUntil(entries: Entry[]): string | null {
  const pEntry = [...entries]
    .filter((e) => e.entry_type === 'structured_P')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const deadline = (pEntry?.content as { deadline?: string | null } | undefined)?.deadline ?? null;
  if (!deadline) return null;
  return new Date(deadline + 'T00:00:00').getTime() > Date.now() ? deadline : null;
}

// Formata YYYY-MM-DD → DD/MM/AAAA sem problemas de fuso horário.
function fmtDeadline(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
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
  const [currentStep, setCurrentStep] = useState(0);
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
      setCurrentStep(0);
    })();
  }, [projectId]);

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  const statuses = computeStatuses(entries);
  const aLockedUntil = getALockedUntil(entries);
  const allDone = PHASE_ORDER.every((p) => statuses[p] === 'done');
  const scenarioType: ScenarioType | null = projectData?.scenario_type ?? null;
  const currentLayer: OperationalLayer | null = projectData?.current_layer ?? null;

  // Nível 1: retrocede campo a campo dentro do formato.
  // Nível 2: ao chegar no passo 0, retrocede para o último passo do formato anterior (done).
  // Nível 3: se já estiver no primeiro formato, volta para a tela anterior (histórico).
  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      return;
    }
    const idx = PHASE_ORDER.indexOf(format);
    if (idx > 0) {
      const prev = PHASE_ORDER[idx - 1];
      if (statuses[prev] === 'done') {
        setFormat(prev);
        setCurrentStep(FORMAT_STEPS[prev] - 1);
        return;
      }
    }
    router.history.back();
  }

  // Avança passo dentro do formato. Se chamado no último passo de um formato já concluído
  // (botão "Avançar sem salvar →"), salta para o início do próximo formato acessível.
  function handleNextStep() {
    const maxStep = FORMAT_STEPS[format] - 1;
    if (currentStep < maxStep) {
      setCurrentStep((s) => s + 1);
      return;
    }
    // Último passo — avança formato (apenas em modo revisão, sem salvar)
    const idx = PHASE_ORDER.indexOf(format);
    const nextFmt = PHASE_ORDER[idx + 1] as Format | undefined;
    if (nextFmt && statuses[nextFmt] !== 'locked') {
      setFormat(nextFmt);
      setCurrentStep(0);
    }
  }

  // Recarrega entries sem avançar de fase — usado pelo auto-save silencioso do FormatP.
  async function handleAutoSaved() {
    if (!projectId) return;
    const newEntries = await listEntries(projectId);
    setEntries(newEntries);
  }

  async function onSaved() {
    if (!projectId) return;
    const newEntries = await listEntries(projectId);
    setEntries(newEntries);
    const newStatuses = computeStatuses(newEntries);
    const next = PHASE_ORDER.find((ph) => newStatuses[ph] === 'next');
    setCurrentStep(0);
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
          onClick={handleBack}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Registro estruturado</p>
          <p className="text-label text-muted-foreground uppercase tracking-wide">Nome</p>
          <p className="text-heading text-foreground">{projectData?.name ?? '…'}</p>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Seletor de fases com status */}
        <div>
          <p className="text-label text-muted-foreground uppercase tracking-wide mb-2">Etapas do projeto</p>
          <div className="grid grid-cols-2 gap-2">
            {PHASE_ORDER.map((k) => {
              const status = statuses[k];
              const isActive = format === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={status === 'locked'}
                  onClick={() => { if (status !== 'locked') { setFormat(k); setCurrentStep(0); } }}
                  className={[
                    'flex items-start gap-1.5 rounded-md border px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : status === 'done'
                      ? 'border-[color:var(--color-status-success,#16a34a)] bg-card text-foreground hover:bg-accent'
                      : status === 'next'
                      ? 'border-border bg-card text-foreground hover:bg-accent'
                      : 'border-border bg-card text-muted-foreground opacity-40 cursor-not-allowed',
                  ].join(' ')}
                >
                  <span className="mt-0.5 shrink-0">
                    {status === 'done' && !isActive && (
                      <CheckCircle2 className="size-3.5 text-[color:var(--color-status-success,#16a34a)]" />
                    )}
                    {status === 'next' && !isActive && (
                      <ArrowRight className="size-3.5" />
                    )}
                    {status === 'locked' && (
                      <Lock className="size-3.5" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] font-semibold leading-tight">{PHASE_LABEL_TOP[k]}</span>
                    <span className="block text-[11px] leading-tight mt-0.5 opacity-80">{PHASE_LABEL_BOTTOM[k]}</span>
                    {k === 'A' && status === 'locked' && aLockedUntil && (
                      <span className="block text-[10px] leading-tight mt-1 opacity-60">
                        a partir de {fmtDeadline(aLockedUntil)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fase atual + pergunta central */}
        <div className="rounded-md bg-[color:var(--color-surface-1)] px-4 py-3 space-y-1">
          <p className="text-label font-semibold text-foreground uppercase tracking-wide">
            {PHASE_NAMES[format]}
          </p>
          <p className="text-small font-medium text-foreground">
            {PHASE_QUESTIONS[format]}
          </p>
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
            onNextStep={handleNextStep}
            step={currentStep}
            isReviewing={isReviewing}
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
            onNextStep={handleNextStep}
            step={currentStep}
            isReviewing={isReviewing}
            initialData={statuses['O'] === 'done' ? lastContent<StructuredOContent>(entries, 'structured_O') : null}
          />
        )}
        {format === 'P' && (
          <FormatP
            key={`P-${lastEntryDate(entries, 'structured_P') ?? 'empty'}`}
            projectId={projectId}
            scenarioType={scenarioType}
            currentProjectLayer={currentLayer}
            onSaved={onSaved}
            onNextStep={handleNextStep}
            onAutoSaved={handleAutoSaved}
            step={currentStep}
            isReviewing={isReviewing}
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
            onNextStep={handleNextStep}
            step={currentStep}
            isReviewing={isReviewing}
            initialData={statuses['A'] === 'done' ? lastContent<StructuredAContent>(entries, 'structured_A') : null}
          />
        )}
      </div>
    </div>
  );
}
