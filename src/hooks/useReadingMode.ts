// useReadingMode — lê profile.reading_mode_enabled de Supabase (auth) ou GuestStorage.
// Reage a mudanças via custom event 'reading-mode-changed'.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';

const EVENT = 'reading-mode-changed';

export function emitReadingModeChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function useReadingMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('reading_mode_enabled')
          .eq('id', session.user.id)
          .maybeSingle();
        if (cancelled) return;
        setEnabled(Boolean((data as { reading_mode_enabled?: boolean } | null)?.reading_mode_enabled));
        return;
      }
      const p = GuestStorage.getProfile();
      setEnabled(Boolean(p?.reading_mode_enabled));
    }

    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(EVENT, onChange);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
      subscription.unsubscribe();
    };
  }, []);

  return enabled;
}

export async function setReadingMode(value: boolean): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('profiles').update({ reading_mode_enabled: value }).eq('id', session.user.id);
  }
  GuestStorage.setProfile({ reading_mode_enabled: value });
  emitReadingModeChange();
}
