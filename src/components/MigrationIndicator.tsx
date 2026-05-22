// MigrationIndicator — banner fixo durante migração de dados guest → Supabase.

import { useEffect, useState } from 'react';
import { onMigration, type MigrationStatus } from '@/lib/migrateGuest';

export function MigrationIndicator() {
  const [status, setStatus] = useState<MigrationStatus>({ state: 'idle' });

  useEffect(() => onMigration(setStatus), []);

  useEffect(() => {
    if (status.state === 'done' || status.state === 'error') {
      const t = setTimeout(() => setStatus({ state: 'idle' }), 4000);
      return () => clearTimeout(t);
    }
  }, [status.state]);

  if (status.state === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 rounded-md border border-border bg-card px-4 py-2 shadow-sm"
    >
      {status.state === 'running' && (
        <p className="text-small text-foreground">{status.step}…</p>
      )}
      {status.state === 'done' && (
        <p className="text-small text-foreground">
          Sincronizado: {status.counts.projects} projetos, {status.counts.entries}{' '}
          registros, {status.counts.principles} princípios.
        </p>
      )}
      {status.state === 'error' && (
        <p className="text-small text-destructive">Falha: {status.message}</p>
      )}
    </div>
  );
}
