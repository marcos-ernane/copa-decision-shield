// DeleteAccountDialog — confirmação de exclusão em dois passos.
// PRD-DEL-01 v1.1, Etapa 5.
//
// Substitui o confirm() nativo de SettingsScreen.tsx:348-356, que prometia
// "apaga seus dados de forma irreversível" e apenas fazia logout. Segue o
// padrão de concluded.tsx:141-160 e a Zona Vermelha de EditZoneGuard.
//
// Visitante tem fluxo próprio: passo único, sem senha e sem Edge Function —
// não há conta para excluir, apenas dados locais. [REQ-DEL-25]
//
// [REQ-DEL-21] a [REQ-DEL-25] · [REQ-CONV-03] [REQ-CONV-04] [REQ-CONV-06]

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/auth/fields';
import { exportAllUserData } from '@/lib/exportData';
import { clearAllDeviceData } from '@/lib/deviceCleanup';
import { supabase, SUPABASE_URL } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visitante: sem conta no servidor, só dados locais. */
  isGuest: boolean;
}

/**
 * As mensagens dos passos 3 a 8 afirmam explicitamente que nada foi apagado.
 * Isso é verdadeiro pela ordem da sequência na Edge Function — a destruição só
 * começa no passo 9 — e é a informação que mais importa ao usuário naquele
 * momento. [REQ-DEL-24]
 */
function translateDeleteError(code?: string): string {
  switch (code) {
    case 'invalid_password':
      return 'Senha incorreta.';
    case 'password_required':
      return 'Digite sua senha para confirmar.';
    case 'stripe_cancel_failed':
      return 'Não foi possível cancelar sua assinatura. Tente novamente em instantes ou fale com o suporte.';
    case 'storage_cleanup_failed':
      return 'Não foi possível remover seus arquivos. Nenhum dado foi apagado. Tente novamente.';
    case 'archive_legal_failed':
    case 'archive_subs_failed':
      return 'Falha ao preparar a exclusão. Nenhum dado foi apagado.';
    // Passo 8 (nullificação) — não constava da tabela do PRD, acrescentado na
    // Etapa 2 para que o log não minta sobre onde a operação parou.
    case 'nullify_failed':
      return 'Falha ao preparar a exclusão. Nenhum dado foi apagado.';
    case 'unauthorized':
      return 'Sua sessão expirou. Entre novamente.';
    case 'delete_failed':
      return 'Não foi possível concluir a exclusão. Fale com o suporte.';
    default:
      return 'Não foi possível concluir a exclusão. Fale com o suporte.';
  }
}

export function DeleteAccountDialog({ open, onOpenChange, isGuest }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  function reset() {
    setStep(1);
    setPassword('');
    setError(null);
    setDeleting(false);
    setExporting(false);
  }

  function handleOpenChange(next: boolean) {
    // Durante a exclusão o diálogo não fecha: um clique fora ou Esc no meio da
    // operação deixaria o usuário sem saber em que estado a conta ficou.
    if (deleting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  // Exporta sem fechar o diálogo — o usuário volta ao passo 1 e segue daqui.
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    const result = await exportAllUserData();
    setExporting(false);

    if (!result.success) {
      toast.error('Não foi possível exportar seus dados. Tente novamente.');
      return;
    }
    if (result.errors?.length) {
      toast.warning('Exportação parcial.', {
        description: `Não foi possível ler: ${result.errors.join(', ')}. Confira antes de excluir.`,
        duration: 8000,
      });
      return;
    }
    toast.success('Dados exportados.', {
      description: `${result.tables_exported} tabelas e ${result.images_included} imagens.`,
      duration: 6000,
    });
  }

  // Visitante: nada existe no servidor. Limpeza local direta. [REQ-DEL-25]
  async function handleGuestClear() {
    setDeleting(true);
    await clearAllDeviceData();
    window.location.href = '/';
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setError(null);
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDeleting(false);
        setError(translateDeleteError('unauthorized'));
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }), // apenas a senha
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setDeleting(false);
        setError(translateDeleteError(result?.error));
        return;
      }

      // Só limpa o dispositivo depois da confirmação do servidor. Fazer antes
      // tiraria o acesso local a uma conta que continuaria existindo se a
      // função tivesse falhado. [REQ-DEL-20]
      await clearAllDeviceData();
      window.location.href = '/';
    } catch {
      setDeleting(false);
      setError('Falha de conexão. Tente novamente.');
    }
  }

  // -------------------------------------------------------------------------
  // Visitante — passo único
  // -------------------------------------------------------------------------
  if (isGuest) {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar dados deste dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros salvos neste aparelho serão apagados. Como você
              não tem conta, eles não existem em nenhum outro lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleGuestClear();
              }}
            >
              {deleting ? 'Apagando…' : 'Apagar dados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // -------------------------------------------------------------------------
  // Conta — dois passos
  // -------------------------------------------------------------------------
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
              {/* asChild: a lista precisa de <div>, não do <p> padrão do Radix,
                  para manter o HTML válido sem perder o aria-describedby. */}
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-left">
                  <p>Serão apagados de forma permanente:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Todos os seus projetos e registros</li>
                    <li>Princípios extraídos e capítulos do Manual</li>
                    <li>Imagens de cenário</li>
                    <li>Histórico do Índice do Operador</li>
                  </ul>
                  <p>
                    Se houver assinatura ativa, ela será cancelada antes da
                    exclusão.
                  </p>
                  <p className="text-op-white font-semibold">
                    Esta ação é irreversível e não pode ser desfeita.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Button
              variant="outline"
              className="w-full h-12"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {exporting ? 'Exportando…' : 'Exportar meus dados antes'}
            </Button>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {/* Button comum: AlertDialogAction fecharia o diálogo, e aqui só
                  avançamos para o passo 2. */}
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirme sua senha</AlertDialogTitle>
              <AlertDialogDescription>
                Digite a senha da sua conta para confirmar a exclusão.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <PasswordField
              label="Senha"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              placeholder="Sua senha"
              autoComplete="current-password"
            />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting || password.length === 0}
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteAccount();
                }}
              >
                {deleting ? 'Excluindo conta…' : 'Excluir permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
