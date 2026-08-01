// PRD-ITEM-08 — Componente de exibição do Mapa de Gargalos 5×4.
// Recebe o BottleneckMap já calculado pelo pai — zero queries aqui.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { BottleneckMap, BottleneckCell, CellIntensity } from '@/lib/bottleneckMap';
import { BOTTLENECK_SCENARIO_TYPES, BOTTLENECK_LAYERS } from '@/lib/bottleneckMap';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  map: BottleneckMap;
}

const SCENARIO_ABBREV: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacion.',
  pressao: 'Pressão',
};

const LAYER_ABBREV: Record<OperationalLayer, string> = {
  operabilidade: 'Operab.',
  conversao: 'Convers.',
  recorrencia: 'Recor.',
  escala: 'Escala',
};

// [REQ-BM-03] Thresholds fixos: none=0, low=1-2, medium=3-5, high=6+
function cellBgColor(intensity: CellIntensity): string {
  switch (intensity) {
    case 'high':   return '#DC2626';         // brand-red
    case 'medium': return '#D97706';         // brand-amber
    case 'low':    return 'rgba(217,119,6,0.38)'; // brand-amber translúcido
    default:       return 'transparent';
  }
}

export function BottleneckMapSection({ map }: Props) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  // [REQ-BM-06] Clique em célula navega para Diário com filtros pré-aplicados.
  function handleCellClick(cell: BottleneckCell) {
    if (cell.intensity === 'none') return;
    navigate({
      to: '/diary',
      search: { scenario_type: cell.scenario_type, layer: cell.layer } as never,
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-heading text-foreground">MAPA DE GARGALOS</h2>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
          aria-label="Entender este indicador"
        >
          ⓘ
        </button>
      </div>

      {!map.has_data ? (
        // [REQ-BM-04] has_data=false quando total_entries < 5
        <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-1">
          <p className="text-small text-op-gray">
            Poucos dados para gerar o mapa.
          </p>
          <p className="text-label text-op-gray/70">
            Registre ao menos 5 ciclos COPA (com IMV definida, tipo de cenário e camada)
            para ativar o Mapa de Gargalos.
            {map.total_entries > 0 && ` (${map.total_entries} de 5 necessários)`}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
          {/* Cabeçalhos das colunas */}
          <div className="grid gap-0.5" style={{ gridTemplateColumns: '72px repeat(4, 1fr)' }}>
            <div />
            {BOTTLENECK_LAYERS.map((layer) => (
              <div
                key={layer}
                className="text-label text-op-gray text-center leading-tight px-0.5 truncate"
              >
                {LAYER_ABBREV[layer]}
              </div>
            ))}
          </div>

          {/* Linhas da matriz */}
          {map.cells.map((row, si) => (
            <div
              key={BOTTLENECK_SCENARIO_TYPES[si]}
              className="grid gap-0.5"
              style={{ gridTemplateColumns: '72px repeat(4, 1fr)' }}
            >
              {/* Label da linha */}
              <div className="text-label text-op-gray flex items-center leading-tight pr-1 truncate">
                {SCENARIO_ABBREV[BOTTLENECK_SCENARIO_TYPES[si]]}
              </div>

              {/* Células */}
              {row.map((cell) => (
                <button
                  key={cell.layer}
                  type="button"
                  onClick={() => handleCellClick(cell)}
                  disabled={cell.intensity === 'none'}
                  className={`h-9 rounded-sm flex items-center justify-center transition-opacity ${
                    cell.intensity === 'none'
                      ? 'border border-op-gray/20 cursor-default'
                      : 'cursor-pointer hover:opacity-75 active:opacity-50'
                  }`}
                  style={
                    cell.intensity !== 'none'
                      ? { backgroundColor: cellBgColor(cell.intensity) }
                      : undefined
                  }
                  aria-label={`${SCENARIO_ABBREV[cell.scenario_type]} × ${LAYER_ABBREV[cell.layer]}: ${cell.count} ciclo${cell.count !== 1 ? 's' : ''}`}
                >
                  {cell.count > 0 && (
                    <span className="text-label font-bold text-white leading-none drop-shadow-sm">
                      {cell.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Legenda + total */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-1">
            {(
              [
                { intensity: 'low' as CellIntensity, label: '1-2' },
                { intensity: 'medium' as CellIntensity, label: '3-5' },
                { intensity: 'high' as CellIntensity, label: '6+' },
              ]
            ).map(({ intensity, label }) => (
              <div key={intensity} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: cellBgColor(intensity) }}
                />
                <span className="text-label text-op-gray">{label}</span>
              </div>
            ))}
            <span className="text-label text-op-gray/70 ml-auto">
              {map.total_entries} ciclo{map.total_entries !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Bottom-sheet explicativo */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Mapa de Gargalos</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mostra onde seus gargalos se concentram cruzando tipo de cenário (linhas) com
                camada operacional (colunas). Cada número é a quantidade de ciclos COPA
                distintos (IMVs trabalhadas) naquela combinação — não a soma de passos do
                método. Células mais intensas indicam maior concentração de gargalos ali.
              </p>
              <p className="text-small text-op-gray mt-1">
                Toque em uma célula colorida para ver os registros correspondentes no Diário.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Intensidade</p>
              <div className="space-y-2.5">
                {(
                  [
                    { intensity: 'low' as CellIntensity, label: 'Baixo', range: '1 a 2 ciclos' },
                    { intensity: 'medium' as CellIntensity, label: 'Médio', range: '3 a 5 ciclos' },
                    { intensity: 'high' as CellIntensity, label: 'Alto', range: '6 ou mais ciclos' },
                  ]
                ).map(({ intensity, label, range }) => (
                  <div key={intensity} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: cellBgColor(intensity) }}
                    />
                    <span className="text-small font-semibold text-op-white">{label}</span>
                    <span className="text-small text-op-gray">{range}</span>
                  </div>
                ))}
              </div>
              <p className="text-label text-op-gray">
                Cada ciclo é contado uma única vez pela sua IMV (Prova), com re-salvamentos
                da mesma ação já deduplicados. Mínimo de 5 ciclos para ativar o mapa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
