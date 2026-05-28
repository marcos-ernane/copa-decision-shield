// ConcludeFlow — orquestrador.

import { useEffect, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { getProject, listEntries, listPrinciples } from '@/lib/projects';
import {
  runPreConcludeChecks,
  concludeProject,
  type ConcludeResult,
  type PreConcludeCheck,
} from '@/lib/conclude';
import type { Project, Entry, Principle, NorthReached } from '@/types/database';
import { PreConcludeChecks } from './PreConcludeChecks';
import { ConcludeNorth } from './ConcludeNorth';
import { ConcludeRetrospective } from './ConcludeRetrospective';
import { ConcludePreview } from './ConcludePreview';
import { ConcludeCelebration } from './ConcludeCelebration';
import { RegistrationNudge } from '@/components/RegistrationNudge';

type Step = 'checks' | 'north' | 'retro' | 'preview' | 'done';

interface Props { projectId: string; }

export function ConcludeFlow({ projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [checks, setChecks] = useState<PreConcludeCheck[]>([]);
  const [step, setStep] = useState<Step>('checks');
  const [northReached, setNorthReached] = useState<NorthReached | null>(null);
  const [whatHappened, setWhatHappened] = useState('');
  const [restartNote, setRestartNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ConcludeResult | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, e, pr] = await Promise.all([
        getProject(projectId),
        listEntries(projectId),
        listPrinciples(projectId),
      ]);
      if (!p) return;
      setProject(p);
      setEntries(e);
      setPrinciples(pr);
      setChecks(runPreConcludeChecks(p, e, pr));
      // Sem pendências → pula direto para a Tela 1
      const passes = runPreConcludeChecks(p, e, pr).every((c) => c.passed);
      if (passes) setStep('north');
    })();
  }, [projectId]);

  if (!project) {
    return <div className="px-4 py-6 text-small text-muted-foreground">Carregando…</div>;
  }

  async function confirm() {
    if (!northReached) return;
    setSaving(true);
    try {
      const r = await concludeProject(project!, entries, principles, {
        northReached,
        whatHappened,
        restartNote,
      });
      setResult(r);
      setStep('done');
      // RegistrationNudge momento 2 — primeiro capítulo, usuário guest
      if (r.isGuest && r.isFirstConcluded) {
        setShowNudge(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <p className="text-label uppercase tracking-wide text-muted-foreground">Concluir projeto</p>
            <h1 className="text-heading text-foreground">{project.name}</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-md mx-auto">
        {step === 'checks' && (
          <PreConcludeChecks
            projectId={project.id}
            checks={checks}
            onContinue={() => setStep('north')}
          />
        )}
        {step === 'north' && (
          <ConcludeNorth
            initialNorth={northReached}
            initialWhatHappened={whatHappened}
            onNext={({ northReached: n, whatHappened: w }) => {
              setNorthReached(n);
              setWhatHappened(w);
              setStep('retro');
            }}
            onBack={() => setStep('checks')}
          />
        )}
        {step === 'retro' && (
          <ConcludeRetrospective
            initial={restartNote}
            onNext={(t) => {
              setRestartNote(t);
              setStep('preview');
            }}
            onBack={() => setStep('north')}
          />
        )}
        {step === 'preview' && northReached && (
          <ConcludePreview
            project={project}
            entries={entries}
            principles={principles}
            northReached={northReached}
            whatHappened={whatHappened}
            restartNote={restartNote}
            onConfirm={confirm}
            onBack={() => setStep('retro')}
            saving={saving}
          />
        )}
        {step === 'done' && result && <ConcludeCelebration result={result} />}
      </main>

      <RegistrationNudge
        open={showNudge}
        moment={2}
        onDismiss={() => setShowNudge(false)}
      />
    </div>
  );
}
