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
      setState({
        projects: GuestStorage.getProjects(),
        entries: GuestStorage.getEntries(),
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
      supabase.from('entries').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
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
