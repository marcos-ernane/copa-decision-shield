// LoginPage — tela de retorno para usuários que já tiveram conta ou saíram.
// Distinto do OnboardingFlow (para usuários novos) e do LoginSheet (drawer contextual).

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { clearWasAuthenticated } from '@/lib/authFlags';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  function continueAsGuest() {
    clearWasAuthenticated();
    void navigate({ to: '/onboarding' });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#070C12' }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-title text-op-white">Bem-vindo de volta</h1>
          <p className="text-body text-op-gray">
            Acesse sua conta para continuar de onde parou.
          </p>
        </div>

        {!sent ? (
          <div className="space-y-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && !loading && void sendMagicLink()}
              placeholder="seu@email.com"
              className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-op-amber"
            />
            <Button className="w-full" disabled={!email || loading} onClick={() => void sendMagicLink()}>
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </Button>
            {error && <p className="text-small text-destructive text-center">{error}</p>}
            <div className="pt-2 border-t border-op-gray/20">
              <button
                type="button"
                onClick={continueAsGuest}
                className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-2"
              >
                Continuar sem conta (dados não sincronizados)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-5 space-y-2">
              <p className="text-body text-op-white">
                Link enviado para <span className="font-semibold">{email}</span>
              </p>
              <p className="text-small text-op-gray">
                Abra o e-mail neste dispositivo para concluir o acesso.
              </p>
            </div>
            <button
              type="button"
              onClick={continueAsGuest}
              className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-2"
            >
              Continuar sem conta por enquanto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
