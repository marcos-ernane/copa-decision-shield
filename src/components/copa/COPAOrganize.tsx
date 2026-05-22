// Tela 2 — Organização. 4 cards calibram a Tela 3.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export type Bottleneck = 'recurso' | 'opcoes' | 'travamento' | 'direcao';

const CARDS: Array<{ key: Bottleneck; title: string; sub: string }> = [
  { key: 'recurso', title: 'Falta de recurso', sub: 'Não tenho o que preciso para avançar' },
  { key: 'opcoes', title: 'Excesso de opções', sub: 'Tenho opções demais e não sei qual atacar' },
  { key: 'travamento', title: 'Travamento na execução', sub: 'Sei o que fazer mas não estou fazendo' },
  { key: 'direcao', title: 'Não sei por onde começar', sub: 'Não tenho clareza suficiente ainda' },
];

interface Props {
  onNext: (b: Bottleneck) => void;
}

export function COPAOrganize({ onNext }: Props) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">O que está bloqueando?</h2>
      <div className="space-y-3">
        {CARDS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onNext(c.key)}
            className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <p className="text-heading text-foreground">{c.title}</p>
            <p className="text-small text-muted-foreground">{c.sub}</p>
          </button>
        ))}
      </div>
      <div className="pt-2">
        <Button
          variant="link"
          className="px-0"
          onClick={() => navigate({ to: '/creative' })}
        >
          Preciso de mais estrutura para escolher → Criatividade Funcional
        </Button>
      </div>
    </div>
  );
}

export const BOTTLENECK_FOCUS: Record<Bottleneck, string> = {
  recurso: 'Recombinação — o que já existe que pode servir',
  opcoes: 'Filtro — o que governa o resultado agora',
  travamento: 'IMV mínimo — menor ação para desbloquear',
  direcao: 'Diagnóstico — observação antes de qualquer ação',
};
