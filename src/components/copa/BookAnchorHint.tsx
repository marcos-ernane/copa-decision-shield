// Microfrase âncora — 11px, surface-3, sem borda. Sussurro.
// Renderiza apenas se book_anchors_enabled no perfil.

import { useEffect, useState } from 'react';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';

interface Props {
  text: string;
}

export function BookAnchorHint({ text }: Props) {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const p = GuestStorage.getProfile();
        setEnabled(p?.book_anchors_enabled !== false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('book_anchors_enabled')
        .eq('id', session.user.id)
        .maybeSingle();
      setEnabled((data as { book_anchors_enabled?: boolean } | null)?.book_anchors_enabled !== false);
    })();
  }, []);

  if (!enabled) return null;
  return (
    <p
      className="text-label mt-2"
      style={{ color: 'var(--color-surface-3)', fontSize: 11, fontWeight: 400 }}
    >
      {text}
    </p>
  );
}
