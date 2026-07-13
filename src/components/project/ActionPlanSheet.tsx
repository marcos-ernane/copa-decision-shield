// ActionPlanSheet — Bottom sheet de visualização e exportação do Plano de Ação 5W2H.
// Reutilizável por TimelineTab e ProjectDashboard. PRD-ITEM-05.

import { Download } from 'lucide-react';
import { exportActionPlan } from '@/lib/actionPlan';
import type { ActionPlan } from '@/lib/register';

interface ActionPlanSheetProps {
  plan: ActionPlan;
  imvTitle?: string;
  onClose: () => void;
}

const FIELDS: Array<{ key: keyof Omit<ActionPlan, 'generated_at'>; label: string }> = [
  { key: 'what',            label: 'O quê'          },
  { key: 'why',             label: 'Por quê'        },
  { key: 'how',             label: 'Como'           },
  { key: 'when',            label: 'Quando'         },
  { key: 'who_is_affected', label: 'Quem é afetado' },
  { key: 'how_much',        label: 'Quanto custa'   },
];

export function ActionPlanSheet({ plan, imvTitle, onClose }: ActionPlanSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h3 className="text-heading text-op-white font-semibold">Plano de Ação 5W2H</h3>
          {imvTitle && (
            <p className="text-small text-op-gray line-clamp-2">IMV: {imvTitle}</p>
          )}
          <p className="text-label text-op-gray">
            Gerado em {new Date(plan.generated_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Campos 5W2H */}
        <div className="space-y-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-0.5">
              <p className="text-label text-op-gray uppercase tracking-wide">{label}</p>
              <p className="text-body text-op-white">{plan[key]}</p>
            </div>
          ))}
        </div>

        {/* Exportar */}
        <button
          type="button"
          onClick={() => void exportActionPlan(plan, imvTitle)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white hover:border-op-gray/60 transition-colors"
        >
          <Download className="size-4" />
          Exportar PDF
        </button>

        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
