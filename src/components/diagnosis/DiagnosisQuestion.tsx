// DiagnosisQuestion — uma pergunta com opções (radio).

import type { ReactNode } from 'react';

export interface QuestionOption<T extends string> {
  value: T;
  label: string;
  hint?: ReactNode;
}

interface Props<T extends string> {
  step: number;
  total: number;
  title: string;
  options: QuestionOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
}

export function DiagnosisQuestion<T extends string>({
  step,
  total,
  title,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="space-y-4">
      <p className="text-label text-muted-foreground uppercase">
        Pergunta {step} de {total}
      </p>
      <h2 className="text-title text-foreground">{title}</h2>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex items-start gap-3 cursor-pointer rounded-md border bg-op-navy p-3 transition-colors ${
              value === o.value ? 'border-op-white' : 'border-op-gray/30'
            }`}
          >
            <input
              type="radio"
              className="mt-1"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <div>
              <p className="text-body text-op-white">{o.label}</p>
              {o.hint && (
                <p className="text-small text-op-gray mt-1">{o.hint}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
