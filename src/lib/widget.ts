// widget.ts — PRD-CU-01 v1.0 Etapa 4
// Integração com widget nativo (iOS/Android via Capacitor — instalação futura).

import { saveInboxEntry } from './universalCapture';

export interface WidgetPayload {
  inboxCount: number;
  lastCapturedAt: string | null;
}

export async function updateWidgetData(_payload: WidgetPayload): Promise<void> {
  // TODO: integrar com @capacitor/widget quando suporte estiver disponível.
  // Ref: https://github.com/capawesome-team/capacitor-plugins (WidgetKit / AppWidget)
}

// Chamado quando o usuário captura texto diretamente pelo widget.
// Salva a entrada no Inbox e dispara atualização de badge.
export async function handleWidgetCapture(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await saveInboxEntry(trimmed, 'text');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
  }
  // Listener do Capacitor para ação do widget (integração futura):
  // App.addListener('appUrlOpen', ({ url }) => {
  //   const params = new URL(url).searchParams;
  //   const widgetText = params.get('widget_capture');
  //   if (widgetText) void handleWidgetCapture(widgetText);
  // });
}

// Detecta se o app foi aberto via widget e deve abrir a tela de captura.
export function handleWidgetLaunch(): { openCapture: boolean } {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('widget') === 'capture') return { openCapture: true };
  }
  return { openCapture: false };
}
