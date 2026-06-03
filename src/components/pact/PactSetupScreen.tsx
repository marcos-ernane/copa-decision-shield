// PactSetupScreen — configuração do Pacto Semanal por projeto.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { getProject } from '@/lib/projects';
import {
  activatePact, updatePactConfig, deactivatePact, getCycle, PHASES,
} from '@/lib/pact';
import type { Project } from '@/types/database';
import type { PactPhase, WeeklyCycle } from '@/types/app';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PHASE_LABELS: Record<PactPhase, string> = {
  capture: 'Captura',
  organize: 'Organização',
  prove: 'Prova',
  assess: 'Aferição',
};
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface Props { projectId: string }

export function PactSetupScreen({ projectId }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getProject(projectId);
      if (!p) { navigate({ to: '/' }); return; }
      setProject(p);
      setCycle(getCycle(p));
    })();
  }, [projectId, navigate]);

  if (!project || !cycle) return null;

  const isEditing = project.pact_enabled;

  function updatePhase(phase: PactPhase, patch: { day_of_week?: number; time_hour?: number }) {
    if (!cycle) return;
    setCycle({ ...cycle, [phase]: { ...cycle[phase], ...patch } });
  }

  async function commit() {
    if (!cycle) return;
    setSaving(true);
    try {
      if (isEditing) {
        await updatePactConfig(projectId, cycle);
      } else {
        await activatePact(projectId, cycle);
      }
      navigate({ to: '/project/$id/dashboard', params: { id: projectId } });
    } finally { setSaving(false); }
  }

  async function turnOff() {
    setSaving(true);
    try {
      await deactivatePact(projectId);
      navigate({ to: '/project/$id/dashboard', params: { id: projectId } });
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Pacto Semanal</p>
          <h1 className="text-heading text-foreground">{project.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        <section className="space-y-2">
          <p className="text-body text-foreground">
            Rotina de 20 min por semana — 5 min por fase, cada uma num dia diferente.
          </p>
          <p className="text-small text-muted-foreground">
            Configure o dia e horário ideal para cada fase do COPA.
          </p>
        </section>

        <section className="space-y-3">
          {PHASES.map((phase) => {
            const c = cycle[phase];
            return (
              <div key={phase} className="rounded-md border border-border bg-card p-3 flex items-center gap-3">
                <select
                  value={c.day_of_week}
                  onChange={(e) => updatePhase(phase, { day_of_week: Number(e.target.value) })}
                  className="rounded-md bg-background border border-border px-2 py-2 text-small text-foreground"
                  aria-label={`Dia de ${PHASE_LABELS[phase]}`}
                >
                  {DAY_LABELS.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
                <select
                  value={c.time_hour}
                  onChange={(e) => updatePhase(phase, { time_hour: Number(e.target.value) })}
                  className="rounded-md bg-background border border-border px-2 py-2 text-small text-foreground"
                  aria-label={`Horário de ${PHASE_LABELS[phase]}`}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
                <span className="text-small text-foreground ml-auto uppercase tracking-wide">
                  {PHASE_LABELS[phase]}
                </span>
              </div>
            );
          })}
        </section>

        <button
          type="button"
          disabled={saving}
          onClick={() => void commit()}
          className="w-full rounded-md bg-foreground text-background py-3 text-body disabled:opacity-40"
        >
          {saving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Ativar pacto'}
        </button>

        {isEditing && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void turnOff()}
            className="w-full text-small text-muted-foreground hover:text-foreground py-2"
          >
            Desativar pacto
          </button>
        )}
      </main>
    </div>
  );
}
