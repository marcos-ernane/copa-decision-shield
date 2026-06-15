// Cluster de FABs — Pressão (+ Protocolo 5min opcional).
// Visíveis em todas as telas exceto onboarding, fluxos modais fullscreen e Modo Leitura.

import { useEffect, useState } from 'react';
import { Zap, Clock } from 'lucide-react';
import { FABButton } from './FABButton';

const KEY = 'aop.protocol5_fab_enabled';

export function isProtocol5FabEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setProtocol5FabEnabled(value: boolean): void {
  try {
    window.localStorage.setItem(KEY, value ? '1' : '0');
    window.dispatchEvent(new Event('aop:protocol5-fab-change'));
  } catch {
    /* noop */
  }
}

export function Fabs() {
  const [protocol5, setProtocol5] = useState(false);
  useEffect(() => {
    setProtocol5(isProtocol5FabEnabled());
    const handler = () => setProtocol5(isProtocol5FabEnabled());
    window.addEventListener('aop:protocol5-fab-change', handler);
    return () => window.removeEventListener('aop:protocol5-fab-change', handler);
  }, []);

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
      <FABButton to="/pressure" icon={Zap} label="PRESSÃO" colorScheme="pressure" />
      {protocol5 && (
        <FABButton
          to="/protocol5"
          icon={Clock}
          label="5min"
          colorScheme="tertiary"
          size="small"
        />
      )}
    </div>
  );
}
