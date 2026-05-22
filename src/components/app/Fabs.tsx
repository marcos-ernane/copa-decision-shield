// Cluster de FABs — Pressão + COPA. Visíveis em todas as telas exceto onboarding,
// fluxos modais fullscreen e Modo Leitura (REQ-NAV-01).

import { Zap, Target } from 'lucide-react';
import { FABButton } from './FABButton';

export function Fabs() {
  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
      <FABButton to="/pressure" icon={Zap} label="PRESSÃO" colorScheme="pressure" />
      <FABButton to="/copa" icon={Target} label="COPA" colorScheme="primary" />
    </div>
  );
}
