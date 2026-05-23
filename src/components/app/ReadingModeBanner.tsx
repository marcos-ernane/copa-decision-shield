// ReadingModeBanner — banner discreto exibido acima do BottomNav quando
// reading_mode_enabled = true. Permite sair em 1 toque.

import { setReadingMode } from '@/hooks/useReadingMode';

export function ReadingModeBanner() {
  return (
    <div className="fixed bottom-16 inset-x-0 z-30 bg-card border-t border-border px-4 py-2 flex items-center justify-between">
      <span className="text-small text-muted-foreground">Modo Leitura ativo</span>
      <button
        type="button"
        onClick={() => void setReadingMode(false)}
        className="text-small text-foreground underline-offset-4 hover:underline"
      >
        Sair do Modo Leitura
      </button>
    </div>
  );
}
