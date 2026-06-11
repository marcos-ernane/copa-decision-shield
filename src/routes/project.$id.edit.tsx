import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProject, updateProject } from '@/lib/projects';
import type { ScenarioType } from '@/types/app';

export const Route = createFileRoute('/project/$id/edit')({
  component: EditProject,
});

const SCENARIOS: { value: ScenarioType | null; label: string }[] = [
  { value: 'fluxo', label: 'Fluxo' },
  { value: 'processo', label: 'Processo' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'pressao', label: 'Pressão' },
  { value: null, label: 'Indefinido' },
];

function EditProject() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();

  const [name, setName] = useState('');
  const [north, setNorth] = useState('');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getProject(id);
      if (!p) { navigate({ to: '/' }); return; }
      setName(p.name);
      setNorth(p.north);
      setScenario(p.scenario_type);
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
      await updateProject(id, { name: name.trim(), north: north.trim(), scenario_type: scenario });
      navigate({ to: '/project/$id/dashboard', params: { id }, replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Editar projeto</h1>
      </header>

      <main className="flex-1 px-6 py-6 max-w-md mx-auto w-full space-y-6">
        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">Nome do projeto</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">
            Vai estar melhor quando…
          </label>
          <textarea
            value={north}
            onChange={(e) => setNorth(e.target.value)}
            maxLength={300}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-label text-muted-foreground">{north.length}/300</p>
        </div>

        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">
            Tipo de cenário
          </label>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => setScenario(s.value)}
                className={`rounded-full border px-3 py-1 text-small transition-colors ${
                  scenario === s.value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground hover:bg-accent'
                }`}
              >
                {s.label}
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
