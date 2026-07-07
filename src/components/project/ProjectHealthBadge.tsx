// ProjectHealthBadge — PRD-ITEM-02 v1.0 — Etapa 2
// Badge de saúde do projeto: badge colapsado + card expandido inline + ajuda.

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CircleHelp,
  X,
} from 'lucide-react';
import { getProjectHealth, invalidateHealthCache } from '@/lib/projectHealth';
import type { ProjectHealth, HealthCriterion, HealthColor } from '@/lib/projectHealth';
import type { AuthState } from '@/types/app';

interface ProjectHealthBadgeProps {
  projectId: string;
  authState: AuthState;
}

const HELP_CONTENT = {
  title: 'Como o Indicador de Saúde funciona?',
  paragraphs: [
    'O indicador avalia 5 critérios do seu projeto e mostra a cor do critério mais crítico encontrado.',
    'Verde: todos os critérios estão saudáveis. Amarelo: há atenção necessária. Vermelho: há um bloqueio ativo.',
    'Os critérios são: atividade recente, ciclos fechados no prazo, e IMV definida na fase correta.',
    'O indicador é calculado ao abrir o Dashboard, sempre com os dados mais atuais.',
  ],
};

function colorDot(color: HealthColor): string {
  switch (color) {
    case 'green':  return 'bg-[var(--color-brand-green)]';
    case 'yellow': return 'bg-[var(--color-brand-amber)]';
    case 'red':    return 'bg-[var(--color-brand-red)]';
  }
}

function borderLeft(color: HealthColor): string {
  switch (color) {
    case 'green':  return 'border-l-[var(--color-brand-green)]';
    case 'yellow': return 'border-l-[var(--color-brand-amber)]';
    case 'red':    return 'border-l-[var(--color-brand-red)]';
  }
}

function CriterionIcon({ status }: { status: HealthCriterion['status'] }) {
  if (status === 'ok') {
    return <CheckCircle2 className="size-3.5 text-[var(--color-brand-green)] shrink-0 mt-0.5" />;
  }
  if (status === 'warn') {
    return <AlertCircle className="size-3.5 text-[var(--color-brand-amber)] shrink-0 mt-0.5" />;
  }
  return <XCircle className="size-3.5 text-[var(--color-brand-red)] shrink-0 mt-0.5" />;
}

export function ProjectHealthBadge({ projectId, authState }: ProjectHealthBadgeProps) {
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  async function calculate() {
    setLoading(true);
    try {
      const result = await getProjectHealth(projectId, authState);
      setHealth(result);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void calculate();

    function handleEntrySaved() {
      invalidateHealthCache(projectId);
      void calculate();
    }

    window.addEventListener('aop:entry-saved', handleEntrySaved);
    return () => window.removeEventListener('aop:entry-saved', handleEntrySaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, authState]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-4 py-1">
        <div
          className="h-[28px] w-[180px] rounded-full bg-[var(--color-surface-2)] animate-pulse"
          aria-label="Calculando saúde do projeto…"
        />
      </div>
    );
  }

  if (!health) return null;

  // ── Badge colapsado ──────────────────────────────────────────────────────
  return (
    <>
      <div className="px-4">
        {/* Badge de uma linha — altura 32px, background transparente */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 h-8 w-full text-left"
          aria-expanded={expanded}
          aria-label="Indicador de saúde do projeto"
        >
          {/* Círculo de cor — 10px */}
          <span
            className={`size-2.5 rounded-full shrink-0 ${colorDot(health.color)}`}
          />
          {/* Headline */}
          <span className="text-small text-[var(--color-text-primary)] flex-1 truncate">
            {health.headline}
          </span>
          {/* Chevron */}
          {expanded
            ? <ChevronUp className="size-3.5 text-[var(--color-surface-3)] shrink-0" />
            : <ChevronDown className="size-3.5 text-[var(--color-surface-3)] shrink-0" />
          }
        </button>

        {/* ── Card expandido — inline, empurra conteúdo abaixo ── */}
        {expanded && (
          <div
            className={`mt-1 rounded-lg bg-[var(--color-surface-1)] border-l-4 ${borderLeft(health.color)} px-4 py-3 space-y-2`}
          >
            {/* Cabeçalho com headline e botão de ajuda */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-0.5">
                <p className="text-body font-bold text-[var(--color-text-primary)]">
                  {health.headline}
                </p>
                <p className="text-body text-[var(--color-surface-3)] leading-snug">
                  {health.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setHelpOpen(true); }}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>

            {/* Separador */}
            <div className="border-b border-[var(--color-surface-2)]" />

            {/* Lista de critérios */}
            <ul className="space-y-1.5">
              {health.criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CriterionIcon status={c.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-small font-semibold text-[var(--color-text-primary)]">
                      {c.label}
                    </span>
                    <span className="text-small text-[var(--color-surface-3)] ml-1">
                      — {c.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Bottom sheet de ajuda — padrão do app (FormatP.tsx) ── */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">
                {HELP_CONTENT.title}
              </h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {HELP_CONTENT.paragraphs.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
