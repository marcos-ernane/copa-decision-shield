// StructuredRegister — fluxo sequencial C → O → P → A.
// Fases concluídas: revisáveis com último registro pré-carregado.
// Próxima fase: destacada e habilitada. Fases futuras: bloqueadas.
// Navegação em dois níveis: voltar retroage campo a campo, depois tela a tela.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { CheckCircle2, Lock, ArrowRight, CircleHelp, X } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';

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
  P: 'Definição de IMV para testar',
  A: 'Análise pós-ação do teste',
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

const PHASE_HELP: Record<Format, { title: string; text: string }> = {
  C: {
    title: '[C] Captura',
    text: 'A Captura é o processo de registrar a realidade antes de interpretá-la. Nesta etapa, observe o cenário com atenção e registre fatos, comportamentos, ocorrências, padrões e evidências que possam ser percebidos diretamente. Evite conclusões, julgamentos, explicações ou opiniões. O objetivo é construir uma base confiável de observações para que as etapas seguintes sejam guiadas pela realidade e não por suposições. Quanto melhor a captura, maior será a qualidade do diagnóstico, das decisões e das intervenções.\n\nPergunte-se: Estou registrando o que realmente observei ou aquilo que acredito estar acontecendo e sem julgamento?',
  },
  O: {
    title: '[O] Organização',
    text: 'A Organização é o processo de transformar observações dispersas em uma leitura estruturada do cenário. Nesta etapa, você separa o que pode ser aproveitado (Recursos), o que confunde ou desvia a atenção (Ruídos) e o que realmente limita os resultados (Restrições). O objetivo não é acumular informações, mas revelar a estrutura que está por trás dos acontecimentos. Uma boa organização reduz a complexidade, destaca o que é relevante e direciona sua atenção para os pontos que merecem intervenção.\n\nPergunte-se: Estou conseguindo distinguir o que gera valor, o que gera distração e o que realmente limita avançar neste cenário?',
  },
  P: {
    title: '[P] Prova',
    text: 'A Prova é o processo de testar, na realidade, se a sua leitura do cenário está correta. Nesta etapa, hipóteses deixam de ser opiniões e passam a ser verificadas por meio de uma Intervenção Mínima Viável (IMV) e de uma métrica claramente definida. O objetivo não é provar que você está certo, mas descobrir o que a realidade tem a mostrar. Uma boa prova gera evidências, reduz incertezas e transforma percepções em conhecimento confiável para orientar as próximas decisões e decidir escalar a solução.\n\nPergunte-se: Qual é o menor teste que posso executar para verificar se minha hipótese está correta e qual evidência mostrará o resultado?',
  },
  A: {
    title: '[A] Aferição',
    text: 'A Aferição é o processo de analisar os resultados da IMV para transformar experiência em aprendizado. Nesta etapa, você compara as evidências obtidas com a hipótese inicial, identifica o que funcionou, o que não funcionou e quais ajustes podem melhorar a próxima intervenção. O objetivo não é julgar o sucesso ou o fracasso do teste, mas extrair conhecimento confiável da realidade. Uma boa aferição fortalece o entendimento do cenário, melhora a qualidade das decisões futuras e evita repetir erros ou acertos sem compreender suas causas.\n\nPergunte-se: O que as evidências deste teste realmente revelam sobre o cenário, a hipótese e os próximos passos?\n\nEsta formulação está alinhada à essência do Operador de Precisão porque ensina que o valor do teste não está no resultado em si, mas na capacidade de converter evidências em entendimento operacional.\n\nEla reforça um princípio central da obra:\n\nQuem apenas executa acumula experiências. Quem afere acumula inteligência operacional.\n\nE fecha o ciclo do COPA de forma coerente:\n\nCaptura observa a realidade.\nOrganização revela a estrutura.\nProva gera evidências.\nAferição transforma evidências em aprendizado e evolução da capacidade perceptiva.\n\nOu seja, a Aferição não mede apenas a IMV. Ela desenvolve o próprio operador.\n\nExecute "Aferição" em todos os projetos.',
  },
};

const PHASE_ORDER: Format[] = ['C', 'O', 'P', 'A'];

