// Seletor de projeto compartilhado pelas abas do Diário.
//
// Extraído do TimelineTab, que era a única aba a tê-lo. As outras listavam
// todos os projetos de uma vez: com poucos projetos funciona, mas o app é de
// uso contínuo — quanto mais o operador registra, mais longa a rolagem, até a
// aba virar um paredão. O seletor resolve na origem, e reusar em vez de copiar
// evita que as cinco abas divirjam com o tempo.
//
// Padrão: 'all'. O operador vê tudo ao chegar e restringe se quiser — o
// inverso ("escolha primeiro") fazia a Linha do Tempo abrir vazia.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '@/types/database';

export const PROJ_ALL = 'all';
/** Só a aba Decisões usa: é a única com registros que podem não ter projeto. */
export const PROJ_NONE = 'no_project';

const ACTIVE_STATES = new Set(['new', 'capturing', 'organizing', 'proving', 'blocked']);

export function statusDotClass(state: string): string {
  if (ACTIVE_STATES.has(state)) return 'bg-op-success';
  if (state === 'concluded') return 'bg-op-danger';
  return 'bg-op-amber';
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  projects: Project[];
  /** Acrescenta a opção "Sem projeto" — exclusiva da aba Decisões. */
  includeNoProject?: boolean;
  /** Contagem ao lado de "Sem projeto", para o operador saber se vale olhar. */
  noProjectCount?: number;
  /** A legenda das cores só faz sentido uma vez por tela. */
  showLegend?: boolean;
}

export function ProjectFilterSelect({
  value,
  onChange,
  projects,
  includeNoProject = false,
  noProjectCount,
  showLegend = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Ativos primeiro, depois concluídos, depois pausados/arquivados — dentro de
  // cada grupo, o de atividade mais recente antes. Mesma ordem do TimelineTab.
  const sorted = useMemo(() => {
    const byTime = (a: Project, b: Project) => {
      const at = a.last_entry_at ? new Date(a.last_entry_at).getTime() : new Date(a.created_at).getTime();
      const bt = b.last_entry_at ? new Date(b.last_entry_at).getTime() : new Date(b.created_at).getTime();
      return bt - at;
    };
    return [
      ...projects.filter((p) => ACTIVE_STATES.has(p.state)).sort(byTime),
      ...projects.filter((p) => p.state === 'concluded').sort(byTime),
      ...projects.filter((p) => p.state === 'paused' || p.state === 'archived').sort(byTime),
    ];
  }, [projects]);

  const selected = value === PROJ_ALL || value === PROJ_NONE ? null : projects.find((p) => p.id === value);

  const rotulo =
    value === PROJ_ALL ? 'Todos os projetos'
    : value === PROJ_NONE ? 'Sem projeto'
    : (selected?.name ?? '—');

  return (
    <div className="space-y-2">
      {showLegend && (
        <div className="flex items-center gap-4 text-label text-op-gray">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-success shrink-0" />Ativo</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-danger shrink-0" />Concluído</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-amber shrink-0" />Pausado/Arquivado</span>
        </div>
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-op-gray/30 bg-op-navy text-small px-3 py-2 text-left text-op-white"
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected && <span className={`size-2 rounded-full shrink-0 ${statusDotClass(selected.state)}`} />}
            <span className="truncate">{rotulo}</span>
          </span>
          <svg
            className={`size-4 text-op-gray shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-op-gray/30 bg-op-navy shadow-lg overflow-hidden max-h-[65vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(PROJ_ALL); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors ${value === PROJ_ALL ? 'text-op-amber font-semibold' : 'text-op-white'}`}
            >
              Todos os projetos
            </button>

            {includeNoProject && (
              <button
                type="button"
                onClick={() => { onChange(PROJ_NONE); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors border-t border-op-gray/10 ${value === PROJ_NONE ? 'text-op-amber font-semibold' : 'text-op-white'}`}
              >
                <span className="truncate">Sem projeto</span>
                {typeof noProjectCount === 'number' && (
                  <span className="text-label text-op-gray shrink-0">{noProjectCount}</span>
                )}
              </button>
            )}

            {sorted.length > 0 && (
              <div className="border-t border-op-gray/10">
                {sorted.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange(p.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors border-t border-op-gray/10 first:border-t-0 ${value === p.id ? 'text-op-amber font-semibold' : 'text-op-white'}`}
                  >
                    <span className={`size-2 rounded-full shrink-0 ${statusDotClass(p.state)}`} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Formato único do nome do projeto nos cards das abas.
 *
 * A Linha do Tempo é a referência (`text-body font-semibold text-op-white`).
 * Antes cada aba escolhia o seu: a Semana usava `text-label text-op-gray`, a
 * Decisões embutia o nome numa linha de metadados. Trocar de aba dava a
 * impressão de trocar de app.
 */
export function ProjectTitle({ name }: { name: string }) {
  return <p className="text-body font-semibold text-op-white truncate">{name}</p>;
}
