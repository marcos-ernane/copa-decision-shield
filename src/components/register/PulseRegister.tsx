// PulseRegister — registro rápido (<30s). REQ-REG-01/02/03.
// Texto + voz, classificação obrigatória, detecção suave de interpretação.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { ProjectPicker } from './ProjectPicker';
import { useProjectPicker } from '@/hooks/useProjectPicker';
import {
  detectInterpretation,
  savePulse,
  type PulseClassification,
} from '@/lib/register';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';

const OPTIONS: { value: PulseClassification; label: string }[] = [
  { value: 'fact', label: 'Um fato que observei' },
  { value: 'decision', label: 'Uma decisão que tomei' },
  { value: 'result', label: 'Um resultado que vi' },
  { value: 'doubt', label: 'Uma dúvida que surgiu' },
];

export function PulseRegister() {
  const navigate = useNavigate();
  const { projectId, setProjectId, projects } = useProjectPicker();
  const [text, setText] = useState('');
  const [classification, setClassification] = useState<PulseClassification | null>(null);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');
  const [reformulation, setReformulation] = useState<string | null>(null);
  const [loadingReformulation, setLoadingReformulation] = useState(false);
  const [saving, setSaving] = useState(false);
  const valueBefore = useRef('');

  // Detecta método de entrada por mudança grande no texto (voz).
  function handleChange(v: string) {
    const delta = v.length - valueBefore.current.length;
    if (delta > 10) setInputMethod('voice');
    valueBefore.current = v;
    setText(v);
    setReformulation(null);
  }

  const hasInterpretation = useMemo(() => detectInterpretation(text), [text]);
  const inconsistent = hasInterpretation && classification === 'fact';

  useEffect(() => {
    let cancelled = false;
    if (!inconsistent || text.trim().length < 8) {
      setReformulation(null);
      return;
    }
    (async () => {
      setLoadingReformulation(true);
      const r = await askFacilitator('COPA_CAPTURE_INTERPRETATION', { text });
      if (!cancelled) {
        setLoadingReformulation(false);
        setReformulation(r);
      }
    })();
    return () => { cancelled = true; };
  }, [inconsistent, text]);

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  async function onSave() {
    if (!projectId || !classification || !text.trim()) return;
    setSaving(true);
    const project = projects.find((p) => p.id === projectId);
    try {
      await savePulse(projectId, {
        text: text.trim(),
        fact_text: hasInterpretation ? '' : text.trim(),
        interpretation_text: hasInterpretation ? text.trim() : '',
        classification,
        input_method: inputMethod,
        has_mixed_interpretation: hasInterpretation,
      }, project?.scenario_type ?? null);
      navigate({ to: '/project/$id/dashboard', params: { id: projectId } });
    } finally {
      setSaving(false);
    }
  }

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <div>
          <p className="text-label uppercase tracking-wide text-op-gray">Registro de Pulso</p>
          <p className="text-heading text-op-white">{currentProject?.name ?? '…'}</p>
        </div>
        <CloseButton className="ml-auto" />
      </header>
      <div className="space-y-4 p-4">
      <VoiceInput
        value={text}
        onChange={handleChange}
        placeholder="O que aconteceu?"
        rows={4}
      />

      {hasInterpretation && (
        <div
          className="rounded-md p-2 text-small"
          style={{
            backgroundColor: 'color-mix(in oklab, #facc15 18%, transparent)',
            color: '#F0F4F8',
          }}
        >
          Termo de interpretação detectado. Não bloqueia o registro.
        </div>
      )}

      {loadingReformulation && !reformulation && (
        <p className="text-small text-op-gray">Facilitador analisando…</p>
      )}

      {reformulation && (
        <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 text-body text-op-white">
          <p className="text-small text-op-gray mb-1">Sugestão de reformulação:</p>
          {reformulation}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-small text-op-gray">Classifique (obrigatório):</p>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-3 cursor-pointer rounded-md border border-op-gray/30 bg-op-navy p-3"
          >
            <input
              type="radio"
              name="classification"
              checked={classification === o.value}
              onChange={() => setClassification(o.value)}
            />
            <span className="text-body text-op-white">{o.label}</span>
          </label>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={!text.trim() || !classification || saving}
        onClick={onSave}
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
      </div>
    </div>
  );
}
