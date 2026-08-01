// ResetPasswordPage — código de 6 dígitos + nova senha (PRD-AUTH-01, Etapa 6).
//
// O verifyOtp abre sessão antes do updateUser, então ao final o usuário já está
// autenticado — mandá-lo de volta ao login seria pedir que digitasse a senha
// que acabou de criar. Vai direto para a Home.
//
// O e-mail vem de authFlags (guardado em /forgot-password), mas continua
// editável: dá para cair aqui direto pelo "Já tenho um código".

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Field, PasswordField, inputClass } from '@/components/auth/fields';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  confirmPasswordReset,
  passwordReset,
  validateCode,
  validateEmail,
  validatePassword,
} from '@/lib/auth';
import { clearRecovery, getRecoveryEmail, markRecoveryStarted } from '@/lib/authFlags';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

type FieldErrors = Partial<Record<'email' | 'code' | 'password', string>>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => getRecoveryEmail() ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function validate(): boolean {
    const errors: FieldErrors = {};

    const emailVal = validateEmail(email);
    if (!emailVal.valid) errors.email = emailVal.error;

    const codeVal = validateCode(code);
    if (!codeVal.valid) errors.code = codeVal.error;

    const passwordVal = validatePassword(password);
    if (!passwordVal.valid) errors.password = passwordVal.error;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (loading) return;
    setFormError(null);
    setNotice(null);
    if (!validate()) return;

    setLoading(true);
    const result = await confirmPasswordReset(email, code, password);
    setLoading(false);

    if (!result.success) {
      setFormError(result.error?.message ?? 'Não foi possível redefinir a senha.');
      return;
    }

    // O verifyOtp já abriu sessão: a recuperação terminou.
    clearRecovery();
    void navigate({ to: '/' });
  }

  async function handleResend() {
    if (resending) return;
    setFormError(null);
    setNotice(null);

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setFieldErrors((prev) => ({ ...prev, email: emailVal.error }));
      return;
    }

    setResending(true);
    const result = await passwordReset(email);
    setResending(false);

    if (!result.success) {
      setFormError(result.error?.message ?? 'Não foi possível reenviar o código.');
      return;
    }

    markRecoveryStarted(email.trim());
    setCode('');
    setNotice('Novo código enviado. Verifique seu e-mail.');
  }

  return (
    <AuthScreen
      title="Redefinir senha"
      subtitle="Informe o código que enviamos e escolha uma nova senha."
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
        <Field label="E-mail" error={fieldErrors.email}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            placeholder="seu@email.com"
            className={inputClass(!!fieldErrors.email)}
          />
        </Field>

        <Field label="Código de 6 dígitos" error={fieldErrors.code}>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v);
              clearFieldError('code');
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            // field-dark: o input-otp sobrepõe um <input> transparente sobre os
            // slots. Sem opt-out, a regra global de caixas claras o pinta de
            // branco com !important e ele cobre os 6 slots. [styles.css]
            className="field-dark"
            containerClassName="justify-between"
          >
            <InputOTPGroup className="gap-2 w-full justify-between">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  // Slots são divs — a regra global de inputs claros não os
                  // alcança, então seguem o fundo escuro da tela.
                  className={`h-12 flex-1 rounded-md border text-[18px] text-op-white ${
                    fieldErrors.code ? 'border-brand-red' : 'border-op-gray/30'
                  }`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>

        <PasswordField
          label="Nova senha"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearFieldError('password');
          }}
          error={fieldErrors.password}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          hint="Letra maiúscula, minúscula, número e caractere especial."
        />

        {notice && <p className="text-small text-op-cyan">{notice}</p>}
        {formError && (
          <p className="text-small text-brand-red" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? 'Redefinindo...' : 'Redefinir senha'}
        </Button>

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending}
          className="w-full text-center text-small text-op-gray hover:text-op-white transition-colors py-2 disabled:opacity-50"
        >
          {resending ? 'Reenviando...' : 'Reenviar código'}
        </button>
      </form>
    </AuthScreen>
  );
}
