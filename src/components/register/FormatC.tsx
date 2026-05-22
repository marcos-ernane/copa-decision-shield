// Formato C — Análise de Situação. 4 quadros.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredC } from '@/lib/register';

interface Props { projectId: string; onSaved: () => void; }

export function FormatC({ projectId, onSaved }: Props) {
  const [fact, setFact] = useState('');
  const [interp, setInterp] = useState('');
  const [hyp, setHyp] = useState('');
  const [imv, setImv] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveStructuredC(projectId, {
      fact_text: fact.trim(),
      interpretation_text: interp.trim(),
      hypothesis_text: hyp.trim(),
      imv_possible: imv.trim(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-small text-muted-foreground mb-1">Quadro 1 — Fatos observados</p>
        <VoiceInput value={fact} onChange={setFact} placeholder="O que você viu, sem interpretar." rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Quadro 2 — Interpretações</p>
        <VoiceInput value={interp} onChange={setInterp} placeholder="O que você concluiu." rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Quadro 3 — Hipóteses testáveis</p>
        <VoiceInput value={hyp} onChange={setHyp} placeholder="O que poderia ser verdade." rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Quadro 4 — IMV possível (opcional)</p>
        <VoiceInput value={imv} onChange={setImv} placeholder="O menor teste que caberia aqui." rows={2} />
      </div>
      <Button className="w-full" disabled={!fact.trim() || saving} onClick={save}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  );
}
