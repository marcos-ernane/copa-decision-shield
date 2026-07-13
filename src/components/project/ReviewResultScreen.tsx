// ReviewResultScreen — PRD-ITEM-01 v2.0 — Ciclo Aberto de APA, Etapa 4.
// Registra quick_review para uma IMV (structured_P) sem resultado.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { listEntries } from '@/lib/projects';
import { saveQuickReview } from '@/lib/register';
import type { QuickReviewExpectation } from '@/lib/register';
import type { Entry } from '@/types/database';

interface Props {
  projectId: string;
  structuredPId: string;
}

type SavedState = {
  done: true;
  elevated: boolean;
};

const EXPECTATION_OPTIONS: { value: QuickReviewExpectation; label: string }[] = [
  { value: 'yes',     label: 'Sim'          },
  { value: 'partial', label: 'Parcialmente' },
  { value: 'no',      label: 'Não'          },
];

export function ReviewResultScreen({ projectId, structuredPId }: Props) {
  const navigate = useNavigate();
  const [imvEntry, setImvEntry] = useState<Entry | null>(null);
  const [whatHappened, setWhatHappened] = useState('');
  const [metExpectation, setMetExpectation] = useState<QuickReviewExpectation | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const entries = await listEntries(projectId);
      const entry = entries.find((e) => e.id === structuredPId && e.entry_type === 'structured_P');
      if (!entry) {
        navigate({ to: '/project/$id/dashboard', params: { id: projectId } });
        return;
      }
      setImvEntry(entry);
    })();
  }, [projectId, structuredPId, navigate]);

  // Quando "Salvar e aprofundar" é acionado, navega automaticamente para o FormatA
  useEffect(() => {
    if (!saved?.elevated) return;
    void navigate({
      to: '/register/structured',
      search: { projectId, format: 'A', linkedTo: structuredPId } as never,
    });
  }, [saved, navigate, projectId, structuredPId]);

  async function handleSave(elevateToApa: boolean) {
    if (!metExpectation || !whatHappened.trim() || !nextStep.trim() || !imvEntry) return;
    setSaving(true);
    setError(null);
    try {
      await saveQuickReview(
        projectId,
        structuredPId,
        {
          what_happened: whatHappened.trim(),
          met_expectation: metExpectation,
          next_step: nextStep.trim(),
          elevated_to_apa: elevateToApa,
          linked_structured_p_id: structuredPId,
        },
        imvEntry.scenario_type_at_entry ?? null,
        imvEntry.layer_at_entry ?? null,
      );
      setSaved({ done: true, elevated: elevateToApa });
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (!imvEntry) return null;

  const imvContent = imvEntry.content as { action?: string; metric?: string; deadline?: string | null };
  const deadlineLabel = imvContent.deadline
    ? (() => {
        const d = new Date(imvContent.deadline);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      })()
    : null;

  const canSubmit = !!metExpectation && whatHappened.trim().length > 0 && nextStep.trim().length > 0;

  // ── Tela de sucesso ──
  if (saved) {
    return (
      <div className="min-h-screen bg-op-black flex flex-col" style={{ backgroundColor: '#070C12' }}>
        <header className="flex items-center px-4 py-3 border-b border-border">
          <BackButton />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <CheckCircle2 size={48} style={{ color: '#16A34A' }} />
          <div className="space-y-2">
            <h1 className="text-title text-op-white">Resultado registrado</h1>
            <p className="text-small text-op-gray">
              O ciclo da IMV foi fechado com uma revisão rápida.
            </p>
          </div>
          <div className="w-full space-y-3 max-w-sm">
            {!saved.elevated && (
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: '/register/structured',
                    search: { projectId, format: 'A', linkedTo: structuredPId } as never,
                  })
                }
                className="w-full rounded-xl border border-op-gray/30 py-3 text-small font-semibold text-op-gray hover:text-op-white hover:border-op-gray/60 transition-colors"
              >
                Aprofundar com APA completa
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void navigate({ to: '/project/$id/dashboard', params: { id: projectId } })
              }
              className="w-full rounded-xl py-3 text-small font-semibold text-op-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-brand-blue)' }}
            >
              Voltar ao projeto
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Formulário ──
  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12' }}>
      <header className="flex items-center px-4 py-3 border-b border-border">
        <BackButton />
        <h1 className="text-heading text-op-white ml-3">Revisar resultado</h1>
      </header>

      <main className="px-6 py-6 space-y-6 max-w-md mx-auto">
        {/* Contexto da IMV */}
        <section
          className="rounded-md bg-op-navy p-4 space-y-2"
          style={{ borderLeft: '4px solid #D97706' }}
        >
          <p
            className="uppercase tracking-wide font-medium"
            style={{ color: 'var(--color-surface-3)', fontSize: 11 }}
          >
            IMV EM ANÁLISE
          </p>
          <p className="text-small text-op-white">{imvContent.action ?? '—'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-label text-op-gray">
            {imvContent.metric && (
              <span>
                Métrica: <span className="text-op-white">{imvContent.metric}</span>
              </span>
            )}
            {deadlineLabel && (
              <span>
                Prazo: <span className="text-op-white">{deadlineLabel}</span>
              </span>
            )}
          </div>
        </section>

        {/* Campo: O que aconteceu */}
        <section className="space-y-2">
          <label className="text-label text-op-gray uppercase block">
            O que aconteceu?
          </label>
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value.slice(0, 300))}
            placeholder="Descreva o resultado observado — fatos, sem interpretação"
            rows={4}
            className="w-full rounded-md bg-op-navy border border-op-gray/30 px-3 py-2.5 text-small text-op-white placeholder:text-op-gray/50 resize-none focus:outline-none focus:border-op-gray/60 transition-colors"
          />
          <p className="text-label text-op-gray text-right">
            {whatHappened.length}/300
          </p>
        </section>

        {/* Campo: A métrica foi atingida? */}
        <section className="space-y-2">
          <p className="text-label text-op-gray uppercase">
            A métrica foi atingida?
          </p>
          <div className="flex gap-2">
            {EXPECTATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMetExpectation(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-small font-semibold border transition-colors ${
                  metExpectation === opt.value
                    ? 'border-op-cyan text-op-cyan bg-op-navy-elevated'
                    : 'border-op-gray/30 text-op-gray hover:text-op-white hover:border-op-gray/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Campo: Próximo passo */}
        <section className="space-y-2">
          <label className="text-label text-op-gray uppercase block">
            Próximo passo
          </label>
          <textarea
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value.slice(0, 200))}
            placeholder="O que você vai fazer com base neste resultado?"
            rows={3}
            className="w-full rounded-md bg-op-navy border border-op-gray/30 px-3 py-2.5 text-small text-op-white placeholder:text-op-gray/50 resize-none focus:outline-none focus:border-op-gray/60 transition-colors"
          />
          <p className="text-label text-op-gray text-right">
            {nextStep.length}/200
          </p>
        </section>

        {error && (
          <p className="text-small text-red-400">{error}</p>
        )}

        {/* Ações */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={!canSubmit || saving}
            onClick={() => void handleSave(false)}
            className="w-full rounded-xl py-3 text-small font-semibold text-op-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-brand-blue)' }}
          >
            {saving ? 'Salvando…' : 'Salvar resultado'}
          </button>
          <button
            type="button"
            disabled={!canSubmit || saving}
            onClick={() => void handleSave(true)}
            className="w-full rounded-xl border border-op-gray/30 py-3 text-small font-semibold text-op-gray disabled:opacity-40 hover:text-op-white hover:border-op-gray/60 transition-colors"
          >
            Salvar e aprofundar com APA completa
          </button>
        </div>
      </main>
    </div>
  );
}
