// RegistrationNudge — bottom-sheet de convite ao cadastro.
// Três momentos. Sem timer. Sem urgência artificial.
// Sempre [Criar conta] primário + [Depois] secundário.

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export type NudgeMoment = 1 | 2 | 3;

const COPY: Record<NudgeMoment, { title: string; body: string }> = {
  1: {
    title: 'Primeiro princípio extraído',
    body: 'Garanta que ele não se perde se trocar de celular. Crie sua conta — 30 segundos.',
  },
  2: {
    title: 'Primeiro capítulo do Manual pronto',
    body: 'Seu primeiro capítulo do Manual está pronto. Crie conta para backup automático.',
  },
  3: {
    title: '7 dias de uso',
    body: 'Você está usando o app há 7 dias. Crie sua conta para proteger seu histórico.',
  },
};

interface Props {
  open: boolean;
  moment: NudgeMoment;
  onDismiss: () => void;
}

export function RegistrationNudge({ open, moment, onDismiss }: Props) {
  const copy = COPY[moment];
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'intro' | 'email'>('intro');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading text-foreground">{copy.title}</DrawerTitle>
          <p className="text-body text-muted-foreground">{copy.body}</p>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-3">
          {mode === 'intro' && (
            <>
              <Button className="w-full" onClick={() => setMode('email')}>
                Criar conta
              </Button>
              <Button variant="ghost" className="w-full" onClick={onDismiss}>
                Depois
              </Button>
            </>
          )}

          {mode === 'email' && !sent && (
            <>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                className="w-full"
                disabled={!email || loading}
                onClick={sendMagicLink}
              >
                {loading ? 'Enviando...' : 'Enviar link de acesso'}
              </Button>
              <Button variant="outline" className="w-full" onClick={signInGoogle}>
                Entrar com Google
              </Button>
              {error && <p className="text-small text-destructive">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={onDismiss}>
                Depois
              </Button>
            </>
          )}

          {sent && (
            <div className="space-y-3">
              <p className="text-body text-foreground">
                Link enviado para <span className="font-medium">{email}</span>. Abra o
                e-mail neste dispositivo para concluir.
              </p>
              <Button variant="ghost" className="w-full" onClick={onDismiss}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
