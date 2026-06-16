// TransferScenarioLines — 6 campos por cenário.
import { useState } from 'react';
import type { ScenarioType, OperationalLayer } from '@/types/app';
import { isScenarioComplete, type TransferScenario } from '@/lib/transfer';

const TYPES: { value: ScenarioType; label: string }[] = [
  { value: 'fluxo', label: 'fluxo' },
  { value: 'processo', label: 'processo' },
  { value: 'oferta', label: 'oferta' },
  { value: 'relacionamento', label: 'relacionamento' },
  { value: 'pressao', label: 'pressão' },
];

const LAYERS: { value: OperationalLayer; label: string }[] = [
  { value: 'operabilidade', label: 'operabilidade' },
  { value: 'conversao', label: 'conversão' },
  { value: 'recorrencia', label: 'recorrência' },
  { value: 'escala', label: 'escala' },
];

interface Props {
  scenarioIndex: number;
  context: string;
  initial: TransferScenario;
  isLast: boolean;
  onContinue: (s: TransferScenario) => void;
}

export function TransferScenarioLines({ scenarioIndex, context, initial, isLast, onContinue }: Props) {
  const [s, setS] = useState<TransferScenario>(initial);
  const complete = isScenarioComplete(s);

  const Chip = <T extends string>({
    value,
    label,
    selected,
    onClick,
  }: { value: T; label: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      data-value={value}
      className={`px-3 py-1 rounded-full border text-small ${
        selected
          ? 'border-primary bg-primary/15 text-foreground'
          : 'border-border text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-op-black px-6 py-8" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <div className="max-w-md mx-auto space-y-5">
        <p className="text-label text-muted-foreground uppercase tracking-wider">
          Cenário {scenarioIndex + 1}: "{context.length > 60 ? context.slice(0, 60) + '…' : context}"
        </p>

        <div className="space-y-2">
          <p className="text-small text-foreground">1. Tipo:</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip
                key={t.value}
                value={t.value}
                label={t.label}
                selected={s.type === t.value}
                onClick={() => setS({ ...s, type: t.value })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-small text-foreground">2. Camada:</p>
          <div className="flex flex-wrap gap-2">
            {LAYERS.map((l) => (
              <Chip
                key={l.value}
                value={l.value}
                label={l.label}
                selected={s.layer === l.value}
                onClick={() => setS({ ...s, layer: l.value })}
              />
            ))}
          </div>
        </div>

        <Field
          label="3. Fato:"
          hint="O que você observaria neste cenário"
          value={s.fact}
          onChange={(v) => setS({ ...s, fact: v })}
        />
        <Field
          label="4. Fricção:"
          hint="O que estaria travando"
          value={s.friction}
          onChange={(v) => setS({ ...s, friction: v })}
        />
        <Field
          label="5. IMV:"
          hint="Menor teste possível"
          value={s.imv}
          onChange={(v) => setS({ ...s, imv: v })}
        />
        <Field
          label="6. Métrica:"
          hint="Como saberia que funcionou"
          value={s.metric}
          onChange={(v) => setS({ ...s, metric: v })}
        />

        <button
          type="button"
          disabled={!complete}
          onClick={() => onContinue(s)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-body disabled:opacity-40"
        >
          {isLast ? 'Concluir cenários →' : 'Próximo cenário →'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, hint, value, onChange,
}: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-small text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="w-full rounded-md border border-border bg-card p-2 text-body text-foreground"
      />
    </div>
  );
}
