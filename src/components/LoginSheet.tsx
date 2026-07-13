// LoginSheet — drawer de login/cadastro por intenção direta do usuário.
// Usado em Configurações quando o guest clica "Criar conta / Fazer login".
// Distinto do RegistrationNudge, que é contextual (primeiro princípio, capítulo, 7 dias).

import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function LoginSheet({ open, onDismiss }: Props) {
  const [email, setEmail] = useState('');
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
    setLoading(true);
    setError(null);
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true },
    });
    if (oauthError || !data?.url) {
      setError('Login com Google indisponível. Use o link por e-mail.');
      setLoading(false);
      return;
    }
    const w = 500, h = 620;
    const left = Math.max(0, (screen.width - w) / 2);
    const top = Math.max(0, (screen.height - h) / 2);
    const popup = window.open(data.url, 'aop-google-oauth', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`);
    if (!popup || popup.closed) {
      // Popup bloqueado — redireciona na mesma aba
      window.location.href = data.url;
      return;
    }
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      window.removeEventListener('message', onMessage);
      setLoading(false);
      if (success) {
        if (!popup.closed) popup.close();
        window.location.href = '/';
      } else {
        if (!popup.closed) popup.close();
        setError('Login com Google não concluído. Tente o link por e-mail.');
      }
    };
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin === window.location.origin && ev.data?.type === 'aop:oauth-success') finish(true);
    };
    window.addEventListener('message', onMessage);
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        supabase.auth.getSession().then(({ data: s }) => finish(!!s.session));
      }
    }, 800);
  }

  function handleClose() {
    setEmail('');
    setSent(false);
    setError(null);
    onDismiss();
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading text-foreground">Entrar ou criar conta</DrawerTitle>
          <p className="text-body text-muted-foreground">
            Seus dados ficam protegidos e sincronizados entre dispositivos.
          </p>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-3">
          {!sent ? (
            <>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-op-amber"
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
              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Cancelar
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-body text-foreground">
                Link enviado para <span className="font-medium">{email}</span>. Abra o
                e-mail neste dispositivo para concluir o login.
              </p>
              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
