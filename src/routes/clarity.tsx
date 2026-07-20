// ClarityScreen — Módulo 9 (PRD-MOD-09 v2.0)
// Rota: /clarity?projectId=xxx
// 4 blocos editáveis (M1-M4) + mirror read-only + rodapé Salvar / Compartilhar.
// Mirror nunca vai para exportação.

import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { Brain, Share2, CheckCircle, AlertCircle, RefreshCw, CircleHelp, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getProject, listEntries, listPrinciples } from '@/lib/projects';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import {
  canCompose,
  buildPayload,
  parseResult,
  buildExportText,
} from '@/lib/clarityComposer';
import type { ClarityResult, CompositorPayload } from '@/lib/clarityComposer';
import { saveClaritySession } from '@/lib/register';
import type { Project } from '@/types/database';

export const Route = createFileRoute('/clarity')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : '',
  }),
  component: ClarityScreen,
});

// ─── Help texts per block ─────────────────────────────────────────────────

const BLOCK_HELP: Record<'m1' | 'm2' | 'm3' | 'm4', string> = {
  m1: 'O fato concreto que ancora este diagnóstico. Edite se quiser ajustar a âncora.',
  m2: 'Como você chegou a esta leitura do cenário — o percurso entre os dados e a conclusão.',
  m3: 'O gargalo real, separado do que apenas incomoda. É o que de fato governa o cenário.',
  m4: 'Ação específica, pequena e acompanhável. O que vale tentar primeiro.',
};

const BLOCK_LABELS: Record<'m1' | 'm2' | 'm3' | 'm4', string> = {
  m1: 'M1 — ÂNCORA',
  m2: 'M2 — PERCURSO',
  m3: 'M3 — O QUE GOVERNA',
  m4: 'M4 — PRÓXIMO PASSO',
};

type BlockKey = 'm1' | 'm2' | 'm3' | 'm4';

// ─── Phase state ──────────────────────────────────────────────────────────

type Phase =
  | 'loading'
  | 'no_cycle'
  | 'ai_error'
  | 'editing'
  | 'saving'
  | 'saved'
  | 'no_project';

// ─── Component ────────────────────────────────────────────────────────────

