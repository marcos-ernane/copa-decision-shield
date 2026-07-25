import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useRouterState, useSearch, Link } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { TimelineTab } from './TimelineTab';
import { PrinciplesTab } from './PrinciplesTab';
import { SymptomIndex } from './SymptomIndex';
import { GargalosTab } from './GargalosTab';
import { WeeklyReport } from './WeeklyReport';
import { OperatorManual } from '@/components/manual/OperatorManual';

export type DiaryTab = 'timeline' | 'principles' | 'symptoms' | 'gargalos' | 'weekly' | 'manual';

interface Props {
  active: DiaryTab;
  /** When provided (manual route), renders custom content instead of built-in tab. */
  children?: ReactNode;
}

const TABS: Array<{ id: DiaryTab; label: string }> = [
  { id: 'timeline', label: 'Linha do tempo' },
  { id: 'principles', label: 'Princípios' },
  { id: 'symptoms', label: 'Sintomas' },
  { id: 'gargalos', label: 'Gargalos' },
  { id: 'weekly', label: 'Semana' },
  { id: 'manual', label: 'Manual' },
];

export function DiaryShell({ active: _active, children }: Props) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as { principleId?: string };

  const activeFromUrl: DiaryTab =
    pathname.includes('/principles') ? 'principles' :
    pathname.includes('/symptoms') ? 'symptoms' :
    pathname.includes('/gargalos') ? 'gargalos' :
    pathname.includes('/weekly') ? 'weekly' :
    pathname.includes('/manual') ? 'manual' :
    // [REQ-PM-11] Quando principleId está presente, abre direto na aba de princípios
    search.principleId ? 'principles' :
    'timeline';

  const [tab, setTab] = useState<DiaryTab>(activeFromUrl);

  useEffect(() => { setTab(activeFromUrl); }, [activeFromUrl]);

  // Altura real do cabeçalho (título + abas) publicada como --diary-header-h.
  // Permite que elementos internos fiquem sticky logo abaixo dele sem offset
  // chutado — acompanha safe-area do iPhone e quebra de linha das abas.
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    setHeaderH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  function go(id: DiaryTab) {
    setTab(id);
    if (id === 'timeline') navigate({ to: '/diary' });
    else {
      const splat = id === 'manual' ? 'manual'
        : id === 'principles' ? 'principles'
        : id === 'symptoms' ? 'symptoms'
        : id === 'gargalos' ? 'gargalos'
        : 'weekly';
      navigate({ to: '/diary/$', params: { _splat: splat } });
    }
  }

  return (
    <div
      className="min-h-screen bg-op-black pb-24"
      style={{
        backgroundColor: "#070C12",
        minHeight: "100vh",
        ['--diary-header-h' as string]: `${headerH}px`,
      }}
    >
      <header ref={headerRef} className="sticky top-0 bg-op-black z-10 border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <BackButton />
          <h1 className="text-heading text-foreground">Diário do operador</h1>
          <CloseButton className="ml-auto" />
        </div>
        <nav className="flex overflow-x-auto px-2 gap-1 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`text-small px-3 py-1.5 rounded-md whitespace-nowrap ${tab === t.id ? 'bg-op-amber text-op-black font-semibold' : 'text-op-gray hover:opacity-80'}`}
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
            {tab === 'gargalos' && <GargalosTab />}
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
