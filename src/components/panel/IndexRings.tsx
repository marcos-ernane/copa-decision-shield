import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { IndexBreakdown } from '@/engines/IndexCalculator';
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
    what: 'Mede quantas IMVs testadas geraram uma Análise Pós-Ação (APA) em até 10 dias.',
    improve: 'Após testar uma IMV, registre o Formato A com o resultado — mesmo que seja negativo. Cada IMV deixada mais de 10 dias sem APA tira -1 ponto (sem limite). Não deixe IMVs paradas: se acumularem, a penalidade pode zerar a Execução. Registre a APA ou arquive o projeto para parar a contagem negativa.',
    ceiling: '100. A penalidade por IMVs paradas não tem teto — muitas IMVs sem APA podem manter o valor em 0 mesmo com muitos registros.',
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
            stroke="#22C5DA"
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
  breakdown?: IndexBreakdown;
  className?: string;
}

// Formata a APA efetiva (pode ser fracionária por causa dos quick_reviews × 0,7).
function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

// Conta por extenso de cada anel, com os números reais do usuário.
// Retorna uma ou mais linhas (execução pode precisar detalhar as aferições).
function ringFormula(key: RingKey, b: IndexBreakdown): { lines: string[]; raw: number } {
  switch (key) {
    case 'clarity':
      if (b.totalPulses < 3) return { lines: [`${b.totalPulses} pulso(s) — mínimo 3 para calcular = 0`], raw: 0 };
      return { lines: [`${b.cleanPulses} fatos limpos ÷ ${b.totalPulses} pulsos × 100 = ${b.rawClarity}`], raw: b.rawClarity };
    case 'execution': {
      if (b.distinctIMVs === 0) return { lines: ['Nenhum IMV testado ainda = 0'], raw: 0 };
      const lines: string[] = [];
      // "Aferições" = APAs completas + revisões rápidas ponderadas (0,7 cada).
      // Só detalha quando há revisões rápidas, que é o que gera a fração.
      const numerador = b.quickReviews > 0
        ? `${fmtNum(b.effectiveA)} aferições (${b.apas} APAs + ${b.quickReviews} revisões rápidas × 0,7)`
        : `${b.apas} APA${b.apas !== 1 ? 's' : ''}`;
      const pen = b.stalePenalty > 0
        ? ` − ${b.stalePenalty} pts (${b.staleIMVs} IMV${b.staleIMVs !== 1 ? 's' : ''} parada${b.staleIMVs !== 1 ? 's' : ''} há +10 dias × 1)`
        : '';
      lines.push(`${numerador} ÷ ${b.distinctIMVs} IMVs × 100${pen} = ${b.rawExecution}`);
      return { lines, raw: b.rawExecution };
    }
    case 'learning': {
      const sum = b.principles * 5 + b.uniqueProjects * 10;
      const cap = sum > 100 ? ' → limitado a 100' : '';
      return { lines: [`${b.principles} princípios × 5 + ${b.uniqueProjects} projetos × 10 = ${sum}${cap}`], raw: b.rawLearning };
    }
  }
}

const LEVEL_LABEL: Record<Props['level'], string> = {
  starting: 'Iniciando',
  developing: 'Desenvolvendo',
  operating: 'Operando',
  solid: 'Sólido',
  precise: 'Preciso',
};

export function IndexRings({ clarity, execution, learning, composite, level, breakdown, className }: Props) {
  const [openRing, setOpenRing] = useState<RingKey | null>(null);
  const info = openRing ? RING_INFO[openRing] : null;

  const values: Record<RingKey, number> = { clarity, execution, learning };
  const calc = openRing && breakdown ? ringFormula(openRing, breakdown) : null;

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
          <div className="text-label text-muted-foreground mt-0.5">
            (Clareza {clarity} + Execução {execution} + Aprendizado {learning}) ÷ 3 = {composite}
          </div>
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
                        className="h-full transition-all"
                        style={{ width: `${values[openRing]}%`, backgroundColor: '#22C5DA' }}
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
                {calc && (
                  <div>
                    <div className="text-label text-muted-foreground uppercase tracking-wide mb-1">Como foi calculado</div>
                    {calc.lines.map((line, i) => (
                      <p key={i} className="text-foreground font-medium">{line}</p>
                    ))}
                    {calc.raw !== values[openRing] && (
                      <p className="text-muted-foreground mt-1">
                        Valor exibido: {values[openRing]}. A suavização evita quedas bruscas no
                        mesmo dia, então o exibido sobe gradualmente até o valor calculado.
                      </p>
                    )}
                  </div>
                )}
                {openRing === 'execution' && breakdown && breakdown.staleIMVs > 0 && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <p className="text-red-400 font-semibold text-small">
                      ⚠ {breakdown.staleIMVs} IMV{breakdown.staleIMVs !== 1 ? 's' : ''} parada{breakdown.staleIMVs !== 1 ? 's' : ''} há mais de 10 dias
                    </p>
                    <p className="text-foreground mt-1">
                      Cada uma tira 1 ponto da Execução, sem limite — por isso o índice pode chegar a 0.
                      Registre a APA (Formato A) de cada IMV testada, ou arquive os projetos que não vai
                      retomar, para parar a contagem negativa.
                    </p>
                  </div>
                )}
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
