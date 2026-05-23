// Analytics interno — KPIs operacionais.
// Nunca exibido ao usuário. Sem rastreamento externo.

import { GuestStorage } from './guestStorage';
import { supabase } from './supabase';

const ETHICAL_FIELD_TYPES = ['copa_session', 'structured_P', 'pressure_session'];

interface FillRate {
  filled: number;
  total: number;
  rate: number;
}

// REQ-ETHIC-05: conta entries com content.ethical_check preenchido
// sobre total de entries que suportam campo ético.
export async function getEthicalCheckFillRate(): Promise<FillRate> {
  const { data: { session } } = await supabase.auth.getSession();

  let entries: Array<{ entry_type: string; content: Record<string, unknown> | null }> = [];

  if (!session) {
    entries = GuestStorage.getEntries()
      .filter((e) => ETHICAL_FIELD_TYPES.includes(e.entry_type))
      .map((e) => ({ entry_type: e.entry_type, content: e.content as Record<string, unknown> | null }));
  } else {
    const { data } = await supabase
      .from('entries')
      .select('entry_type, content')
      .in('entry_type', ETHICAL_FIELD_TYPES);
    entries = (data ?? []) as typeof entries;
  }

  const total = entries.length;
  const filled = entries.filter((e) => {
    const v = e.content?.ethical_check;
    return typeof v === 'string' && v.trim().length > 0;
  }).length;

  return { filled, total, rate: total === 0 ? 0 : filled / total };
}
