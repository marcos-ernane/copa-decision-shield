import { useMemo, useState, useCallback } from 'react';
import type { Entry, Project } from '@/types/database';
import { GuestStorage } from '@/lib/guestStorage';

export interface PendingBottleneck {
  entryId: string;
  text: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

export function usePendingBottlenecks(entries: Entry[], projects: Project[]) {
  const [dismissed, setDismissed] = useState<string[]>(() =>
    GuestStorage.getDismissedBottlenecks(),
  );

  const pending = useMemo<PendingBottleneck[]>(() => {
    return entries
      .filter((e) => {
        if (e.entry_type !== 'structured_A') return false;
        const text = (e.content as { next_bottleneck?: string })?.next_bottleneck?.trim();
        return !!text && !dismissed.includes(e.id);
      })
      .map((e) => {
        const text = (e.content as { next_bottleneck?: string }).next_bottleneck!.trim();
        const project = projects.find((p) => p.id === e.project_id);
        return {
          entryId: e.id,
          text,
          projectId: e.project_id,
          projectName: project?.name ?? 'Projeto',
          createdAt: e.created_at,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, projects, dismissed]);

  const dismiss = useCallback((entryId: string) => {
    GuestStorage.dismissBottleneck(entryId);
    setDismissed((prev) => [...prev, entryId]);
  }, []);

  return { pending, dismiss };
}
