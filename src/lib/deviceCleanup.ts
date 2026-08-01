// Limpeza total dos dados locais (PRD-DEL-01 v1.1, Etapa 4).
//
// GuestStorage.clearAll() remove apenas as 11 chaves do objeto KEYS. Outras 21
// com prefixo aop. sobrevivem, mais 3 fora do namespace e o sessionStorage. Duas
// delas fazem estrago real:
//
//   aop.was_authenticated       → index.tsx:103-110 manda o ex-usuário para
//                                 /login, onde ele tenta entrar numa conta que
//                                 não existe e recebe "E-mail ou senha
//                                 incorretos" — a pior mensagem possível ali.
//   aop.pending_legal_acceptance → um aceite pendente da conta excluída seria
//                                 gravado na PRÓXIMA conta criada no aparelho,
//                                 contaminando a tabela que existe justamente
//                                 para servir de prova jurídica.
//
// ESTA FUNÇÃO NÃO PODE LANÇAR. Ela roda depois do ponto sem retorno: a conta já
// foi apagada no servidor. Uma exceção aqui deixaria o aparelho sujo E faria a
// interface exibir erro para uma operação que, no servidor, deu certo. Por isso
// cada etapa é isolada em seu próprio try/catch.
//
// [REQ-DEL-16] [REQ-DEL-17] [REQ-DEL-18] [REQ-DEL-19]

import { Capacitor } from '@capacitor/core';
import { GuestStorage } from './guestStorage';
import { clearWasAuthenticated, clearRecovery } from './authFlags';
import { supabase } from './supabase';

/** Chaves de trabalho que nasceram fora do namespace aop. [REQ-DEL-17] */
const EXTRA_KEYS = ['__leverSuggestion', '__recombinationIdea', '__recombinations'];

export async function clearAllDeviceData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // -------------------------------------------------------------------------
  // 1. Notificações agendadas no sistema operacional
  // -------------------------------------------------------------------------
  // Sem isto, o ex-usuário segue recebendo lembretes de IMV de uma conta que
  // não existe mais. Vale getPending() e não lista de IDs: os identificadores
  // são derivados por hash em notifications.ts (hashId, id('pact', …),
  // MAINT_*), e qualquer lista fixa esqueceria algum. [REQ-DEL-19]
  await cancelarNotificacoesAgendadas();

  // -------------------------------------------------------------------------
  // 2. Varredura por prefixo
  // -------------------------------------------------------------------------
  // Por prefixo, não por lista: aop.feedback_${monthKey()} tem nome variável
  // por mês e nenhuma lista estática a alcançaria. [REQ-DEL-16]
  try {
    // Object.keys devolve um snapshot, então remover durante o forEach é seguro.
    Object.keys(localStorage)
      .filter((k) => k.startsWith('aop.'))
      .forEach((k) => localStorage.removeItem(k));
    EXTRA_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage indisponível (modo privado, cota) */
  }

  try {
    sessionStorage.clear();
  } catch {
    /* storage indisponível */
  }

  // -------------------------------------------------------------------------
  // 3. Flags explícitas
  // -------------------------------------------------------------------------
  // Redundante depois da varredura, e proposital: se alguma delas mudar de
  // prefixo um dia, o chamado explícito continua correto. clearWasAuthenticated
  // existe desde a migração de autenticação e nunca havia sido chamada em lugar
  // nenhum do app. [REQ-DEL-18]
  try {
    clearWasAuthenticated();
    clearRecovery();
  } catch {
    /* storage indisponível */
  }

  // -------------------------------------------------------------------------
  // 4. GuestStorage
  // -------------------------------------------------------------------------
  try {
    GuestStorage.clearAll();
  } catch {
    /* storage indisponível */
  }

  // -------------------------------------------------------------------------
  // 5. Sessão
  // -------------------------------------------------------------------------
  // scope 'local' não faz chamada de rede. É o correto aqui nos dois usos desta
  // função: na exclusão o usuário já não existe no servidor e um signOut global
  // bateria numa revogação fadada a falhar; no modo visitante não há sessão
  // alguma. Envolto em try porque nada, a esta altura, pode lançar.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* sessão já inválida */
  }

  // Rede de segurança: a chave da sessão é sb-<ref>-auth-token e não começa com
  // aop., então a varredura do passo 2 não a alcança. Se o signOut não tiver
  // conseguido gravar, um token morto sobreviveria e, no próximo carregamento,
  // o app se comportaria como logado numa conta inexistente em vez de abrir o
  // onboarding.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage indisponível */
  }
}

/**
 * Carrega o plugin sob demanda, como faz notifications.ts. O projeto nunca
 * importa @capacitor/local-notifications estaticamente — isso o traria para
 * dentro do bundle web, onde não existe notificação agendada para cancelar.
 */
async function cancelarNotificacoesAgendadas(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    /* sem permissão, plugin indisponível ou nada agendado */
  }
}
