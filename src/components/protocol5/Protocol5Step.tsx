// Protocol5Step — wrapper genérico para etapa do Protocolo 5 Minutos.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FlowHeader } from '@/components/app/FlowHeader';

interface Props {
  step: number;
  total: number;
  title: string;
  helper?: string;
  children: ReactNode;
  onNext: () => void;
  onBack?: () => void;
  canNext: boolean;
  nextLabel?: string;
}

export function Protocol5Step({
  step,
  total,
  title,
  helper,
  children,
  onNext,
  onBack,
  canNext,
  nextLabel = 'Próximo →',
}: Props) {
  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      {/* Era um cabeçalho próprio: "Etapa X de Y" e um X de fechar que só
          aparecia na etapa 1 — nenhum Voltar, e o Voltar do rodapé sumia
          justamente na primeira tela. Agora é o mesmo cabeçalho dos demais
          fluxos. A barra de progresso saiu de dentro do <header> porque
          estava como filha de um flex justify-between: renderizava ao lado
          do texto em vez de abaixo dele. */}
      <FlowHeader
        eyebrow="Protocolo 5 Minutos"
        title={`Etapa ${step} de ${total}`}
        onBack={onBack}
      />
      <div className="h-1 w-full bg-op-navy overflow-hidden">
        <div
          className="h-full bg-op-amber transition-all"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <main className="px-4 py-6 pb-24 max-w-md mx-auto w-full space-y-4">
        <h2 className="text-title text-foreground">{title}</h2>
        {children}
        {helper && (
          <p className="text-small text-muted-foreground">{helper}</p>
        )}
        <div className="flex items-center gap-2 pt-2">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Voltar
            </Button>
          )}
          <Button onClick={onNext} disabled={!canNext} className="flex-[2]">
            {nextLabel}
          </Button>
        </div>
      </main>
    </div>
  );
}
