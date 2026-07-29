// Autenticação com login/senha (PRD-AUTH-01, Etapa 3)
// Suporta: signup, signin, password reset (6-digit code), confirmação

import { supabase } from './supabase';
import { markWasAuthenticated } from './authFlags';

/**
 * Resultado padronizado de operações de autenticação.
 * success=true: operação completou (signup/signin/reset enviado).
 * success=false: erro retornado conforme error.code.
 */
export interface AuthResult {
  success: boolean;
  error?: {
    code: string; // código Supabase ou custom
    message: string; // mensagem em português
  };
  user?: { id: string; email: string }; // presente em signin/signup bem-sucedidos
}

// ─────────────────────────────────────────────────────────────────
// Validações
// ─────────────────────────────────────────────────────────────────

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'E-mail é obrigatório' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'E-mail inválido' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
  }
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      valid: false,
      error:
        'Senha deve conter letra maiúscula, minúscula, número e caractere especial (!@#$%^&*)',
    };
  }
  return { valid: true };
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Nome é obrigatório' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'Nome deve ter no mínimo 2 caracteres' };
  }
  return { valid: true };
}

export function validateCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Código é obrigatório' };
  }
  if (!/^\d{6}$/.test(code.trim())) {
    return { valid: false, error: 'Código deve ter 6 dígitos' };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────
// Tradução de Erros Supabase → Português
// ─────────────────────────────────────────────────────────────────

function translateSupabaseError(code: string, message: string): string {
  const translations: Record<string, string> = {
    'user_already_exists': 'Este e-mail já está registrado',
    'invalid_credentials': 'E-mail ou senha incorretos',
    'email_not_confirmed': 'E-mail não foi confirmado. Verifique sua caixa de entrada',
    'weak_password': 'Senha não atende aos requisitos de segurança',
    'invalid_email': 'E-mail inválido',
    'over_email_send_rate_limit': 'Muitas tentativas. Aguarde alguns minutos',
    'otp_expired': 'Código expirou. Solicite um novo',
    'invalid_otp': 'Código inválido',
    'session_not_found': 'Sessão expirada. Faça login novamente',
    'oauth_provider_not_supported': 'Provedor OAuth não suportado',
    'no_user_found': 'Usuário não encontrado',
  };

  return translations[code] || message || 'Erro na autenticação. Tente novamente';
}

// ─────────────────────────────────────────────────────────────────
// Signup — Registrar com Email e Senha
// ─────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
  // Validações
  const emailVal = validateEmail(email);
  if (!emailVal.valid) return { success: false, error: { code: 'invalid_email', message: emailVal.error! } };

  const passwordVal = validatePassword(password);
  if (!passwordVal.valid) return { success: false, error: { code: 'weak_password', message: passwordVal.error! } };

  const nameVal = validateName(name);
  if (!nameVal.valid) return { success: false, error: { code: 'invalid_name', message: nameVal.error! } };

  try {
    // Criar usuário com email e senha via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        // emailRedirectTo será configurado em Etapa 7 (Supabase dashboard)
      },
    });

    if (error) {
      return {
        success: false,
        error: {
          code: error.code || 'signup_failed',
          message: translateSupabaseError(error.code || '', error.message),
        },
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: { code: 'no_user_created', message: 'Falha ao criar usuário' },
      };
    }

    markWasAuthenticated();

    return {
      success: true,
      user: { id: data.user.id, email: data.user.email! },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: { code: 'signup_error', message: `Erro ao registrar: ${errorMsg}` },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Signin — Autenticar com Email e Senha
// ─────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  // Validações
  const emailVal = validateEmail(email);
  if (!emailVal.valid) return { success: false, error: { code: 'invalid_email', message: emailVal.error! } };

  if (!password || password.length === 0) {
    return { success: false, error: { code: 'missing_password', message: 'Senha é obrigatória' } };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          code: error.code || 'signin_failed',
          message: translateSupabaseError(error.code || '', error.message),
        },
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: { code: 'no_user_found', message: 'Usuário não encontrado' },
      };
    }

    markWasAuthenticated();

    return {
      success: true,
      user: { id: data.user.id, email: data.user.email! },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: { code: 'signin_error', message: `Erro ao autenticar: ${errorMsg}` },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Password Reset — Solicitar Reset via Código 6 Dígitos
// ─────────────────────────────────────────────────────────────────

/**
 * Solicita um reset de senha. Supabase enviará um código de 6 dígitos
 * para o e-mail do usuário. Use confirmPasswordReset() para validar.
 *
 * Nota: Em Etapa 7, configurar redirectTo no Supabase Dashboard
 * para apontar para /reset-password?code={code}&email={email}
 */
export async function passwordReset(email: string): Promise<AuthResult> {
  const emailVal = validateEmail(email);
  if (!emailVal.valid) return { success: false, error: { code: 'invalid_email', message: emailVal.error! } };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });

    if (error) {
      return {
        success: false,
        error: {
          code: error.code || 'reset_failed',
          message: translateSupabaseError(error.code || '', error.message),
        },
      };
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: { code: 'reset_error', message: `Erro ao solicitar reset: ${errorMsg}` },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Confirm Password Reset — Confirmar Reset com Código + Nova Senha
// ─────────────────────────────────────────────────────────────────

/**
 * Confirma o reset de senha usando o código de 6 dígitos enviado por email
 * e a nova senha desejada.
 *
 * @param email E-mail do usuário
 * @param code Código de 6 dígitos enviado por email
 * @param newPassword Nova senha (deve passar em validatePassword)
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthResult> {
  // Validações
  const emailVal = validateEmail(email);
  if (!emailVal.valid) return { success: false, error: { code: 'invalid_email', message: emailVal.error! } };

  const codeVal = validateCode(code);
  if (!codeVal.valid) return { success: false, error: { code: 'invalid_code', message: codeVal.error! } };

  const passwordVal = validatePassword(newPassword);
  if (!passwordVal.valid) return { success: false, error: { code: 'weak_password', message: passwordVal.error! } };

  try {
    // Etapa 1: Verificar OTP (código de 6 dígitos)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });

    if (verifyError) {
      return {
        success: false,
        error: {
          code: verifyError.code || 'invalid_otp',
          message: translateSupabaseError(verifyError.code || '', verifyError.message),
        },
      };
    }

    // Etapa 2: Se OTP válido, atualizar senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return {
        success: false,
        error: {
          code: updateError.code || 'update_failed',
          message: translateSupabaseError(updateError.code || '', updateError.message),
        },
      };
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: { code: 'reset_confirm_error', message: `Erro ao confirmar reset: ${errorMsg}` },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────

export async function logout(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        success: false,
        error: {
          code: error.code || 'logout_failed',
          message: translateSupabaseError(error.code || '', error.message),
        },
      };
    }
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: { code: 'logout_error', message: `Erro ao logout: ${errorMsg}` },
    };
  }
}
