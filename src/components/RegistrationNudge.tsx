// RegistrationNudge — bottom-sheet de convite ao cadastro (PRD-AUTH-01, Etapa 8).
// Três momentos. Sem timer. Sem urgência artificial.
//
// Agora com e-mail e senha via AuthForm (antes era magic link). O usuário guest
// pode ter dados locais: ao criar conta, a migração roda sozinha no SIGNED_IN
// (__root) e o MigrationIndicator confirma. Por isso a cópia tranquiliza que
// nada se perde.

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export type NudgeMoment = 1 | 2 | 3;

const COPY: Record<NudgeMoment, { title: string; body: string }> = {
  1: {
    title: 'Primeiro princípio extraído',
    body: 'Garanta que ele não se perde se trocar de celular. Crie sua conta — seus registros são sincronizados automaticamente.',
  },
  2: {
    title: 'Primeiro capítulo do Manual pronto',
    body: 'Seu primeiro capítulo do Manual está pronto. Crie conta para backup automático — nada do que você já registrou é perdido.',
  },
  3: {
    title: '7 dias de uso',
    body: 'Você está usando o app há 7 dias. Crie sua conta para proteger seu histórico — ele é migrado automaticamente.',
  },
};

interface Props {
  open: boolean;
  moment: NudgeMoment;
  onDismiss: () => void;
}

export function RegistrationNudge({ open, moment, onDismiss }: Props) {
  const copy = COPY[moment];
  // 'intro' preserva a mensagem contextual do momento antes de pedir os dados.
  const [step, setStep] = useState<'intro' | 'form'>('intro');
  const [mode, setMode] = useState<AuthMode>('signup');
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  function reset() {
    setStep('intro');
    setMode('signup');
    setConfirmEmail(null);
  }

  function handleDismiss() {
    reset();
    onDismiss();
  }

  async function handleSuccess(user: { id: string; email: string }) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // __root dispara migração de guest + flush do aceite no SIGNED_IN;
      // o MigrationIndicator mostra o progresso. Aqui só fechamos.
      handleDismiss();
      return;
    }
    // Confirmação de e-mail ligada: sem sessão ainda.
    setConfirmEmail(user.email);
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DrawerContent className="bg-background max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading text-foreground">
            {confirmEmail ? 'Confirme seu e-mail' : copy.title}
          </DrawerTitle>
          <p className="text-body text-muted-foreground">
            {confirmEmail
              ? 'Falta um passo para a conta ficar ativa.'
              : copy.body}
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
                  Confirme por lá e depois entre com a senha que você criou. Seus
                  registros continuam salvos neste dispositivo até a sincronização.
                </p>
              </div>
              <Button variant="ghost" className="w-full h-12" onClick={handleDismiss}>
                Fechar
              </Button>
            </div>
          ) : step === 'intro' ? (
            <div className="space-y-3">
              <Button className="w-full h-12" onClick={() => setStep('form')}>
                Criar conta
              </Button>
              <Button variant="ghost" className="w-full h-12" onClick={handleDismiss}>
                Depois
              </Button>
            </div>
          ) : (
            <AuthForm
              mode={mode}
              onSuccess={(user) => void handleSuccess(user)}
              onModeChange={setMode}
              secondaryAction={{ label: 'Depois', onClick: handleDismiss }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
