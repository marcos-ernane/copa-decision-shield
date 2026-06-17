import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';

type RingKey = 'clarity' | 'execution' | 'learning';

interface RingInfo {
  title: string;
  what: string;
  improve: string;
  ceiling: string;
}

const RING_INFO: Record<RingKey, RingInfo> = {
  clarity: {
    title: 'Clareza',
    what: 'Mede quantos dos seus pulsos são fatos limpos — observações sem interpretação misturada.',
    improve: 'Ao registrar um pulso, separe o que você viu do que você concluiu.',
    ceiling: '100. Requer mínimo 3 pulsos para sair do zero.',
  },
  execution: {
    title: 'Execução',
    what: 'Mede quantas IMVs testadas geraram uma Análise Pós-Ação (APA) em até 7 dias.',
    improve: 'Após testar uma IMV, registre o Formato A com o resultado — mesmo que seja negativo. IMVs sem APA depois de 7 dias reduzem o índice em -5 pontos cada.',
    ceiling: '100. Penalidades por IMVs abandonadas podem manter o valor baixo mesmo com muitos registros.',
  },
  learning: {
    title: 'Aprendizado',
    what: 'Mede a acumulação de princípios extraídos e a diversidade de projetos onde você aprendeu. Fórmula: princípios × 5 + projetos distintos × 10.',
    improve: 'Extraia princípios nas suas APAs (Formato A). Princípios em projetos diferentes valem mais.',
    ceiling: '100 (display), sem limite real de acumulação. Se você já atingiu 100, pode ter acumulado bem mais — o excedente não é exibido, mas está no seu histórico de princípios.',
  },
};

interface RingProps {
  value: number;
  label: string;
  caption?: string;
  onClick?: () => void;
}

function Ring({ value, label, caption, onClick }: RingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center focus:outline-none active:opacity-70"
    >
      <div className="relative w-24 h-24">
        <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
          <circle cx={48} cy={48} r={r} stroke="var(--color-surface-2)" strokeWidth={8} fill="none" />
          <circle
            cx={48} cy={48} r={r}
            stroke="var(--color-brand-blue)"
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-heading text-foreground">{v}</div>
      </div>
      <div className="text-small text-foreground mt-1">{label}</div>
      {caption && <div className="text-label text-muted-foreground">{caption}</div>}
    </button>
  );
}

interface Props {
  clarity: number;
  execution: number;
  learning: number;
  composite: number;
  level: 'starting' | 'developing' | 'operating' | 'solid' | 'precise';
  className?: string;
}

const LEVEL_LABEL: Record<Props['level'], string> = {
  starting: 'Iniciando',
  developing: 'Desenvolvendo',
  operating: 'Operando',
  solid: 'Sólido',
  precise: 'Preciso',
};

export function IndexRings({ clarity, execution, learning, composite, level, className }: Props) {
  const [openRing, setOpenRing] = useState<RingKey | null>(null);
  const info = openRing ? RING_INFO[openRing] : null;

  const values: Record<RingKey, number> = { clarity, execution, learning };

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <div className="grid grid-cols-3 gap-2">
          <Ring value={clarity} label="Clareza" onClick={() => setOpenRing('clarity')} />
          <Ring value={execution} label="Execução" onClick={() => setOpenRing('execution')} />
          <Ring value={learning} label="Aprendizado" onClick={() => setOpenRing('learning')} />
        </div>
        <div className="text-center">
          <div className="text-label text-muted-foreground uppercase tracking-wide">Nível composto</div>
          <div className="text-title text-foreground">{LEVEL_LABEL[level]} · {composite}</div>
        </div>
      </div>

      <Sheet open={!!openRing} onOpenChange={(v) => !v && setOpenRing(null)}>
        <SheetContent side="bottom" className="rounded-t-xl pb-8">
          {info && openRing && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{info.title}</SheetTitle>
                <SheetDescription asChild>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">{values[openRing]}</span>
                      <span className="text-muted-foreground text-small">/ 100</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-brand-blue)] transition-all"
                        style={{ width: `${values[openRing]}%` }}
                      />
                    </div>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 text-small">
                <div>
                  <div className="text-label text-muted-foreground uppercase tracking-wide mb-1">O que mede</div>
                  <p className="text-foreground">{info.what}</p>
                </div>
                <div>
                  <div className="text-label text-muted-foreground uppercase tracking-wide mb-1">Como melhorar</div>
                  <p className="text-foreground">{info.improve}</p>
                </div>
                <div>
                  <div className="text-label text-muted-foreground uppercase tracking-wide mb-1">Teto</div>
                  <p className="text-foreground">{info.ceiling}</p>
                </div>
              </div>

              <SheetClose asChild>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl border border-op-cyan bg-transparent py-2.5 text-small text-op-cyan font-semibold hover:opacity-80"
                >
                  Entendi
                </button>
              </SheetClose>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
