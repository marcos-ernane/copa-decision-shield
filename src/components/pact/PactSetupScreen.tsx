// PactSetupScreen — configuração do Pacto Semanal por projeto.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
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
const PHASE_QUESTIONS: Record<PactPhase, string> = {
  capture: 'O que está acontecendo de verdade?',
  organize: 'Do que eu tenho aqui, o que importa?',
  prove: 'Qual é o menor teste que consigo fazer?',
  assess: 'O que mudou e o que eu faço com isso?',
};
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface Props { projectId: string }

export function PactSetupScreen({ projectId }: Props) {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Pacto Semanal</p>
          <h1 className="text-heading text-foreground">{project.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        <section className="space-y-3">
          <p className="text-body text-foreground font-medium">
            O app vai te lembrar nos dias configurados.
          </p>
          <p className="text-small text-muted-foreground">
            Você receberá uma notificação por fase, no horário escolhido. Ao abrir, cai direto no projeto.
          </p>
          <p className="text-small text-muted-foreground">
            O dashboard registra o que foi feito na semana. Cada fase concluída aparece marcada automaticamente na Semana do Operador.
          </p>
        </section>

        <section className="space-y-3">
          {PHASES.map((phase) => {
            const c = cycle[phase];
            return (
              <div key={phase} className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <select
                    value={c.day_of_week}
                    onChange={(e) => updatePhase(phase, { day_of_week: Number(e.target.value) })}
                    className="rounded-xl bg-op-navy border border-op-gray/30 px-2 py-2 text-small text-op-white"
                    aria-label={`Dia de ${PHASE_LABELS[phase]}`}
                  >
                    {DAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={c.time_hour}
                    onChange={(e) => updatePhase(phase, { time_hour: Number(e.target.value) })}
                    className="rounded-xl bg-op-navy border border-op-gray/30 px-2 py-2 text-small text-op-white"
                    aria-label={`Horário de ${PHASE_LABELS[phase]}`}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="text-small text-foreground ml-auto uppercase tracking-wide font-medium">
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
                <p className="text-[11px] text-op-gray">{PHASE_QUESTIONS[phase]}</p>
              </div>
            );
          })}
        </section>

        <button
          type="button"
          disabled={saving}
          onClick={() => void commit()}
          className="w-full rounded-xl bg-op-amber text-op-black font-semibold py-3 text-body disabled:opacity-40"
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
