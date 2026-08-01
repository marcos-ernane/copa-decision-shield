// LoginSheet — drawer de login/cadastro por intenção direta (PRD-AUTH-01, Etapa 8).
// Aberto em Configurações quando o guest toca "Criar conta / Fazer login".
//
// Agora com e-mail e senha via AuthForm (antes era magic link). Alterna entre
// entrar e criar conta; ao autenticar, a migração de dados locais roda sozinha
// no SIGNED_IN (__root) e o MigrationIndicator confirma.

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function LoginSheet({ open, onDismiss }: Props) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  function handleClose() {
    setMode('signup');
    setConfirmEmail(null);
    onDismiss();
  }

  async function handleSuccess(user: { id: string; email: string }) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      handleClose();
      return;
    }
    setConfirmEmail(user.email);
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
      <DrawerContent className="bg-background max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading text-foreground">
            {confirmEmail
              ? 'Confirme seu e-mail'
              : mode === 'signup'
                ? 'Criar conta'
                : 'Entrar'}
          </DrawerTitle>
          <p className="text-body text-muted-foreground">
            {confirmEmail
              ? 'Falta um passo para a conta ficar ativa.'
              : 'Seus dados ficam protegidos e sincronizados entre dispositivos.'}
          </p>
        </DrawerHeader>

        <div className="px-4 pb-8 overflow-y-auto">
          {confirmEmail ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-4 space-y-2">
                <p className="text-body text-op-white">
                  Enviamos um e-mail para{' '}
                  <span className="font-semibold break-all">{confirmEmail}</span>.
                </p>
                <p className="text-small text-op-gray">
                  Confirme por lá e depois entre com a senha que você criou.
                </p>
              </div>
              <Button variant="ghost" className="w-full h-12" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          ) : (
            <AuthForm
              mode={mode}
              onSuccess={(user) => void handleSuccess(user)}
              onModeChange={setMode}
              secondaryAction={{ label: 'Cancelar', onClick: handleClose }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
