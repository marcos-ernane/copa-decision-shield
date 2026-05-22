// CalibratedReturnScreen — exibido quando determineEntryType retorna 'calibrated'.
// 7-14 dias sem registro: pergunta o que mudou e oferece dois caminhos.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { savePulse } from '@/lib/register';
import type { Project } from '@/types/database';

interface Props {
  project: Project;
  daysSinceLast: number;
}

export function CalibratedReturnScreen({ project, daysSinceLast }: Props) {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(target: 'direct' | 'diagnosis') {
    setBusy(true);
    try {
      if (note.trim().length > 0) {
        await savePulse(project.id, {
          text: note.trim(),
          fact_text: note.trim(),
          interpretation_text: '',
          classification: 'fact',
          input_method: 'text',
          has_mixed_interpretation: false,
        });
      }
      if (target === 'direct') {
        navigate({
          to: '/project/$id/dashboard',
          params: { id: project.id },
          replace: true,
        });
      } else {
        navigate({
          to: '/project/$id/diagnosis',
          params: { id: project.id },
          replace: true,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full space-y-6">
        <div>
          <p className="text-label text-muted-foreground uppercase">Retorno calibrado</p>
          <h1 className="text-title text-foreground mt-2">
            Você está voltando ao projeto {project.name}.
          </h1>
          <p className="text-small text-muted-foreground mt-1">
            Última entrada: {daysSinceLast} dias atrás.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-small text-foreground">
            O que mudou desde então? (opcional — 1 frase)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full" disabled={busy} onClick={() => go('direct')}>
            Entrar direto
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => go('diagnosis')}
          >
            Fazer diagnóstico
          </Button>
        </div>
      </div>
    </div>
  );
}
