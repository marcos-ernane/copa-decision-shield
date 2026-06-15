// CreativeDone — tela final: conversão da escolha em IMV ou salvamento sem IMV.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveCreativeSession, type CreativeSessionContent } from '@/lib/creative';

interface Props {
  baseSession: Omit<
    CreativeSessionContent,
    'converted_to_imv' | 'imv_action' | 'imv_metric' | 'imv_deadline'
  >;
  mode: 'convert' | 'save_only';
  onAdjust: () => void;
}

export function CreativeDone({ baseSession, mode, onAdjust }: Props) {
  const navigate = useNavigate();
  const [action, setAction] = useState(baseSession.chosen_alternative);
  const [metric, setMetric] = useState('');
  const [deadline, setDeadline] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedNoProject, setSavedNoProject] = useState(false);

  async function handleSaveOnly() {
    setSaving(true);
    const content: CreativeSessionContent = {
      ...baseSession,
      converted_to_imv: false,
      imv_action: null,
      imv_metric: null,
      imv_deadline: null,
    };
    const { projectId } = await saveCreativeSession(content);
    setSaving(false);
    if (!projectId) {
      setSavedNoProject(true);
      return;
    }
    navigate({ to: '/compass' });
  }

  async function handleSaveIMV() {
    if (action.trim().length === 0 || metric.trim().length === 0) return;
    setSaving(true);
    const content: CreativeSessionContent = {
      ...baseSession,
      converted_to_imv: true,
      imv_action: action.trim(),
      imv_metric: metric.trim(),
      imv_deadline: deadline || null,
    };
    const { projectId } = await saveCreativeSession(content);
    setSaving(false);
    if (!projectId) {
      setSavedNoProject(true);
      return;
    }
    navigate({ to: '/register/structured', search: { projectId } as never });
  }

  if (savedNoProject) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-title">Sessão salva apenas localmente</h2>
        <p className="text-body text-muted-foreground">
          Sem projeto ativo no momento. A sessão foi mantida nesta tela. Crie um projeto para registrar.
        </p>
        <Button onClick={() => navigate({ to: '/compass' })}>Voltar à Bússola</Button>
      </div>
    );
  }

  if (mode === 'save_only') {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-title">Salvar sessão sem IMV</h2>
        <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
          "{baseSession.chosen_alternative}"
        </p>
        <p className="text-small text-muted-foreground">
          A sessão será registrada como creative_session no projeto ativo.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAdjust}>Ajustar</Button>
          <Button className="flex-1" disabled={saving} onClick={handleSaveOnly}>
            Salvar sessão
          </Button>
        </div>
      </div>
    );
  }

  const canSave = action.trim().length > 0 && metric.trim().length > 0;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">Transformar em IMV</h2>
      <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
        "{baseSession.chosen_alternative}"
      </p>

      <div>
        <label className="text-small font-medium">Ação</label>
        <VoiceInput value={action} onChange={setAction} rows={2} />
        <p className="text-small text-muted-foreground mt-1">
          Editável — use a alternativa como ponto de partida.
        </p>
      </div>

      <div>
        <label className="text-small font-medium">
          Métrica <span style={{ color: 'var(--color-brand-red)' }}>*</span>
        </label>
        <Input
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="Como saberá se funcionou?"
        />
      </div>

      <div>
        <label className="text-small font-medium">Prazo</label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onAdjust}>Ajustar</Button>
        <Button className="flex-1" disabled={!canSave || saving} onClick={handleSaveIMV}>
          Salvar IMV
        </Button>
      </div>
    </div>
  );
}
