// sheet.ts — Persistência da Folha do Operador.
// Funciona online (Supabase / operator_sheets) ou offline (GuestStorage).
// Não interrompe fluxos. Sem gamificação.

import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type { OperatorSheet, SheetMode } from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface SheetInput {
  scenario_type: ScenarioType | null;
  layer: OperationalLayer | null;
  fact: string | null;
  friction: string | null;
  resource: string | null;
  imv: string | null;
  metric: string | null;
  deadline: string | null;
  cut_rule: string | null;
  principle: string | null;
  next_bottleneck: string | null;
  next_action: string | null;
  project_id: string | null;
  mode: SheetMode;
}

export async function saveSheet(input: SheetInput): Promise<OperatorSheet> {
  const { data: { session } } = await supabase.auth.getSession();
  const nowIso = new Date().toISOString();

  if (!session) {
    const local: OperatorSheet = {
      id: guestId(),
      user_id: 'guest',
      project_id: input.project_id,
      scenario_type: input.scenario_type,
      layer: input.layer,
      fact: input.fact,
      friction: input.friction,
      resource: input.resource,
      imv: input.imv,
      metric: input.metric,
      deadline: input.deadline,
      cut_rule: input.cut_rule,
      principle: input.principle,
      next_bottleneck: input.next_bottleneck,
      next_action: input.next_action,
      mode: input.mode,
      created_at: nowIso,
      updated_at: nowIso,
    };
    GuestStorage.addSheet(local);
    return local;
  }

  const row = {
    user_id: session.user.id,
    project_id: input.project_id,
    scenario_type: input.scenario_type,
    layer: input.layer,
    fact: input.fact,
    friction: input.friction,
    resource: input.resource,
    imv: input.imv,
    metric: input.metric,
    deadline: input.deadline,
    cut_rule: input.cut_rule,
    principle: input.principle,
    next_bottleneck: input.next_bottleneck,
    next_action: input.next_action,
    mode: input.mode,
  };

  const { data, error } = await supabase
    .from('operator_sheets')
    .insert(row)
    .select('*')
    .single();

  if (error || !data) {
    // Fallback offline.
    const local: OperatorSheet = {
      ...(row as unknown as OperatorSheet),
      id: guestId(),
      created_at: nowIso,
      updated_at: nowIso,
    };
    GuestStorage.addSheet(local);
    return local;
  }
  return data as OperatorSheet;
}

export async function listSheets(): Promise<OperatorSheet[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return GuestStorage.getSheets();
  const { data, error } = await supabase
    .from('operator_sheets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return GuestStorage.getSheets();
  return (data ?? []) as OperatorSheet[];
}

export async function getSheetById(id: string): Promise<OperatorSheet | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return GuestStorage.getSheets().find((s) => s.id === id) ?? null;
  const { data } = await supabase
    .from('operator_sheets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as OperatorSheet | null) ?? null;
}

// Compartilha a folha como imagem via Capacitor Share (mobile)
// ou faz download do PNG (web).
export async function shareSheetImage(el: HTMLElement, fileBase = 'folha-operador'): Promise<void> {
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const dataUrl = canvas.toDataURL('image/png');
  const fileName = `${fileBase}-${new Date().toISOString().slice(0, 10)}.png`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: 'Folha do Operador',
        text: 'Minha Folha do Operador.',
        url: dataUrl,
      });
    } catch { /* user cancel */ }
    return;
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
