// widget.ts — PRD-CU-01 v1.0 Etapa 4
// Stub para integração futura com widget nativo (iOS/Android via Capacitor).
// O widget exibe o contador de itens no Inbox e abre o app na tela de captura.

export interface WidgetPayload {
  inboxCount: number;
  lastCapturedAt: string | null;
}

export async function updateWidgetData(_payload: WidgetPayload): Promise<void> {
  // TODO: integrar com @capacitor/widget quando suporte estiver disponível.
  // Ref: https://github.com/capawesome-team/capacitor-plugins (WidgetKit / AppWidget)
}

export function handleWidgetLaunch(): { openCapture: boolean } {
  // Se o app foi aberto via widget, URL contém ?widget=capture
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('widget') === 'capture') return { openCapture: true };
  }
  return { openCapture: false };
}
