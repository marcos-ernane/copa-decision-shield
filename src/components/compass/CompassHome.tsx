// CompassHome — 8 subseções. Conteúdo estático. Não exibe métricas do usuário.
// 100% offline. Carrega em < 300ms. (REQ-BUSSOLA-01..05)

import {
  CircleDot,
  FileText,
  Compass,
  ListOrdered,
  Grid2X2,
  Clock,
  RotateCw,
  Play,
  Zap,
} from 'lucide-react';
import { CompassSection } from './CompassSection';
import { PaywallGate } from '@/components/PaywallGate';

const SECTIONS = [
  { to: '/compass/pocket', icon: CircleDot, title: 'Protocolo de Bolso', description: 'O sistema completo em 1 minuto' },
  { to: '/compass/sheet', icon: FileText, title: 'Folha do Operador', description: 'Artefato universal do método' },
  { to: '/compass/guide', icon: Compass, title: 'Guia Diagnóstico', description: 'Nomear tipo → camada → fricção → IMV' },
  { to: '/diary', icon: ListOrdered, title: 'Índice por Sintoma', description: 'Buscar pelo que você sente' },
  { to: '/compass/friction', icon: Grid2X2, title: 'Tabela de Fricções', description: 'Matriz tipo × camada' },
  { to: '/protocol5', icon: Clock, title: 'Protocolo 5 Minutos', description: 'Para dias de baixa energia' },
  { to: '/creative', icon: Zap, title: 'Criatividade Funcional', description: 'Divergir com método, convergir com precisão', paid: true as const },
  { to: '/compass/maintenance', icon: RotateCw, title: 'Rotina de Manutenção', description: 'Semanal · Quinzenal · Mensal' },
  { to: '/compass/simulations', icon: Play, title: 'Simulações do Operador', description: 'Treino com cenários reais' },
];

export function CompassHome() {
  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="px-4 py-4 border-b border-border">
        <h1 className="text-title text-foreground">Bússola do Operador</h1>
        <p className="text-small text-muted-foreground">Conteúdo do método. Sempre disponível.</p>
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
