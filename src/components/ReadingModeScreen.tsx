// ReadingModeScreen — conteúdo estático v3.0 do Método COPA + princípios-base.
// Funciona 100% offline. Sem IA, sem prompts de ação, sem sugestões.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import { setReadingMode } from '@/hooks/useReadingMode';
import type { Principle } from '@/types/database';

const COPA_PHASES = [
  {
    letter: 'C',
    title: 'Captura',
    body: 'Separar fatos de interpretações.\nO que você viu, não o que concluiu.',
  },
  {
    letter: 'O',
    title: 'Organização',
    body: 'Mapear recursos, fricções e o gargalo\nque mais governa o resultado.',
  },
  {
    letter: 'P',
    title: 'Prova (IMV)',
    body: 'Definir o menor teste possível:\nreversível, barato, específico\ne mensurável.',
  },
  {
    letter: 'A',
    title: 'Aferição',
    body: 'Registrar o que aconteceu e extrair\no princípio que ficou.',
  },
];

const BASE_PRINCIPLES = [
  'Fato é o que você viu.\nInterpretação é o que você concluiu.\nSepare sempre.',
  'O gargalo que mais governa o resultado\nraramente é o mais visível.',
  'IMV: reversível, barato, específico,\nmensurável. Os quatro ou não é IMV.',
  'A APA não é avaliação de desempenho.\nÉ extração de princípio.',
  'Tipo de cenário determina o que observar.\nCamada determina onde intervir.',
  'Pressão de percepção não é urgência real.\nNomeie a diferença antes de agir.',
  'O custo oculto existe mesmo quando\nvocê não o nomeia.',
];

async function loadRecentPrinciples(): Promise<Principle[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data } = await supabase
      .from('principles')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(3);
    return (data ?? []) as Principle[];
  }
  const all = GuestStorage.getPrinciples().filter((p) => !p.is_archived);
  return all
    .slice()
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 3);
}

export function ReadingModeScreen() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<Principle[]>([]);

  useEffect(() => {
    void loadRecentPrinciples().then(setRecent);
  }, []);

  async function exit() {
    await setReadingMode(false);
    navigate({ to: '/' });
  }

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <header>
          <p className="text-label uppercase tracking-wide text-muted-foreground">
            Modo Leitura
          </p>
          <h1 className="text-display mt-2">Método COPA</h1>
        </header>

        <section className="space-y-6">
          {COPA_PHASES.map((p, i) => (
            <div key={p.letter} className="space-y-2">
              <h2 className="text-heading">
                <span className="text-muted-foreground mr-2">{p.letter} —</span>
                {p.title}
              </h2>
              <p className="text-body text-muted-foreground whitespace-pre-line">
                {p.body}
              </p>
              {i < COPA_PHASES.length - 1 && (
                <div className="pt-4 border-b border-border/50" />
              )}
            </div>
          ))}
        </section>

        <Divider />

        <section className="space-y-6">
          <h2 className="text-title">Princípios-base do Operador</h2>
          <p className="text-label uppercase tracking-wide text-muted-foreground">
            v3.0
          </p>
          <div className="space-y-5">
            {BASE_PRINCIPLES.map((text, i) => (
              <p
                key={i}
                className="text-body text-foreground whitespace-pre-line border-l-2 border-border pl-4"
              >
                {text}
              </p>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <>
            <Divider />
            <section className="space-y-4">
              <h2 className="text-label uppercase tracking-wide text-muted-foreground">
                Seus princípios mais recentes
              </h2>
              <div className="space-y-3">
                {recent.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <p className="text-body whitespace-pre-line">{p.content}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/diary"
                className="inline-block text-small text-muted-foreground hover:text-foreground"
              >
                Ver banco completo →
              </Link>
            </section>
          </>
        )}

        <Divider />

        <footer className="space-y-3 pb-8">
          <button
            type="button"
            onClick={() => void exit()}
            className="w-full rounded-md border border-border bg-card py-3 text-body hover:bg-accent"
          >
            Sair do Modo Leitura
          </button>
          <Link
            to="/compass"
            className="block w-full text-center rounded-md py-3 text-body text-muted-foreground hover:text-foreground"
          >
            Ir para a Bússola →
          </Link>
        </footer>
      </main>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}
