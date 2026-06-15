// trial.ts — comunicação única do dia 12 do trial.

import { supabase } from './supabase';
import type { Subscription } from '@/types/database';

const COMMUNICATED_KEY = 'opv3:trial_d12_communicated';

export interface TrialEndingData {
  daysLeft: number;
  entriesCount: number;
  principlesCount: number;
  copaCount: number;
}

export async function checkTrialDay12(userId: string): Promise<TrialEndingData | null> {
  try {
    if (localStorage.getItem(COMMUNICATED_KEY) === userId) return null;

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    const sub = subData as Subscription | null;
    if (!sub || sub.plan !== 'trial' || !sub.trial_ends_at) return null;

    const end = new Date(sub.trial_ends_at).getTime();
    const now = Date.now();
    const daysLeft = Math.ceil((end - now) / (24 * 3600 * 1000));
    if (daysLeft > 2 || daysLeft < 0) return null;

    const [entries, principles, copas] = await Promise.all([
      supabase.from('entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('principles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('entry_type', ['structured_C']),
    ]);

    return {
      daysLeft,
      entriesCount: entries.count ?? 0,
      principlesCount: principles.count ?? 0,
      copaCount: copas.count ?? 0,
    };
  } catch {
    return null;
  }
}

export function markTrialDay12Communicated(userId: string): void {
  try {
    localStorage.setItem(COMMUNICATED_KEY, userId);
  } catch {
    // ignore
  }
}
