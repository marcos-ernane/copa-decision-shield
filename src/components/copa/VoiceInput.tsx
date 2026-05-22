// Campo texto + microfone (Web Speech API). Fallback para digitação sempre.
// Estados: idle → recording → transcribing → done.

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxSeconds?: number;
  rows?: number;
}

type Status = 'idle' | 'recording' | 'transcribing' | 'done';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRecognition = (): any | null => {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

export function VoiceInput({ value, onChange, placeholder, maxSeconds = 15, rows = 3 }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [supported, setSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const r = getRecognition();
    if (!r) setSupported(false);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (recRef.current) {
        try { recRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  function start() {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      setStatus('transcribing');
      const transcript = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(' ');
      onChange(value ? `${value} ${transcript}` : transcript);
      setStatus('done');
    };
    rec.onerror = () => setStatus('idle');
    rec.onend = () => setStatus((s) => (s === 'recording' ? 'idle' : s));
    recRef.current = rec;
    rec.start();
    setStatus('recording');
    timerRef.current = window.setTimeout(() => stop(), maxSeconds * 1000);
  }

  function stop() {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* noop */ }
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none"
      />
      {supported && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={status === 'recording' ? 'destructive' : 'outline'}
            size="sm"
            onClick={status === 'recording' ? stop : start}
          >
            {status === 'recording' ? <MicOff /> : <Mic />}
            {status === 'recording' ? `Gravando (${maxSeconds}s)` : 'Ditar'}
          </Button>
          {status === 'transcribing' && (
            <span className="text-small text-muted-foreground">Transcrevendo…</span>
          )}
        </div>
      )}
    </div>
  );
}
