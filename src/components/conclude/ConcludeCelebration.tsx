// ConcludeCelebration — tela sóbria. Apenas dados reais.
// REQ-CONCLUDE-01: omite linhas sem dado. Sem motivacional.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { ConcludeResult } from '@/lib/conclude';
import type { Chapter } from '@/types/database';

interface Props {
  result: ConcludeResult;
}

const TIPO_LABEL: Record<string, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};
const CAMADA_LABEL: Record<string, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

function ordinal(n: number): string {
  return `${n}º`;
}

export function ConcludeCelebration({ result }: Props) {
  const navigate = useNavigate();
  const chapter: Chapter = result.chapter;
  const showTransfer = result.concludedCount >= 2;

  const lines: string[] = [];
  lines.push(`Este foi seu ${ordinal(result.concludedCount)} projeto concluído.`);
  if (chapter.valid_principles_count > 0) {
    lines.push(
      `Você extraiu ${chapter.valid_principles_count} princípio${chapter.valid_principles_count > 1 ? 's' : ''} neste projeto.`,
    );
  }
  if (result.totalPrinciples > 0) {
    lines.push(
      `Seu banco tem ${result.totalPrinciples} princípio${result.totalPrinciples > 1 ? 's' : ''} no total.`,
    );
  }
  if (chapter.predominant_scenario_type) {
    lines.push(`Tipo predominante: ${TIPO_LABEL[chapter.predominant_scenario_type] ?? chapter.predominant_scenario_type}.`);
  }
  if (chapter.predominant_layer) {
    lines.push(`Camada trabalhada: ${CAMADA_LABEL[chapter.predominant_layer] ?? chapter.predominant_layer}.`);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-label text-muted-foreground uppercase">Projeto concluído</p>
      </header>
      <div className="space-y-1">
        {lines.map((l, i) => (
          <p key={i} className="text-body text-foreground">{l}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={() => navigate({ to: '/diary/$', params: { _splat: 'manual' } })}>
          Ver meu Manual
        </Button>
        {showTransfer && (
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/panel/transfer' })}
          >
            Fazer Prova de Transferência
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate({ to: '/' })}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
