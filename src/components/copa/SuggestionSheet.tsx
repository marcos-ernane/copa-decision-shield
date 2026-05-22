// Bottom-sheet de sugestões com disclaimer obrigatório no topo.
// Não decide nada — apenas oferece opções.

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SUGGESTION_DISCLAIMER } from '@/lib/copa';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  suggestions: string[];
  footerHint?: string | null;
}

export function SuggestionSheet({ open, onClose, title, suggestions, footerHint }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-heading">{title}</SheetTitle>
          <p className="text-small text-muted-foreground">{SUGGESTION_DISCLAIMER}</p>
        </SheetHeader>
        <ul className="mt-4 space-y-3">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="rounded-md border border-border bg-card p-3 text-body text-foreground"
            >
              {s}
            </li>
          ))}
        </ul>
        {footerHint && (
          <p className="mt-4 text-small text-muted-foreground">{footerHint}</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
