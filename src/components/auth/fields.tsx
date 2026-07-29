// Campos compartilhados das telas de autenticação (PRD-AUTH-01, Etapa 6).
//
// AuthForm e /reset-password pedem senha com o mesmo comportamento. Manter
// duas cópias do olho de mostrar/ocultar seria repetir a triplicação que a
// Etapa 4 desfez.

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Fundo e cor do texto vêm da regra global de caixas de digitação em
 * styles.css (fundo claro, texto escuro, com !important) — não repetir aqui.
 *
 * 16px é deliberado: abaixo disso o Safari no iPhone dá zoom ao focar o campo
 * e desloca a tela inteira. h-12 garante alvo de toque confortável.
 */
export function inputClass(hasError: boolean): string {
  return [
    'w-full h-12 rounded-xl border px-3 text-[16px]',
    'focus:outline-none focus:ring-2 focus:ring-op-amber',
    hasError ? 'border-brand-red' : 'border-op-gray/30',
  ].join(' ');
}

export function Field({
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

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  /** 'new-password' no cadastro e na redefinição; 'current-password' no login. */
  autoComplete: 'new-password' | 'current-password';
  /** Dica de requisitos, escondida quando há erro para não competir com ele. */
  hint?: string;
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass(!!error)} pr-12`}
        />
        {/* O botão fica sobre o fundo claro do input (regra global), não sobre
            o fundo escuro da tela — daí surface-4 em vez de op-gray. */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-surface-4 hover:text-text-primary transition-colors"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {hint && !error && (
        <p className="text-label text-muted-foreground pt-1">{hint}</p>
      )}
    </Field>
  );
}
