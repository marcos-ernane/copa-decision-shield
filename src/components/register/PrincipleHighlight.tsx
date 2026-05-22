// PrincipleHighlight — wrapper visual do campo mais importante do produto.
// Borda brand-cyan, label em brand-blue. REQ-REG-04.

import type { ReactNode } from 'react';

interface Props {
  label?: string;
  children: ReactNode;
  hint?: string;
}

export function PrincipleHighlight({
  label = 'O aprendizado desta análise:',
  children,
  hint,
}: Props) {
  return (
    <div
      className="rounded-md border-2 p-3 space-y-2"
      style={{ borderColor: 'var(--color-brand-cyan)' }}
    >
      <div
        className="text-small font-medium"
        style={{ color: 'var(--color-brand-blue)' }}
      >
        ★ {label}
      </div>
      {children}
      {hint && <p className="text-small text-muted-foreground">{hint}</p>}
    </div>
  );
}
