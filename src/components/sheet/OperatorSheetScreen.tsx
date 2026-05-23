// OperatorSheetScreen — Folha do Operador completa, modo rápido/completo.
// Atende REQ-SHEET-01..05. Offline-first via lib/sheet.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { SheetField } from './SheetField';
import { listProjects } from '@/lib/projects';
import { saveSheet, shareSheetImage } from '@/lib/sheet';
import type { Project, OperatorSheet, SheetMode } from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

interface Props {
  initialProjectId?: string | null;
}

export function OperatorSheetScreen({ initialProjectId = null }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<SheetMode>('quick');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [fact, setFact] = useState('');
  const [friction, setFriction] = useState('');
  const [resource, setResource] = useState('');
  const [imv, setImv] = useState('');
  const [metric, setMetric] = useState('');
  const [deadline, setDeadline] = useState('');
  const [cutRule, setCutRule] = useState('');
  const [principle, setPrinciple] = useState('');
  const [nextBottleneck, setNextBottleneck] = useState('');
  const [nextAction, setNextAction] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<OperatorSheet | null>(null);

  useEffect(() => { void listProjects().then(setProjects); }, []);

  const requiredOk =
    !!scenario && !!layer && fact.trim() && friction.trim() && imv.trim() && metric.trim();

  async function onSave() {
    if (!requiredOk || saving) return;
    setSaving(true);
    try {
      const res = await saveSheet({
        scenario_type: scenario,
        layer,
        fact: fact.trim() || null,
        friction: friction.trim() || null,
        resource: mode === 'complete' ? (resource.trim() || null) : null,
        imv: imv.trim() || null,
        metric: metric.trim() || null,
        deadline: mode === 'complete' && deadline ? deadline : null,
        cut_rule: mode === 'complete' ? (cutRule.trim() || null) : null,
        principle: mode === 'complete' ? (principle.trim() || null) : null,
        next_bottleneck: mode === 'complete' ? (nextBottleneck.trim() || null) : null,
        next_action: mode === 'complete' ? (nextAction.trim() || null) : null,
        project_id: projectId,
        mode,
      });
      setSaved(res);
    } finally {
      setSaving(false);
    }
  }

  async function onShare() {
    if (!sheetRef.current) return;
    await shareSheetImage(sheetRef.current);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground flex-1">Folha do Operador</h1>
        <div className="flex rounded-md border border-border overflow-hidden text-label">
          <button
            onClick={() => setMode('quick')}
            className={`px-3 py-1.5 ${mode === 'quick' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            Rápido
          </button>
          <button
            onClick={() => setMode('complete')}
            className={`px-3 py-1.5 ${mode === 'complete' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            Completo
          </button>
        </div>
      </header>

      <main ref={sheetRef} className="px-4 py-5 space-y-6 max-w-md mx-auto bg-background">
        {/* TIPO */}
        <section className="space-y-2">
          <p className="text-label uppercase text-muted-foreground">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => {
              const active = scenario === s;
              return (
                <button
                  key={s}
                  onClick={() => setScenario(active ? null : s)}
                  className={active ? 'opacity-100' : 'opacity-60'}
                >
                  <ScenarioTypeChip type={s} size="md" />
                </button>
              );
            })}
          </div>
        </section>

        {/* CAMADA */}
        <section className="space-y-2">
          <p className="text-label uppercase text-muted-foreground">Camada</p>
          <div className="flex flex-wrap gap-2">
            {LAYERS.map((l) => {
              const active = layer === l;
              return (
                <button
                  key={l}
                  onClick={() => setLayer(active ? null : l)}
                  className={active ? 'opacity-100' : 'opacity-60'}
                >
                  <LayerChip layer={l} size="md" />
                </button>
              );
            })}
          </div>
        </section>

        <hr className="border-border" />

        {/* DIAGNÓSTICO */}
        <section className="space-y-3">
          <p className="text-label uppercase text-muted-foreground">Diagnóstico</p>
          <SheetField label="Fato" value={fact} onChange={setFact} type="textarea"
            placeholder="O que você viu — sem concluir" />
          <SheetField label="Fricção" value={friction} onChange={setFriction} type="textarea"
            placeholder="O que está travando agora" />
          {mode === 'complete' && (
            <SheetField label="Recurso" value={resource} onChange={setResource} type="textarea"
              placeholder="O que já existe e serve" />
          )}
        </section>

        <hr className="border-border" />

        {/* AÇÃO */}
        <section className="space-y-3">
          <p className="text-label uppercase text-muted-foreground">Ação</p>
          <SheetField label="IMV" value={imv} onChange={setImv} type="textarea"
            placeholder="Menor teste reversível" />
          <SheetField label="Métrica" value={metric} onChange={setMetric}
            placeholder="Como vai medir" />
          {mode === 'complete' && (
            <>
              <SheetField label="Prazo" value={deadline} onChange={setDeadline} type="date" />
              <SheetField label="Regra de corte" value={cutRule} onChange={setCutRule} type="textarea"
                placeholder="Quando parar o teste" />
            </>
          )}
        </section>

        {mode === 'complete' && (
          <>
            <hr className="border-border" />
            <section className="space-y-3">
              <p className="text-label uppercase text-muted-foreground">Consolidação</p>
              <SheetField label="Princípio" value={principle} onChange={setPrinciple} type="textarea" />
              <SheetField label="Próximo gargalo" value={nextBottleneck} onChange={setNextBottleneck} type="textarea" />
              <SheetField label="Próxima ação" value={nextAction} onChange={setNextAction} type="textarea" />
            </section>
          </>
        )}

        <hr className="border-border" />

        {/* Vínculo a projeto */}
        <section className="space-y-2">
          <p className="text-label uppercase text-muted-foreground">Vincular a projeto</p>
          <select
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-small"
          >
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </section>
      </main>

      <div className="fixed bottom-16 inset-x-0 px-4 pb-3 pt-2 bg-background border-t border-border">
        <div className="max-w-md mx-auto flex gap-2">
          {saved ? (
            <>
              <Button onClick={onShare} variant="outline" className="flex-1">
                <Share2 className="size-4 mr-2" /> Compartilhar Folha
              </Button>
              <Button
                onClick={() => navigate({ to: '/compass/sheets' })}
                className="flex-1"
              >
                <Check className="size-4 mr-2" /> Ver histórico
              </Button>
            </>
          ) : (
            <Button
              onClick={onSave}
              disabled={!requiredOk || saving}
              className="flex-1"
            >
              {saving ? 'Salvando…' : 'Salvar folha'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
