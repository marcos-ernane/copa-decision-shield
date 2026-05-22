// CorrectiveRegister — vinculado a entry original. Original nunca é alterado.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import { saveCorrective } from '@/lib/register';
import type { Entry } from '@/types/database';

export function CorrectiveRegister() {
  const { entryId } = useParams({ from: '/register/corrective/$entryId' });
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [correct, setCorrect] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const found = GuestStorage.getEntries().find((e) => e.id === entryId) ?? null;
        setEntry(found);
        return;
      }
      const { data } = await supabase.from('entries').select('*').eq('id', entryId).maybeSingle();
      setEntry((data as Entry | null) ?? null);
    })();
  }, [entryId]);

  if (!entry) {
    return <div className="p-4 text-small text-muted-foreground">Carregando registro original…</div>;
  }

  async function save() {
    if (!entry) return;
    setSaving(true);
    await saveCorrective(entry.id, entry.project_id, {
      correct_version: correct.trim(),
      why_previous_was_imprecise: reason.trim(),
    });
    setSaving(false);
    navigate({ to: '/project/$id/dashboard', params: { id: entry.project_id } });
  }

  const date = new Date(entry.created_at).toLocaleString('pt-BR');

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">Registro corretivo</h2>
      <p className="text-small text-muted-foreground">
        Vinculado ao registro de <strong>{date}</strong>. O registro original não é alterado.
      </p>

      <div>
        <p className="text-small text-muted-foreground mb-1">O que de fato aconteceu</p>
        <VoiceInput value={correct} onChange={setCorrect} placeholder="Versão correta." rows={4} />
      </div>

      <div>
        <p className="text-small text-muted-foreground mb-1">
          Por que a versão anterior estava imprecisa (opcional)
        </p>
        <VoiceInput value={reason} onChange={setReason} placeholder="" rows={3} />
      </div>

      <Button className="w-full" disabled={!correct.trim() || saving} onClick={save}>
        {saving ? 'Salvando…' : 'Salvar correção'}
      </Button>
    </div>
  );
}
