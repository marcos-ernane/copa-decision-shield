import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { getProject, updateProject } from '@/lib/projects';
import type { ScenarioType, OperationalLayer } from '@/types/app';

export const Route = createFileRoute('/project/$id/edit')({
  component: EditProject,
});

const SCENARIOS: { value: ScenarioType; label: string }[] = [
  { value: 'fluxo',          label: 'Fluxo' },
  { value: 'processo',       label: 'Processo' },
  { value: 'oferta',         label: 'Oferta' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'pressao',        label: 'Pressão' },
];

const LAYERS: { value: OperationalLayer; label: string }[] = [
  { value: 'operabilidade', label: 'Operabilidade' },
  { value: 'conversao',     label: 'Conversão' },
  { value: 'recorrencia',   label: 'Recorrência' },
  { value: 'escala',        label: 'Escala' },
];

function EditProject() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [north, setNorth] = useState('');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getProject(id);
      if (!p) { navigate({ to: '/' }); return; }
      setName(p.name);
      setNorth(p.north);
      setScenario(p.scenario_type);
      setLayer(p.current_layer);
      setLoading(false);
    })();
  }, [id, navigate]);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 80;
  const northOk = north.trim().length >= 10 && north.trim().length <= 300;
  const canSubmit = nameOk && northOk && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await updateProject(id, {
        name: name.trim(),
        north: north.trim(),
        scenario_type: scenario,
        current_layer: layer,
      });
      navigate({ to: '/project/$id/dashboard', params: { id }, replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-op-black flex flex-col" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/30">
        <BackButton />
        <div>
          <p className="text-label uppercase tracking-wide text-op-gray">Editar projeto</p>
          <h1 className="text-heading text-op-white">{name}</h1>
        </div>
        <CloseButton className="ml-auto" />
      </header>

      <main className="flex-1 px-6 py-6 max-w-md mx-auto w-full space-y-6">
        <div className="space-y-2">
          <label className="text-label text-op-gray uppercase">Nome do projeto</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-op-amber"
          />
        </div>

        <div className="space-y-2">
          <label className="text-label text-op-gray uppercase">
            Vai estar melhor quando…
          </label>
          <VoiceInput value={north} onChange={setNorth} rows={4} />
          <p className="text-label text-op-gray">{north.length}/300</p>
        </div>

        <div className="space-y-2">
          <label className="text-label text-op-gray uppercase">Tipo de cenário</label>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.value}
                onClick={() => setScenario(s.value)}
                className={`rounded-full border px-3 py-1 text-small transition-colors ${
                  scenario === s.value
                    ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                    : 'border-op-gray/30 bg-op-navy text-op-gray hover:opacity-80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label text-op-gray uppercase">Camada operacional</label>
          <div className="flex flex-wrap gap-2">
            {LAYERS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLayer(l.value)}
                className={`rounded-full border px-3 py-1 text-small transition-colors ${
                  layer === l.value
                    ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                    : 'border-op-gray/30 bg-op-navy text-op-gray hover:opacity-80'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
          {submitting ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
        </Button>
      </main>
    </div>
  );
}
