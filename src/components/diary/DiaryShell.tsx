import { useState, type ReactNode } from 'react';
import { useRouter, useNavigate, Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { TimelineTab } from './TimelineTab';
import { PrinciplesTab } from './PrinciplesTab';
import { SymptomIndex } from './SymptomIndex';
import { WeeklyReport } from './WeeklyReport';
import { OperatorManual } from '@/components/manual/OperatorManual';

export type DiaryTab = 'timeline' | 'principles' | 'symptoms' | 'weekly' | 'manual';

interface Props {
  active: DiaryTab;
  /** When provided (manual route), renders custom content instead of built-in tab. */
  children?: ReactNode;
}

const TABS: Array<{ id: DiaryTab; label: string; to: string }> = [
  { id: 'timeline', label: 'Linha do tempo', to: '/diary' },
  { id: 'principles', label: 'Princípios', to: '/diary/principles' },
  { id: 'symptoms', label: 'Sintomas', to: '/diary/symptoms' },
  { id: 'weekly', label: 'Semana', to: '/diary/weekly' },
  { id: 'manual', label: 'Manual', to: '/diary/manual' },
];

export function DiaryShell({ active, children }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DiaryTab>(active);

  function go(id: DiaryTab) {
    setTab(id);
    const target = TABS.find((t) => t.id === id);
    if (target) {
      if (id === 'timeline') navigate({ to: '/diary' });
      else navigate({ to: '/diary/$', params: { _splat: id === 'manual' ? 'manual' : id === 'principles' ? 'principles' : id === 'symptoms' ? 'symptoms' : 'weekly' } });
    }
  }

  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="sticky top-0 bg-background z-10 border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-heading text-foreground">Diário do operador</h1>
        </div>
        <nav className="flex overflow-x-auto px-2 gap-1 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`text-small px-3 py-1.5 rounded-md whitespace-nowrap ${tab === t.id ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="px-4 py-4">
        {children ?? (
          <>
            {tab === 'timeline' && <TimelineTab />}
            {tab === 'principles' && <PrinciplesTab />}
            {tab === 'symptoms' && <SymptomIndex />}
            {tab === 'weekly' && <WeeklyReport />}
            {tab === 'manual' && <OperatorManual />}
          </>
        )}
      </div>
    </div>
  );
}

// Re-export so route files can render content embeds.
export { Link };
