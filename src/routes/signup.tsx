// SignupPage — criação de conta com e-mail e senha (PRD-AUTH-01, Etapa 5).
//
// Dois desfechos possíveis, decididos pela configuração do Supabase (Etapa 7):
// com confirmação de e-mail desligada o signUp já abre sessão e seguimos para a
// Home; com ela ligada não há sessão ainda, e prender o usuário numa tela em
// branco seria pior do que dizer o que falta — daí a tela de confirmação.

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSuccess(user: { id: string; email: string }) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // __root dispara a migração dos dados de guest no SIGNED_IN.
      void navigate({ to: '/' });
      return;
    }
    setPendingEmail(user.email);
  }

  if (pendingEmail) {
    return (
      <AuthScreen
        title="Confirme seu e-mail"
        subtitle="Falta um passo para a conta ficar ativa."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-5 space-y-2">
            <p className="text-body text-op-white">
              Enviamos um e-mail de confirmação para{' '}
              <span className="font-semibold break-all">{pendingEmail}</span>.
            </p>
            <p className="text-small text-op-gray">
              Abra o e-mail e conclua a confirmação. Depois, entre com a senha
              que você acabou de criar.
            </p>
          </div>
          <Button className="w-full h-12" onClick={() => void navigate({ to: '/login' })}>
            Ir para o login
          </Button>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Criar conta"
      subtitle="Seus registros ficam protegidos e sincronizados entre dispositivos."
      footer={
        <button
          type="button"
          onClick={() => void navigate({ to: '/onboarding' })}
          className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-3"
        >
          Continuar sem conta (dados não sincronizados)
        </button>
      }
    >
      <AuthForm
        mode="signup"
        onSuccess={(user) => void handleSuccess(user)}
        onModeChange={() => void navigate({ to: '/login' })}
      />
    </AuthScreen>
  );
}
