// ClarityScreen — Módulo 9 (PRD-MOD-09 v2.0)
// Rota: /clarity?projectId=xxx
// Modo leitura (padrão) + modo edição por bloco + mirror read-only + rodapé Salvar / Compartilhar.
// Mirror nunca vai para exportação.

import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { Brain, Copy, CheckCircle, AlertCircle, RefreshCw, CircleHelp, X, ChevronRight, Pencil } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getProject, listEntries, listPrinciples, listProjects } from '@/lib/projects';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import type { Project as ProjectType } from '@/types/database';
import {
  canCompose,
  buildPayload,
  parseResult,
  buildExportText,
} from '@/lib/clarityComposer';
import type { ClarityResult, CompositorPayload } from '@/lib/clarityComposer';
import { saveClaritySession } from '@/lib/register';

export const Route = createFileRoute('/clarity')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : '',
  }),
  component: ClarityScreen,
});

// ─── Block metadata ───────────────────────────────────────────────────────────

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

// ─── Phase state ──────────────────────────────────────────────────────────────

type Phase =
  | 'picking'
  | 'loading'
  | 'no_cycle'
  | 'ai_error'
  | 'editing'
  | 'saving'
  | 'saved'
  | 'no_project';

// ─── Component ────────────────────────────────────────────────────────────────

