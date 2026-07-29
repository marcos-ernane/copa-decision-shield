// AuthForm — formulário único de cadastro e login (PRD-AUTH-01, Etapa 4).
//
// Substitui a triplicação que existia entre /login, LoginSheet e
// RegistrationNudge: cada um tinha sua própria cópia do campo de e-mail, do
// envio, do estado de loading e da exibição de erro. Agora há um só lugar.
//
// O componente NÃO navega e NÃO decide o que acontece depois: quem monta
// resolve isso em onSuccess. Isso é o que permite usá-lo tanto em rota cheia
// quanto dentro de um drawer.

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalDocumentSheet } from './LegalDocumentSheet';
import { signIn, signUp, validateEmail, validateName, validatePassword } from '@/lib/auth';
import {
  recordAcceptance,
  savePendingAcceptance,
} from '@/lib/legalConsent';
import { supabase } from '@/lib/supabase';
import type { LegalDocumentType } from '@/types/database';

export type AuthMode = 'signup' | 'login';

interface Props {
  mode: AuthMode;
  /** Chamado após cadastro/login bem-sucedido. Quem monta decide a navegação. */
  onSuccess: (user: { id: string; email: string }) => void;
  /** Alternar cadastro ↔ login. Omitido: o link de troca não aparece. */
  onModeChange?: (mode: AuthMode) => void;
  /** Só faz sentido em login. Omitido: o link não aparece. */
  onForgotPassword?: () => void;
  /** Ação secundária ao pé do formulário (ex.: "Depois", "Cancelar"). */
  secondaryAction?: { label: string; onClick: () => void };
  autoFocus?: boolean;
}

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'consent', string>>;

const CONSENT_DOCUMENTS: LegalDocumentType[] = ['privacy_policy', 'terms_of_use'];

