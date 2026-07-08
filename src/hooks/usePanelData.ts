// usePanelData — agrega projects, entries, principles para o Painel e Diário.

import { useEffect, useState, useCallback } from 'react';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';
import type { Project, Entry, Principle, Chapter, BaselineAssessment } from '@/types/database';

export interface PanelData {
  projects: Project[];
  entries: Entry[];
  principles: Principle[];
  chapters: Chapter[];
  baselines: BaselineAssessment[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePanelData(): PanelData {
  const [state, setState] = useState<Omit<PanelData, 'refresh'>>({
    projects: [], entries: [], principles: [], chapters: [], baselines: [], loading: true,
  });

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Inbox processado aparece na Timeline como histórico
      const processedInbox = GuestStorage.getInboxEntries()
        .filter((e) => e.inbox_processed)
        .map((e) => ({ ...e, project_id: null as unknown as string, classification: null, is_clean_fact: false,
          copa_phase: null, linked_to: null, edit_history: [], scenario_type_at_entry: null,
          layer_at_entry: null, ai_assist_used: false, ai_assist_type: null }));
      // Decision records do guest aparecem na Timeline com os demais registros
      const guestDecisions = GuestStorage.getDecisionRecords().map((dr) => ({
        ...dr,
        project_id: (dr.project_id ?? null) as unknown as string,
        classification: null,
        is_clean_fact: false,
        copa_phase: null,
        linked_to: null,
        edit_history: [],
        ai_assist_used: false,
        ai_assist_type: null,
      }));
      setState({
        projects: GuestStorage.getProjects(),
        entries: [...GuestStorage.getEntries(), ...processedInbox, ...guestDecisions] as import('@/types/database').Entry[],
        principles: GuestStorage.getPrinciples(),
        chapters: GuestStorage.getChapters(),
        baselines: [],
        loading: false,
      });
      return;
    }
    const uid = session.user.id;
    const [projectsR, entriesR, principlesR, chaptersR, baselinesR] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', uid),
      // Inclui inbox apenas se já processado (inbox_processed=true); exclui pendentes
      supabase.from('entries').select('*').eq('user_id', uid)
        .or('entry_type.neq.inbox,inbox_processed.eq.true')
        .order('created_at', { ascending: false }),
      supabase.from('principles').select('*').eq('user_id', uid),
      supabase.from('chapters').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('baseline_assessments').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
    ]);
    setState({
      projects: (projectsR.data ?? []) as Project[],
      entries: (entriesR.data ?? []) as Entry[],
      principles: (principlesR.data ?? []) as Principle[],
      chapters: (chaptersR.data ?? []) as Chapter[],
      baselines: (baselinesR.data ?? []) as BaselineAssessment[],
      loading: false,
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { ...state, refresh: load };
}