function ClarityScreen() {
  const { projectId } = useSearch({ strict: false }) as { projectId?: string };
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [project, setProject] = useState<Project | null>(null);
  const [result, setResult] = useState<ClarityResult | null>(null);
  const [payload, setPayload] = useState<CompositorPayload | null>(null);
  const [edited, setEdited] = useState<Record<BlockKey, string>>({
    m1: '', m2: '', m3: '', m4: '',
  });
  const [openHelp, setOpenHelp] = useState<BlockKey | null>(null);
  const [copied, setCopied] = useState(false);

  const compose = useCallback(async (
    proj: Project,
    pay: CompositorPayload,
  ) => {
    setPhase('loading');
    const raw = await askFacilitator('CLARITY_COMPOSER', pay as unknown as Record<string, unknown>);
    if (!raw) {
      setPhase('ai_error');
      return;
    }
    const parsed = parseResult(raw);
    setResult(parsed);
    setEdited({ m1: parsed.m1, m2: parsed.m2, m3: parsed.m3, m4: parsed.m4 });
    setPhase('editing');
  }, []);

  useEffect(() => {
    if (!projectId) {
      setPhase('no_project');
      return;
    }
    async function load() {
      const [proj, entries, principles] = await Promise.all([
        getProject(projectId!),
        listEntries(projectId!),
        listPrinciples(projectId!),
      ]);
      if (!proj) {
        setPhase('no_project');
        return;
      }
      setProject(proj);
      if (!canCompose(entries)) {
        setPhase('no_cycle');
        return;
      }
      const pay = buildPayload(proj, entries, principles);
      setPayload(pay);
      await compose(proj, pay);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSave() {
    if (!project || phase !== 'editing') return;
    setPhase('saving');
    await saveClaritySession(project.id, edited);
    setPhase('saved');
  }

  async function handleShare() {
    if (!project || !result) return;
    const text = buildExportText(
      { ...result, m1: edited.m1, m2: edited.m2, m3: edited.m3, m4: edited.m4 },
      project,
    );
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'Clareza Operacional', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* user cancel */ }
  }

  function handleEdit(key: BlockKey, value: string) {
    setEdited((prev) => ({ ...prev, [key]: value }));
    if (phase === 'saved') setPhase('editing');
  }

  function toggleHelp(key: BlockKey) {
    setOpenHelp((prev) => (prev === key ? null : key));
  }

  // ── Layout shell ──
  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#070C12' }}>
      <header
        className="sticky top-0 z-10 border-b border-border"
        style={{ backgroundColor: '#070C12' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 max-w-md mx-auto">
          <BackButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-heading font-semibold text-foreground">Clareza Operacional</h1>
            {project && (
              <p className="text-label text-muted-foreground truncate">{project.name}</p>
            )}
          </div>
          <Brain className="size-5 text-muted-foreground shrink-0" />
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-4">
        {/* Loading */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="size-8 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
            <p className="text-body text-muted-foreground">Compondo clareza…</p>
          </div>
        )}

        {/* No project */}
        {phase === 'no_project' && (
          <ErrorState
            title="Projeto não encontrado"
            description="Verifique se o projeto existe e tente novamente."
            onBack={() => navigate({ to: '/' })}
          />
        )}

        {/* No open cycle */}
        {phase === 'no_cycle' && (
          <ErrorState
            title="Ciclo COPA incompleto"
            description={
              'Para gerar clareza operacional você precisa de:\n' +
              '• Pelo menos uma entrada de Captura (C)\n' +
              '• Pelo menos uma entrada de Organização (O)\n' +
              '• Uma IMV em andamento (P) sem Aferição vinculada'
            }
            onBack={() => navigate({ to: '/', search: {} })}
          />
        )}

        {/* AI error */}
        {phase === 'ai_error' && project && payload && (
          <div className="space-y-4 py-8 text-center">
            <AlertCircle className="size-10 text-brand-amber mx-auto" />
            <p className="text-body text-foreground font-medium">
              Não foi possível gerar
            </p>
            <p className="text-small text-muted-foreground">
              O assistente não respondeu. Verifique sua conexão e tente novamente.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => void compose(project, payload)}
                className="w-full gap-2"
              >
                <RefreshCw className="size-4" /> Tentar novamente
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: '/', search: {} })} className="w-full">
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* Editing / Saved */}
        {(phase === 'editing' || phase === 'saving' || phase === 'saved') && result && (
          <>
            {(['m1', 'm2', 'm3', 'm4'] as BlockKey[]).map((key) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-label font-semibold text-muted-foreground uppercase tracking-wide">
                    {BLOCK_LABELS[key]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ajuda: ${BLOCK_LABELS[key]}`}
                    onClick={() => toggleHelp(key)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {openHelp === key
                      ? <X className="size-3.5" />
                      : <CircleHelp className="size-3.5" />
                    }
                  </button>
                </div>
                {openHelp === key && (
                  <p className="text-label text-muted-foreground leading-relaxed">
                    {BLOCK_HELP[key]}
                  </p>
                )}
                <Textarea
                  value={edited[key]}
                  onChange={(e) => handleEdit(key, e.target.value)}
                  rows={4}
                  className="text-body bg-card border-border resize-none"
                  placeholder={BLOCK_LABELS[key]}
                />
              </div>
            ))}

            {/* Mirror — read-only, not exported */}
            {result.mirror && (
              <div className="rounded-md border border-brand-amber/30 bg-brand-amber/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-label font-semibold text-brand-amber uppercase tracking-wide">
                    ANTES DE AGIR
                  </span>
                  <span className="text-label text-muted-foreground">(uso interno)</span>
                </div>
                <p className="text-small text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {result.mirror}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {(phase === 'editing' || phase === 'saving' || phase === 'saved') && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 border-t border-border z-20"
          style={{ backgroundColor: '#070C12' }}
        >
          <div className="max-w-md mx-auto flex gap-3">
            <Button
              onClick={handleSave}
              disabled={phase === 'saving'}
              className="flex-1 gap-2"
            >
              {phase === 'saved'
                ? <><CheckCircle className="size-4" /> Salvo</>
                : phase === 'saving'
                ? <><div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Salvando…</>
                : <><CheckCircle className="size-4" /> Salvar</>
              }
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 gap-2"
              disabled={!result}
            >
              {copied
                ? <><CheckCircle className="size-4" /> Copiado!</>
                : <><Share2 className="size-4" /> Compartilhar</>
              }
            </Button>
          </div>
          {!Capacitor.isNativePlatform() && (
            <p className="text-label text-center text-muted-foreground mt-2">
              Compartilhar copia o texto para a área de transferência. Mirror não é incluído.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Error state helper ───────────────────────────────────────────────────

function ErrorState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-10 text-brand-amber" />
      <div className="space-y-2">
        <p className="text-body text-foreground font-medium">{title}</p>
        <p className="text-small text-muted-foreground whitespace-pre-line">{description}</p>
      </div>
      <Button variant="outline" onClick={onBack} className="mt-2">
        Voltar
      </Button>
    </div>
  );
}