function computeStatuses(entries: Entry[]): Record<Format, PhaseStatus> {
  const aLockedUntil = getALockedUntil(entries);
  const aInterrupted = isAInterrupted(entries);
  const statuses: Record<Format, PhaseStatus> = { C: 'locked', O: 'locked', P: 'locked', A: 'locked' };
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

// Detecta se o projeto foi interrompido em [P] com prazo vencido e ainda não retomado.
function isAInterrupted(entries: Entry[]): boolean {
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
  const search = useSearch({ strict: false }) as { format?: 'C' | 'O' | 'P' | 'A' };
  const [format, setFormat] = useState<Format>('C');
  const [currentStep, setCurrentStep] = useState(0);
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [phaseHelp, setPhaseHelp] = useState<Format | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const [p, es] = await Promise.all([getProject(projectId), listEntries(projectId)]);
      setProjectData(p ?? null);
      setEntries(es);
      // Se um formato foi solicitado via URL (ex: Pacto da semana), usa ele.
      // Caso contrário, auto-detecta a próxima fase pendente.
      if (search.format) {
        setFormat(search.format);
      } else {
        const statuses = computeStatuses(es);
        const interrupted = isAInterrupted(es);
        if (interrupted) {
          setFormat('P');
        } else {
          const next = PHASE_ORDER.find((ph) => statuses[ph] === 'next') ?? 'C';
          setFormat(next);
        }
      }
      setCurrentStep(0);
    })();
  }, [projectId, search.format]);

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  const statuses = computeStatuses(entries);
  const aLockedUntil = getALockedUntil(entries);
  const aInterrupted = isAInterrupted(entries);
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
    <>
    {/* Modal de ajuda da fase — bottom sheet */}
    {phaseHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setPhaseHelp(null)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">{PHASE_HELP[phaseHelp].title}</h3>
            <button
              type="button"
              onClick={() => setPhaseHelp(null)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {PHASE_HELP[phaseHelp].text.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton onClick={handleBack} />
        <div>
          <p className="text-label uppercase tracking-wide text-op-gray">Registro estruturado</p>
          <p className="text-label text-op-gray uppercase tracking-wide">Nome</p>
          <p className="text-heading text-op-white">{projectData?.name ?? '…'}</p>
        </div>
        <CloseButton className="ml-auto" />
      </header>

      <div className="space-y-4 p-4">
        {/* Seletor de fases com status */}
        <div>
          <p className="text-label text-op-gray uppercase tracking-wide mb-2">Etapas do projeto</p>
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
                      ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                      : status === 'done'
                      ? 'border-[color:var(--color-status-success,#16a34a)] bg-op-navy text-op-white hover:opacity-80'
                      : status === 'next'
                      ? 'border-op-gray/30 bg-op-navy text-op-white hover:opacity-80'
                      : 'border-op-gray/30 bg-op-navy text-op-gray opacity-40 cursor-not-allowed',
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
                    {k === 'A' && status === 'locked' && aInterrupted && !aLockedUntil && (
                      <span className="block text-[10px] leading-tight mt-1 opacity-60">
                        aguardando ajuste em [P]
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fase atual + pergunta central */}
        <div className="rounded-md bg-op-navy-elevated px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-op-white uppercase tracking-wide">
              {PHASE_NAMES[format]}
            </p>
            <button
              type="button"
              onClick={() => setPhaseHelp(format)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          <p className="text-small font-medium text-op-white">
            {PHASE_QUESTIONS[format]}
          </p>
        </div>

        {/* Indicador de revisão */}
        {isReviewing && lastDate && (
          <p className="text-label text-op-gray">
            Último registro: {fmtDate(lastDate)} — edite os campos para salvar uma nova versão.
          </p>
        )}

        {/* Banner ciclo completo */}
        {allDone && isReviewing && (
          <div className="rounded-md bg-op-navy-elevated px-3 py-2">
            <p className="text-small text-op-white">Ciclo COPA completo. Consulte ou atualize qualquer fase.</p>
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
            onGoToStep={setCurrentStep}
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
    </>
  );
}
