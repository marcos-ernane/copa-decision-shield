// DecisionRecordScreen — PRD-ITEM-06 Etapa 3
// Tela de registro de Decisão Importante (entry_type = 'decision_record').

import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Check, ChevronDown, CircleHelp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BackButton } from '@/components/app/BackButton';
import { saveDecisionRecord } from '@/lib/decisionRecord';
import { listProjects } from '@/lib/projects';
import type { Project } from '@/types/database';
import type { ProjectState } from '@/types/app';

export const Route = createFileRoute('/decision/new')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
    prefill: typeof s.prefill === 'string' ? s.prefill : undefined,
  }),
  component: DecisionRecordScreen,
});

const INACTIVE_STATES: ProjectState[] = ['concluded', 'archived', 'paused'];

const HELP = {
  title: 'Registro de Decisão Importante',
  paragraphs: [
    'Use quando você tomou — ou está prestes a tomar — uma decisão que não é trivial: algo que envolve risco real, impacto duradouro ou dificuldade de reversão.',
    'A decisão: escreva em uma frase. Clareza aqui reduz a distorção do que foi decidido ao longo do tempo.',
    'Por que agora: o contexto que tornou esta decisão necessária neste momento. Evita que você revise a decisão sem considerar as condições em que ela foi tomada.',
    'Maior risco: o que pode dar errado se a decisão estiver incorreta. Nomear o risco não é fraqueza — é o que separa decisão de aposta.',
    'Sinal de validação: o que vai confirmar que foi a escolha certa. Sem isso, qualquer resultado pode ser racionalizado como sucesso.',
    'Quando revisar: um prazo para reavaliar com dados reais — não por arrependimento, mas por disciplina operacional.',
  ],
};

