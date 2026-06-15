// NewProjectScreen — criação de projeto com state='new' (REQ-PROJ-01).

import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { createProject } from '@/lib/projects';
import type { ScenarioType, OperationalLayer } from '@/types/app';

export const Route = createFileRoute('/project/new')({
  component: NewProject,
});

const SCENARIOS: { value: ScenarioType; label: string; description: string }[] = [
  { value: 'fluxo',          label: 'Fluxo',          description: 'Movimento de atenção ou demanda' },
  { value: 'processo',       label: 'Processo',        description: 'Etapas em sequência' },
  { value: 'oferta',         label: 'Oferta',          description: 'Produto, serviço ou decisão' },
  { value: 'relacionamento', label: 'Relacionamento',  description: 'Interação entre pessoas' },
  { value: 'pressao',        label: 'Pressão',         description: 'Urgência ou risco ativo' },
];

const LAYERS: { value: OperationalLayer; label: string; description: string }[] = [
  { value: 'operabilidade', label: 'Operabilidade', description: 'O básico não funciona' },
  { value: 'conversao',     label: 'Conversão',     description: 'Não vira resultado' },
  { value: 'recorrencia',   label: 'Recorrência',   description: 'Não se repete' },
  { value: 'escala',        label: 'Escala',        description: 'Não cresce' },
];

function NewProject() {
  const navigate = useNavigate();
  const router = useRouter();
  const [name, setName] = useState('');
  const [north, setNorth] = useState('');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [notifyAuto, setNotifyAuto] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 80;
  const northOk = north.trim().length >= 10 && north.trim().length <= 300;
  const canSubmit = nameOk && northOk && scenario !== null && layer !== null && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name,
        north,
        scenario_type: scenario,
        current_layer: layer,
      });
      void notifyAuto;
      navigate({ to: '/project/$id/dashboard', params: { id: project.id } });
    } finally {
      setSubmitting(false);
    }
  }

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
        <h1 className="text-heading text-foreground">Novo projeto</h1>
      </header>

      <main className="flex-1 px-6 py-6 max-w-md mx-auto w-full space-y-6">
        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">Nome do projeto</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agenda de clientes"
            maxLength={80}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">
            Vai estar melhor quando…
          </label>
          <VoiceInput value={north} onChange={setNorth} rows={4} />
          <p className="text-label text-muted-foreground">{north.length}/300</p>
        </div>

        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">
            Tipo de cenário <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-muted-foreground">Qual é a natureza do que você está enfrentando?</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.value}
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
          {scenario && (
            <p className="text-label text-muted-foreground">
              {SCENARIOS.find((s) => s.value === scenario)?.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-label text-muted-foreground uppercase">
            Camada operacional <span className="text-destructive">*</span>
          </label>
          <p className="text-label text-muted-foreground">Onde está o principal obstáculo agora?</p>
          <div className="flex flex-wrap gap-2">
            {LAYERS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLayer(l.value)}
                className={`rounded-full border px-3 py-1 text-small transition-colors ${
                  layer === l.value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground hover:bg-accent'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {layer && (
            <p className="text-label text-muted-foreground">
              {LAYERS.find((l) => l.value === layer)?.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-3">
          <div>
            <p className="text-small text-foreground">Notificação</p>
            <p className="text-label text-muted-foreground">
              {notifyAuto ? 'Deixa o app escolher' : 'Sem notificação'}
            </p>
          </div>
          <button
            onClick={() => setNotifyAuto((v) => !v)}
            className={`h-6 w-11 rounded-full transition-colors ${
              notifyAuto ? 'bg-foreground' : 'bg-muted'
            } relative`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-background transition-transform ${
                notifyAuto ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {(!scenario || !layer) && nameOk && northOk && (
          <p className="text-small text-muted-foreground text-center">
            Selecione o tipo de cenário e a camada operacional para criar o projeto.
          </p>
        )}

        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
          CRIAR PROJETO
        </Button>
      </main>
    </div>
  );
}