function ClarityScreen() {
  const { projectId } = useSearch({ strict: false }) as { projectId?: string };
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>(projectId ? 'loading' : 'picking');
  const [project, setProject] = useState<ProjectType | null>(null);
  const [pickerProjects, setPickerProjects] = useState<ProjectType[]>([]);
  const [result, setResult] = useState<ClarityResult | null>(null);
  const [payload, setPayload] = useState<CompositorPayload | null>(null);
  const [edited, setEdited] = useState<Record<BlockKey, string>>({ m1: '', m2: '', m3: '', m4: '' });
  const [openHelp, setOpenHelp] = useState<BlockKey | null>(null);
  const [copied, setCopied] = useState(false);
  // Leitura (false) é o modo padrão ao receber a resposta da IA.
  // Edição (true) é ativada pelo usuário para ajustar os blocos.
  const [editMode, setEditMode] = useState(false);
  const [restoredFromSaved, setRestoredFromSaved] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const compose = useCallback(async (proj: ProjectType, pay: CompositorPayload) => {
    setPhase('loading');
    setEditMode(false);
    setRestoredFromSaved(false);
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
      void listProjects().then((all) => {
        const active = all.filter((p) => !['archived', 'concluded'].includes(p.state));
        setPickerProjects(active);
        setPhase('picking');
      });
      return;
    }
    async function load() {
      const [proj, entries, principles] = await Promise.all([
        getProject(projectId!),
        listEntries(projectId!),
        listPrinciples(projectId!),
      ]);
      if (!proj) { setPhase('no_project'); return; }
      setProject(proj);
      if (!canCompose(entries)) { setPhase('no_cycle'); return; }

      const pay = buildPayload(proj, entries, principles);
      setPayload(pay);

      // Restaura a sessão salva mais recente, se existir.
      // Evita chamar a IA desnecessariamente ao voltar para a tela.
      type SessionContent = { kind: string; m1?: string; m2?: string; m3?: string; m4?: string };
      const existing = [...entries]
        .filter((e) => {
          const c = e.content as SessionContent;
          return e.entry_type === 'passive' && c?.kind === 'clarity_session';
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (existing) {
        const c = existing.content as SessionContent;
        const restored: ClarityResult = {
          m1: c.m1 ?? '', m2: c.m2 ?? '', m3: c.m3 ?? '', m4: c.m4 ?? '',
          mirror: null, raw: '',
        };
        setResult(restored);
        setEdited({ m1: restored.m1, m2: restored.m2, m3: restored.m3, m4: restored.m4 });
        setRestoredFromSaved(true);
        setPhase('editing');
        return;
      }

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

  const hasContent = phase === 'editing' || phase === 'saving' || phase === 'saved';

  // ── Layout shell ──
  return (
    <div className="min-h-screen pb-48" style={{ backgroundColor: '#070C12' }}>
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
          {/* Alterna entre modo leitura e modo edição */}
          {hasContent && result && (
            <button
              type="button"
              aria-label={editMode ? 'Ver relatório' : 'Editar blocos'}
              onClick={() => { setEditMode((v) => !v); setOpenHelp(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded shrink-0"
            >
              {editMode
                ? <Brain className="size-5" />
                : <Pencil className="size-4" />
              }
            </button>
          )}
          {!hasContent && <Brain className="size-5 text-muted-foreground shrink-0" />}
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-4">

        {/* Project picker */}
        {phase === 'picking' && (
          <div className="space-y-3 pt-2">
            <p className="text-small text-muted-foreground">
              Selecione um projeto ativo para gerar clareza operacional.
            </p>
            {pickerProjects.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-4 space-y-2 text-center">
                <p className="text-small text-muted-foreground">Nenhum projeto ativo encontrado.</p>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/' })}
                  className="text-small text-[color:var(--color-brand-blue)] hover:underline"
                >
                  Ir para Início →
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {pickerProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/clarity', search: { projectId: p.id } as never })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-op-gray/30 bg-op-navy hover:opacity-80 transition-opacity text-left"
                    >
                      <Brain className="size-5 text-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-small text-foreground font-medium truncate">{p.name}</p>
                        {p.north && (
                          <p className="text-label text-muted-foreground line-clamp-1">{p.north}</p>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
            <p className="text-body text-foreground font-medium">Não foi possível gerar</p>
            <p className="text-small text-muted-foreground">
              O assistente não respondeu. Verifique sua conexão e tente novamente.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => void compose(project, payload)} className="w-full gap-2">
                <RefreshCw className="size-4" /> Tentar novamente
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: '/', search: {} })} className="w-full">
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* ── Conteúdo principal ── */}
        {hasContent && result && (
          <>
            {/* MODO LEITURA — relatório contínuo (padrão) */}
            {!editMode && (
              <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                {/* Norte do projeto — contexto fixo no topo do relatório */}
                {project?.north && (
                  <div className="px-4 py-3 bg-muted/20">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                      Norte
                    </p>
                    <p className="text-small text-foreground/80 leading-relaxed italic">
                      {project.north}
                    </p>
                  </div>
                )}

                {/* Banner: sessão restaurada — opção de regenerar */}
                {restoredFromSaved && (
                  <div className="px-4 py-2.5 flex items-center justify-between bg-muted/30">
                    <p className="text-label text-muted-foreground">Última sessão restaurada</p>
                    {project && payload && (
                      <button
                        type="button"
                        onClick={() => {
                          // Mostra confirmação se: (a) veio de sessão salva — há dados que
                          // valem preservar mesmo sem nova edição — ou (b) o usuário editou
                          // algo em cima de uma resposta fresca da IA.
                          const hasEdits = restoredFromSaved || (result && (
                            edited.m1 !== result.m1 || edited.m2 !== result.m2 ||
                            edited.m3 !== result.m3 || edited.m4 !== result.m4
                          ));
                          if (hasEdits) { setShowRegenConfirm(true); return; }
                          void compose(project, payload);
                        }}
                        className="text-label text-[color:var(--color-brand-blue)] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="size-3" /> Regenerar
                      </button>
                    )}
                  </div>
                )}
                {(['m1', 'm2', 'm3', 'm4'] as BlockKey[]).map((key) => (
                  <div key={key} className="px-4 py-4 space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">
                      {BLOCK_LABELS[key]}
                    </p>
                    <p className="text-body text-foreground leading-relaxed whitespace-pre-wrap">
                      {edited[key] || <span className="italic text-muted-foreground">— vazio —</span>}
                    </p>
                  </div>
                ))}

                {result.mirror && (
                  <div className="px-4 py-4 space-y-1.5 bg-brand-amber/5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-label font-semibold text-brand-amber uppercase tracking-wide">
                        ANTES DE AGIR
                      </p>
                      <span className="text-label text-muted-foreground">(uso interno)</span>
                    </div>
                    <p className="text-small text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {result.mirror}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MODO EDIÇÃO — textareas individuais */}
            {editMode && (
              <div className="space-y-4">
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
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirmação antes de regenerar quando há edições */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar diagnóstico?</AlertDialogTitle>
            <AlertDialogDescription>
              Você fez edições na sessão atual. Se regenerar, as edições serão perdidas
              e um novo diagnóstico será gerado pela IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRegenConfirm(false);
                if (project && payload) void compose(project, payload);
              }}
            >
              Continuar e regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer — bottom-16 para ficar acima do BottomNav (h-16) */}
      {hasContent && (
        <div
          className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-3 border-t border-border z-20"
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
                : <><Copy className="size-4" /> Copiar</>
              }
            </Button>
          </div>
          {!Capacitor.isNativePlatform() && (
            <p className="text-label text-center text-muted-foreground mt-1">
              Copie o texto para a área de transferência e cole onde quiser.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Error state helper ───────────────────────────────────────────────────────

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