function DecisionRecordScreen() {
  const navigate = useNavigate();
  const { projectId: initialProjectId, prefill } = useSearch({ from: '/decision/new' });

  const [decision, setDecision] = useState(prefill ?? '');
  const [context, setContext] = useState('');
  const [mainRisk, setMainRisk] = useState('');
  const [validationSignal, setValidationSignal] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId ?? null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listProjects()
      .then((all) => setProjects(all.filter((p) => !INACTIVE_STATES.includes(p.state)).sort((a, b) => {
        const ta = a.last_entry_at ? new Date(a.last_entry_at).getTime() : 0;
        const tb = b.last_entry_at ? new Date(b.last_entry_at).getTime() : 0;
        return tb - ta;
      })))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const canSave =
    decision.trim().length >= 5 &&
    context.trim().length >= 5 &&
    mainRisk.trim().length >= 5 &&
    validationSignal.trim().length >= 5 &&
    !saving;

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveDecisionRecord({
        projectId: selectedProjectId,
        content: {
          decision: decision.trim(),
          context: context.trim(),
          main_risk: mainRisk.trim(),
          validation_signal: validationSignal.trim(),
          review_date: reviewDate || undefined,
        },
      });
      toast.success('Decisão registrada.', {
        description: selectedProject
          ? `Vinculada a "${selectedProject.name}".`
          : 'Disponível no Diário para consulta futura.',
      });
      window.dispatchEvent(new CustomEvent('aop:entry-saved'));
      navigate({ to: selectedProject ? '/project/$id/dashboard' : '/', params: selectedProject ? { id: selectedProject.id } : undefined });
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (helpOpen) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#070C12' }}>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 bg-op-navy">
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="p-1 rounded-md hover:bg-op-navy-elevated"
            aria-label="Fechar ajuda"
          >
            <X className="size-5 text-op-gray" />
          </button>
          <h1 className="text-heading text-op-white">{HELP.title}</h1>
        </header>
        <main className="flex-1 px-6 py-6 max-w-md mx-auto w-full space-y-4 overflow-y-auto">
          {HELP.paragraphs.map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#070C12' }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 bg-op-navy">
        <BackButton />
        <div className="flex items-center gap-2 flex-1">
          <BookOpen className="size-4 text-op-amber shrink-0" />
          <h1 className="text-heading text-op-white">Decisão Importante</h1>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0"
        >
          <CircleHelp className="size-3.5" />
          Ajuda
        </button>
      </header>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full space-y-5 pb-24">

        {/* Campo 0 — Vincular a projeto (opcional) */}
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-label text-op-gray uppercase tracking-wide">
              Vincular a projeto
              <span className="text-label text-op-gray/50 normal-case ml-1">(opcional)</span>
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-op-gray/30 bg-op-navy px-3 py-2 text-small text-left transition-colors hover:border-op-gray/60"
              >
                <span className={selectedProject ? 'text-op-white font-semibold' : 'text-op-gray'}>
                  {selectedProject ? selectedProject.name : 'Nenhum projeto'}
                </span>
                <ChevronDown
                  className={[
                    'size-4 text-op-gray shrink-0 transition-transform',
                    dropdownOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
              </button>

              {dropdownOpen && (
                <ul className="absolute z-50 top-full mt-1 w-full rounded-lg border border-op-gray/30 bg-op-navy shadow-lg overflow-y-auto max-h-48">
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedProjectId(null); setDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-small text-op-gray hover:bg-white/5 transition-colors"
                    >
                      <span>Sem projeto</span>
                      {!selectedProjectId && <Check className="size-3.5 text-op-amber" />}
                    </button>
                  </li>
                  <li className="border-t border-op-gray/20" />
                  {projects.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedProjectId(p.id); setDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-small text-op-white hover:bg-white/5 transition-colors"
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        {selectedProjectId === p.id && (
                          <Check className="size-3.5 text-op-amber shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Campo 1 — A decisão */}
        <div className="space-y-1.5">
          <label className="text-label text-op-gray uppercase tracking-wide">
            A decisão <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-op-gray/70">Em uma frase. Sem justificativa ainda.</p>
          <VoiceInput
            value={decision}
            onChange={setDecision}
            placeholder="Em uma frase, qual é a decisão?"
            maxSeconds={15}
            rows={2}
          />
          <p className="text-label text-op-gray/50 text-right">{decision.trim().length}/200</p>
        </div>

        {/* Campo 2 — Por que agora */}
        <div className="space-y-1.5">
          <label className="text-label text-op-gray uppercase tracking-wide">
            Por que agora <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-op-gray/70">O contexto que torna esta decisão necessária neste momento.</p>
          <VoiceInput
            value={context}
            onChange={setContext}
            placeholder="O que tornou esta decisão necessária agora?"
            maxSeconds={30}
            rows={3}
          />
          <p className="text-label text-op-gray/50 text-right">{context.trim().length}/400</p>
        </div>

        {/* Campo 3 — Maior risco */}
        <div className="space-y-1.5">
          <label className="text-label text-op-gray uppercase tracking-wide">
            Maior risco <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-op-gray/70">O que pode dar errado se esta decisão estiver incorreta?</p>
          <VoiceInput
            value={mainRisk}
            onChange={setMainRisk}
            placeholder="Se eu estiver errado, o que acontece?"
            maxSeconds={30}
            rows={3}
          />
          <p className="text-label text-op-gray/50 text-right">{mainRisk.trim().length}/300</p>
        </div>

        {/* Campo 4 — Sinal de validação */}
        <div className="space-y-1.5">
          <label className="text-label text-op-gray uppercase tracking-wide">
            Como saberá que foi certa <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-op-gray/70">Qual sinal concreto vai confirmar que foi a escolha certa?</p>
          <VoiceInput
            value={validationSignal}
            onChange={setValidationSignal}
            placeholder="O sinal de que foi certa será..."
            maxSeconds={30}
            rows={3}
          />
          <p className="text-label text-op-gray/50 text-right">{validationSignal.trim().length}/300</p>
        </div>

        {/* Campo 5 — Quando revisar (opcional) */}
        <div className="space-y-1.5">
          <label className="text-label text-op-gray uppercase tracking-wide">
            Quando revisar
            <span className="text-label text-op-gray/50 normal-case ml-1">(opcional)</span>
          </label>
          <p className="text-label text-op-gray/70">Prazo para reavaliar com dados reais.</p>
          <input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-op-gray/20 bg-op-navy px-3 py-2 text-body text-op-white placeholder:text-op-gray focus:outline-none focus:ring-2 focus:ring-op-amber [color-scheme:dark]"
          />
        </div>

        <Button
          size="lg"
          className="w-full font-semibold text-white"
          style={{ backgroundColor: 'var(--color-brand-blue)' }}
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {saving ? 'Registrando…' : 'REGISTRAR DECISÃO'}
        </Button>
      </main>
    </div>
  );
}
