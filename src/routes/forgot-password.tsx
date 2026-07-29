// ForgotPasswordPage — pedido do código de recuperação (PRD-AUTH-01, Etapa 6).
//
// Primeira das duas telas: aqui só se pede o código; a redefinição acontece em
// /reset-password. O e-mail é guardado em authFlags para não precisar ser
// redigitado na tela seguinte.
//
// Depende do template de e-mail usar {{ .Token }} (código de 6 dígitos) em vez
// de {{ .ConfirmationURL }} — configuração da Etapa 7.

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Field, inputClass } from '@/components/auth/fields';
import { Button } from '@/components/ui/button';
import { passwordReset, validateEmail } from '@/lib/auth';
import { getRecoveryEmail, markRecoveryStarted } from '@/lib/authFlags';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => getRecoveryEmail() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    setError(null);

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setError(emailVal.error!);
      return;
    }

    setLoading(true);
    const result = await passwordReset(email);
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? 'Não foi possível enviar o código.');
      return;
    }

    markRecoveryStarted(email.trim());
    void navigate({ to: '/reset-password' });
  }

  return (
    <AuthScreen
      title="Recuperar senha"
      subtitle="Enviaremos um código de 6 dígitos para o seu e-mail."
      footer={
        <button
          type="button"
          onClick={() => void navigate({ to: '/login' })}
          className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-3"
        >
          Voltar para o login
        </button>
      }
    >
      {/* noValidate: a validação nativa do browser bloquearia o submit antes
          da daqui rodar, mostrando a própria bolha em vez do erro inline. */}
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <Field label="E-mail">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="seu@email.com"
            className={inputClass(!!error)}
          />
        </Field>

        {error && (
          <p className="text-small text-brand-red" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar código'}
        </Button>

        <button
          type="button"
          onClick={() => void navigate({ to: '/reset-password' })}
          className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-2"
        >
          Já tenho um código
        </button>
      </form>
    </AuthScreen>
  );
}
