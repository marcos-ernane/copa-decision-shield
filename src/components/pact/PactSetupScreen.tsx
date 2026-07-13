// PactSetupScreen — configuração do Pacto Semanal por projeto.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CircleHelp, X } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
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
  const [helpOpen, setHelpOpen] = useState(false);

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
        <CloseButton className="ml-auto" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-body text-foreground font-medium">
              O app vai te lembrar nos dias configurados.
            </p>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 mt-0.5"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
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

      {/* Bottom sheet de ajuda */}
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
                Como o Pacto Semanal funciona?
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
            <p className="text-body text-op-white leading-relaxed">
              O Pacto define um dia por fase COPA na semana. Você escolhe o dia e o horário de cada fase — o app envia um lembrete no momento configurado.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              Quando você registra a fase correspondente no dia configurado, o app a marca automaticamente como cumprida na Semana do Operador.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              Se fizer as fases em outros dias, os registros continuam valendo — apenas o marcador automático de "feito no dia certo" não é acionado.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              Desativar o pacto não apaga registros anteriores. Apenas remove os lembretes automáticos. Você pode reativar a qualquer momento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
