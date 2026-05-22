// Callback de Magic Link e Google OAuth.
// O cliente Supabase já tem detectSessionInUrl=true; basta aguardar e redirecionar.
// A migração de dados guest é disparada pelo listener global no __root.

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/auth/callback')({
  head: () => ({
    meta: [
      { title: 'Concluindo acesso…' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: '/' });
      } else {
        // Aguarda detectSessionInUrl processar o hash
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            sub.subscription.unsubscribe();
            navigate({ to: '/' });
          }
        });
        setTimeout(() => {
          sub.subscription.unsubscribe();
          if (!cancelled) setError('Não foi possível concluir o acesso.');
        }, 8000);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center space-y-3">
        {!error ? (
          <>
            <p className="text-heading text-foreground">Concluindo acesso…</p>
            <p className="text-small text-muted-foreground">
              Sincronizando seu histórico local.
            </p>
          </>
        ) : (
          <>
            <p className="text-heading text-foreground">Falha no acesso</p>
            <p className="text-small text-destructive">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
