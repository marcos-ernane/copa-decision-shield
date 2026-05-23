import { createFileRoute } from '@tanstack/react-router';
import { OperatorSheetScreen } from '@/components/sheet/OperatorSheetScreen';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const TYPES: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

type Search = {
  projectId?: string;
  fact?: string;
  friction?: string;
  imv?: string;
  type?: ScenarioType;
  layer?: OperationalLayer;
};

export const Route = createFileRoute('/compass/sheet')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
    fact: typeof s.fact === 'string' ? s.fact : undefined,
    friction: typeof s.friction === 'string' ? s.friction : undefined,
    imv: typeof s.imv === 'string' ? s.imv : undefined,
    type:
      typeof s.type === 'string' && (TYPES as string[]).includes(s.type)
        ? (s.type as ScenarioType)
        : undefined,
    layer:
      typeof s.layer === 'string' && (LAYERS as string[]).includes(s.layer)
        ? (s.layer as OperationalLayer)
        : undefined,
  }),
  component: Page,
});

function Page() {
  const { projectId, fact, friction, imv, type, layer } = Route.useSearch();
  return (
    <OperatorSheetScreen
      initialProjectId={projectId ?? null}
      initialFact={fact ?? null}
      initialFriction={friction ?? null}
      initialImv={imv ?? null}
      initialScenario={type ?? null}
      initialLayer={layer ?? null}
    />
  );
}
