import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PhaseGroup } from '@/lib/operationalView';
import type { Entry } from '@/types/database';
import type { CopaPhaseName } from '@/lib/operationalView';

interface PhaseSectionProps {
  group: PhaseGroup;
  renderEntry: (entry: Entry) => React.ReactNode;
}

const PHASE_BG: Record<CopaPhaseName, string> = {
  C: 'var(--color-brand-blue)',
  O: 'var(--color-brand-cyan)',
  P: 'var(--color-brand-amber)',
  A: 'var(--color-brand-green)',
  outros: 'var(--color-surface-3)',
};

function formatLastDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  return `${day}/${month}`;
}

export function PhaseSection({ group, renderEntry }: PhaseSectionProps) {
  const [expanded, setExpanded] = useState(group.count > 0);

  const isEmpty = group.count === 0;
  const iconBg = PHASE_BG[group.phase];

  return (
    <div className="pl-4">
      {/* Phase header */}
      <button
        type="button"
        onClick={() => { if (!isEmpty) setExpanded((v) => !v); }}
        disabled={isEmpty}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left ${isEmpty ? 'cursor-default' : 'hover:bg-op-navy-elevated transition-colors'}`}
        aria-expanded={!isEmpty ? expanded : undefined}
      >
        {/* Phase icon — circle with letter */}
        <span
          className="size-[22px] rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[11px] leading-none"
          style={{ backgroundColor: iconBg }}
          aria-hidden
        >
          {group.phase === 'outros' ? '·' : group.phase}
        </span>

        {/* Label */}
        <span
          className={`text-small font-bold flex-1 truncate ${isEmpty ? 'text-op-gray' : 'text-op-white'}`}
        >
          {group.label}
        </span>

        {/* Count */}
        <span className="text-label text-op-gray shrink-0">
          {group.count} {group.count === 1 ? 'registro' : 'registros'}
        </span>

        {/* Last date */}
        {group.lastEntryAt && (
          <span className="text-label text-op-gray shrink-0">
            · último em {formatLastDate(group.lastEntryAt)}
          </span>
        )}

        {/* Chevron — hidden when empty */}
        {!isEmpty && (
          expanded
            ? <ChevronUp className="size-3.5 text-op-gray shrink-0" />
            : <ChevronDown className="size-3.5 text-op-gray shrink-0" />
        )}
      </button>

      {/* Expanded entries */}
      {expanded && !isEmpty && (
        <div className="pl-4 space-y-2 pb-1">
          {(() => {
            // Corrective entries are nested below the entry they correct.
            // Orphaned correctives (parent not in this phase) appear at top level.
            const correctives = group.entries.filter(e => e.entry_type === 'corrective');
            const nonCorrectives = group.entries.filter(e => e.entry_type !== 'corrective');
            const parentIds = new Set(nonCorrectives.map(e => e.id));

            const corrMap = new Map<string, Entry[]>();
            for (const c of correctives) {
              if (c.linked_to && parentIds.has(c.linked_to)) {
                const arr = corrMap.get(c.linked_to) ?? [];
                arr.push(c);
                corrMap.set(c.linked_to, arr);
              }
            }
            const orphaned = correctives.filter(c => !c.linked_to || !parentIds.has(c.linked_to));

            return (
              <>
                {nonCorrectives.map((entry) => (
                  <div key={entry.id}>
                    {renderEntry(entry)}
                    {(corrMap.get(entry.id) ?? []).map((corr) => (
                      <div
                        key={corr.id}
                        className="mt-1 ml-1 pl-3 border-l-2"
                        style={{ borderLeftColor: 'rgba(217,119,6,0.45)' }}
                      >
                        {renderEntry(corr)}
                      </div>
                    ))}
                  </div>
                ))}
                {orphaned.map((entry) => (
                  <div key={entry.id}>{renderEntry(entry)}</div>
                ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
