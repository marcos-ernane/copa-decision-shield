import { createFileRoute } from '@tanstack/react-router';
import { COPAShell } from '@/components/copa/COPAShell';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const TYPES: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

export const Route = createFileRoute('/copa')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
    type:
      typeof s.type === 'string' && (TYPES as string[]).includes(s.type)
        ? (s.type as ScenarioType)
        : undefined,
    layer:
      typeof s.layer === 'string' && (LAYERS as string[]).includes(s.layer)
        ? (s.layer as OperationalLayer)
        : undefined,
  }),
  component: COPAShell,
});
