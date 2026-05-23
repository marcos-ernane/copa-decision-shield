// PocketProtocol — conteúdo 100% estático. Sem chamadas à API.

import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

const STEPS = [
  { n: 1, t: 'NOMEIE O TIPO', d: 'Fluxo / Processo / Oferta / Relacionamento / Pressão' },
  { n: 2, t: 'LOCALIZE A CAMADA FRACA', d: 'Operabilidade / Conversão / Recorrência / Escala' },
  { n: 3, t: 'ESCREVA 1 FATO LIMPO', d: 'O que você viu — sem concluir' },
  { n: 4, t: 'NOMEIE A FRICÇÃO PRINCIPAL', d: 'O que está travando agora' },
  { n: 5, t: 'DEFINA 1 IMV', d: 'Menor teste: reversível + métrica' },
  { n: 6, t: 'REGISTRE O RESULTADO', d: 'O que aconteceu + o que aprendeu' },
];

const CRITERIA = [
  'Fato limpo — sem interpretação misturada',
  'IMV com métrica definida antes de testar',
  'APA com princípio específico após testar',
];

export function PocketProtocol() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Protocolo de Bolso</h1>
      </header>
      <main className="px-4 py-5 max-w-md mx-auto space-y-6">
        <p className="text-small text-muted-foreground italic">"Quando não sei por onde começar"</p>

        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="text-heading text-foreground tabular-nums w-6 shrink-0">{s.n}.</span>
              <div>
                <p className="text-small text-foreground font-medium">{s.t}</p>
                <p className="text-small text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <hr className="border-border" />

        <section className="space-y-2">
          <p className="text-label uppercase text-muted-foreground">Critério de boa operação</p>
          <ul className="space-y-1.5">
            {CRITERIA.map((c) => (
              <li key={c} className="text-small text-foreground flex gap-2">
                <span className="text-foreground">✓</span><span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
