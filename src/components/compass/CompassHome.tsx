// CompassHome — 8 subseções. Conteúdo estático. Não exibe métricas do usuário.
// 100% offline. Carrega em < 300ms. (REQ-BUSSOLA-01..05)

import {
  CircleDot,
  FileText,
  Compass,
  ListOrdered,
  Grid2X2,
  Clock,
  Filter,
  RotateCw,
  Play,
  Zap,
  LayoutGrid,
  Shuffle,
  Brain,
} from 'lucide-react';
import { CompassSection } from './CompassSection';
import { PaywallGate } from '@/components/PaywallGate';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';

const SECTIONS = [
  { to: '/compass/pocket', icon: CircleDot, title: 'Protocolo de Bolso', description: 'O sistema completo em 1 minuto' },
  { to: '/compass/sheet', icon: FileText, title: 'Folha do Operador', description: 'Artefato universal do método' },
  { to: '/compass/guide', icon: Compass, title: 'Guia Diagnóstico', description: 'Nomear tipo → camada → fricção → IMV' },
  { to: '/diary', icon: ListOrdered, title: 'Índice por Sintoma', description: 'Buscar pelo que você sente' },
  { to: '/compass/friction', icon: Grid2X2, title: 'Tabela de Fricções', description: 'Matriz tipo × camada' },
  { to: '/compass/inventory4d', icon: LayoutGrid, title: 'Inventário 4D', description: 'Leitura de cenário com restrição — Densidade, Direção, Demora, Desejo' },
  { to: '/compass/recombination', icon: Shuffle, title: 'Recombinação', description: 'Criar novas IMVs a partir do que você já tem' },
  { to: '/lever-filter', icon: Filter, title: 'Filtro de Alavanca', description: 'Avalie ideias com as 5 perguntas antes de criar uma IMV' },
  { to: '/protocol5', icon: Clock, title: 'Protocolo 5 Minutos', description: 'Para dias de baixa energia' },
  { to: '/creative', icon: Zap, title: 'Criatividade Funcional', description: 'Divergir com método, convergir com precisão', paid: true as const },
  { to: '/compass/maintenance', icon: RotateCw, title: 'Rotina de Manutenção', description: 'Semanal · Quinzenal · Mensal' },
  { to: '/compass/simulations', icon: Play, title: 'Simulações do Operador', description: 'Treino com cenários reais' },
  { to: '/clarity', icon: Brain, title: 'Clareza Operacional', description: 'Organize seu diagnóstico em 4 movimentos — requer ciclo COPA aberto' },
];

export function CompassHome() {
  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="sticky top-0 z-10 border-b border-border" style={{ backgroundColor: '#070C12' }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <BackButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-heading font-semibold text-foreground">Bússola do Operador</h1>
            <p className="text-label text-muted-foreground">Conteúdo do método. Sempre disponível.</p>
          </div>
          <CloseButton className="ml-auto shrink-0" />
        </div>
      </header>
      <main className="px-4 py-4 max-w-md mx-auto space-y-2">
        {SECTIONS.map((s) => {
          const item = <CompassSection key={s.to} to={s.to} icon={s.icon} title={s.title} description={s.description} />;
          if ('paid' in s && s.paid) {
            return (
              <PaywallGate key={s.to} feature="creative_flow" reason="Criatividade Funcional">
                {item}
              </PaywallGate>
            );
          }
          return item;
        })}
      </main>
    </div>
  );
}