export function AuthForm({
  mode,
  onSuccess,
  onModeChange,
  onForgotPassword,
  secondaryAction,
  autoFocus = true,
}: Props) {
  const isSignup = mode === 'signup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDocument, setOpenDocument] = useState<LegalDocumentType | null>(null);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  /** Validação local antes de gastar uma ida ao servidor. */
  function validate(): boolean {
    const errors: FieldErrors = {};

    if (isSignup) {
      const nameVal = validateName(name);
      if (!nameVal.valid) errors.name = nameVal.error;
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) errors.email = emailVal.error;

    if (isSignup) {
      const passwordVal = validatePassword(password);
      if (!passwordVal.valid) errors.password = passwordVal.error;
      // No login não repetimos a política de senha: quem tem senha antiga
      // ainda precisa conseguir entrar, e o erro certo vem do servidor.
      if (!consent) {
        errors.consent = 'É necessário aceitar a Política de Privacidade e os Termos de Uso';
      }
    } else if (password.length === 0) {
      errors.password = 'Senha é obrigatória';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (loading) return;
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    const result = isSignup
      ? await signUp(email, password, name)
      : await signIn(email, password);
    setLoading(false);

    if (!result.success || !result.user) {
      setFormError(result.error?.message ?? 'Não foi possível concluir. Tente novamente.');
      return;
    }

    if (isSignup) {
      // O aceite exige sessão ativa (policy de INSERT). Com confirmação de
      // e-mail ligada o signUp não abre sessão — nesse caso guardamos o aceite
      // e ele é gravado no primeiro login. Falha aqui nunca prende o usuário.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const recorded = await recordAcceptance(result.user.id, CONSENT_DOCUMENTS);
        if (!recorded.success) savePendingAcceptance(CONSENT_DOCUMENTS);
      } else {
        savePendingAcceptance(CONSENT_DOCUMENTS);
      }
    }

    onSuccess(result.user);
  }

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {isSignup && (
          <Field label="Nome" error={fieldErrors.name}>
            <input
              type="text"
              autoComplete="name"
              autoFocus={autoFocus}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder="Como quer ser chamado"
              className={inputClass(!!fieldErrors.name)}
            />
          </Field>
        )}

        <Field label="E-mail" error={fieldErrors.email}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus={autoFocus && !isSignup}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            placeholder="seu@email.com"
            className={inputClass(!!fieldErrors.email)}
          />
        </Field>

        <Field label="Senha" error={fieldErrors.password}>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              placeholder={isSignup ? 'Mínimo 8 caracteres' : 'Sua senha'}
              className={`${inputClass(!!fieldErrors.password)} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              // Fica sobre o fundo claro do input (regra global), não sobre o
              // fundo escuro da tela — daí surface-4 em vez de op-gray.
              className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-surface-4 hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {isSignup && !fieldErrors.password && (
            <p className="text-label text-muted-foreground pt-1">
              Letra maiúscula, minúscula, número e caractere especial.
            </p>
          )}
        </Field>

        {isSignup && (
          <div className="pt-1">
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={consent}
                aria-label="Aceito a Política de Privacidade e os Termos de Uso"
                onClick={() => {
                  setConsent((v) => !v);
                  clearFieldError('consent');
                }}
                className="shrink-0 size-11 -ml-3 -mt-3 flex items-center justify-center"
              >
                <span
                  className={`size-5 rounded border flex items-center justify-center transition-colors ${
                    consent
                      ? 'bg-brand-blue border-brand-blue'
                      : fieldErrors.consent
                        ? 'border-brand-red'
                        : 'border-op-gray/50'
                  }`}
                >
                  {consent && (
                    <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none">
                      <path
                        d="M3 8.5l3.5 3.5L13 5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>
              <p className="text-small text-muted-foreground -ml-1">
                Li e aceito a{' '}
                <button
                  type="button"
                  onClick={() => setOpenDocument('privacy_policy')}
                  className="text-brand-blue underline underline-offset-2"
                >
                  Política de Privacidade
                </button>{' '}
                e os{' '}
                <button
                  type="button"
                  onClick={() => setOpenDocument('terms_of_use')}
                  className="text-brand-blue underline underline-offset-2"
                >
                  Termos de Uso
                </button>
                .
              </p>
            </div>
            {fieldErrors.consent && (
              <p className="text-small text-brand-red pt-1">{fieldErrors.consent}</p>
            )}
          </div>
        )}

        {formError && (
          <p className="text-small text-brand-red" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading
            ? isSignup
              ? 'Criando conta...'
              : 'Entrando...'
            : isSignup
              ? 'Criar conta'
              : 'Entrar'}
        </Button>

        {!isSignup && onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-center text-small text-op-gray hover:text-foreground transition-colors py-2"
          >
            Esqueci minha senha
          </button>
        )}

        {onModeChange && (
          <button
            type="button"
            onClick={() => {
              setFieldErrors({});
              setFormError(null);
              onModeChange(isSignup ? 'login' : 'signup');
            }}
            className="w-full text-center text-small text-op-gray hover:text-foreground transition-colors py-2"
          >
            {isSignup ? 'Já tenho conta. Entrar' : 'Não tenho conta. Criar agora'}
          </button>
        )}

        {secondaryAction && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-12"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </form>

      <LegalDocumentSheet
        documentType={openDocument}
        onClose={() => setOpenDocument(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-label text-muted-foreground block">{label}</label>
      {children}
      {error && <p className="text-small text-brand-red">{error}</p>}
    </div>
  );
}

/**
 * Fundo e cor do texto vêm da regra global de caixas de digitação em
 * styles.css (fundo claro, texto escuro, com !important) — não repetir aqui.
 *
 * 16px é deliberado: abaixo disso o Safari no iPhone dá zoom ao focar o campo
 * e desloca a tela inteira. h-12 garante alvo de toque confortável.
 */
function inputClass(hasError: boolean): string {
  return [
    'w-full h-12 rounded-xl border px-3 text-[16px]',
    'focus:outline-none focus:ring-2 focus:ring-op-amber',
    hasError ? 'border-brand-red' : 'border-op-gray/30',
  ].join(' ');
}
