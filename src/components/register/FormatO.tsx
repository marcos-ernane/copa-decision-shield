// Formato O — Mapa 3R: Recursos, Fricções, Gargalo.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredO } from '@/lib/register';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props { projectId: string; scenarioType?: ScenarioType | null; currentLayer?: OperationalLayer | null; onSaved: () => void; }

export function FormatO({ projectId, scenarioType, currentLayer, onSaved }: Props) {
  const [resources, setResources] = useState('');
  const [frictions, setFrictions] = useState('');
  const [bottleneck, setBottleneck] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveStructuredO(projectId, {
      resources: resources.trim(),
      frictions: frictions.trim(),
      bottleneck: bottleneck.trim(),
    }, scenarioType, currentLayer);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-small text-muted-foreground mb-1">Recursos disponíveis</p>
        <VoiceInput value={resources} onChange={setResources} placeholder="O que já existe sem precisar criar." rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Fricções e obstáculos</p>
        <VoiceInput value={frictions} onChange={setFrictions} placeholder="Onde o sistema perde energia." rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Gargalo principal — 1 frase</p>
        <VoiceInput value={bottleneck} onChange={setBottleneck} placeholder="O que mais governa o resultado." rows={2} />
      </div>
      <Button
        className="w-full"
        disabled={!resources.trim() || !frictions.trim() || !bottleneck.trim() || saving}
        onClick={save}
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  );
}
