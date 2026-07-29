// LoginPage — tela de retorno para quem já tem conta (PRD-AUTH-01, Etapa 5).
//
// Agora com e-mail e senha: o formulário inteiro vive em <AuthForm>. Esta rota
// só decide o que acontece depois do login — navegar para a Home. A migração
// dos dados de guest é disparada pelo listener em __root.

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { clearWasAuthenticated } from '@/lib/authFlags';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  function continueAsGuest() {
    clearWasAuthenticated();
    void navigate({ to: '/onboarding' });
  }

  return (
    <AuthScreen
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta para continuar de onde parou."
      footer={
        <button
          type="button"
          onClick={continueAsGuest}
          className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-3"
        >
          Continuar sem conta (dados não sincronizados)
        </button>
      }
    >
      <AuthForm
        mode="login"
        onSuccess={() => void navigate({ to: '/' })}
        onModeChange={() => void navigate({ to: '/signup' })}
      />
    </AuthScreen>
  );
}
