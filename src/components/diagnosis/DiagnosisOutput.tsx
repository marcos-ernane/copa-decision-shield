// DiagnosisOutput — exibe leitura do campo + ação calibrada + chips editáveis.
// Nada é persistido antes do usuário confirmar.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import type { DiagnosisOutput as DiagOut } from '@/engines/DiagnosisEngine';
import type { OperationalLayer, ScenarioType, CopaPhase } from '@/types/app';

const PHASE_LABEL: Record<CopaPhase, string> = {
  C: 'C — Captura',
  O: 'O — Organização',
  P: 'P — Prova',
  A: 'A — Aferição',
};

const TYPES: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

interface Props {
  output: DiagOut;
  onConfirm: (final: {
    scenario_type: ScenarioType;
    layer: OperationalLayer;
    phase: CopaPhase;
    field_reading: string;
    calibrated_action: string;
  }) => void;
  onStartCopa: () => void;
  onRegisterNow: () => void;
  onViewProject: () => void;
}

export function DiagnosisOutput({
  output,
  onConfirm,
  onStartCopa,
  onRegisterNow,
  onViewProject,
}: Props) {
  const [scenario, setScenario] = useState<ScenarioType>(output.scenario_type);
  const [layer, setLayer] = useState<OperationalLayer>(output.layer);
  const [editingType, setEditingType] = useState(false);
  const [editingLayer, setEditingLayer] = useState(false);

  function confirmAnd(action: () => void) {
    onConfirm({
      scenario_type: scenario,
      layer,
      phase: output.suggested_format,
      field_reading: output.field_reading,
      calibrated_action: output.calibrated_action,
    });
    action();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-label text-muted-foreground uppercase">Leitura do campo</p>
        <p className="text-body text-foreground">{output.field_reading}</p>
      </section>

      <section className="space-y-1">
        <p className="text-label text-muted-foreground uppercase">Próxima ação calibrada</p>
        <p className="text-body text-foreground">{output.calibrated_action}</p>
      </section>

      {output.gentle_alert && (
        <section
          className="rounded-md p-3 text-small"
          style={{
            backgroundColor: 'color-mix(in oklab, #facc15 18%, transparent)',
          }}
        >
          {output.gentle_alert}
        </section>
      )}

      <section className="space-y-2 rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-small text-muted-foreground">Fase sugerida</p>
          <span className="text-small text-foreground">
            {PHASE_LABEL[output.suggested_format]}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-small text-muted-foreground">Tipo</p>
          <div className="flex items-center gap-2">
            <ScenarioTypeChip type={scenario} />
            <button
              className="text-label text-muted-foreground underline"
              onClick={() => setEditingType((v) => !v)}
            >
              {editingType ? 'fechar' : 'editar'}
            </button>
          </div>
        </div>
        {editingType && (
          <div className="flex flex-wrap gap-2 pt-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setScenario(t);
                  setEditingType(false);
                }}
                className={`rounded-full border px-3 py-1 text-small ${
                  scenario === t ? 'border-foreground' : 'border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-small text-muted-foreground">Camada</p>
          <div className="flex items-center gap-2">
            <LayerChip layer={layer} />
            <button
              className="text-label text-muted-foreground underline"
              onClick={() => setEditingLayer((v) => !v)}
            >
              {editingLayer ? 'fechar' : 'editar'}
            </button>
          </div>
        </div>
        {editingLayer && (
          <div className="flex flex-wrap gap-2 pt-1">
            {LAYERS.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLayer(l);
                  setEditingLayer(false);
                }}
                className={`rounded-full border px-3 py-1 text-small ${
                  layer === l ? 'border-foreground' : 'border-border'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-2">
        <Button onClick={() => confirmAnd(onStartCopa)}>Iniciar COPA</Button>
        <Button variant="outline" onClick={() => confirmAnd(onRegisterNow)}>
          Registrar agora
        </Button>
        <Button variant="ghost" onClick={() => confirmAnd(onViewProject)}>
          Ver projeto
        </Button>
      </div>
    </div>
  );
}
