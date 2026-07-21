// NewProjectScreen — criação de projeto com state='new' (REQ-PROJ-01).

import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { GuestStorage } from '@/lib/guestStorage';
import { CircleHelp, X } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { createProject } from '@/lib/projects';
import type { ScenarioType, OperationalLayer } from '@/types/app';

export const Route = createFileRoute('/project/new')({
  validateSearch: (s: Record<string, unknown>) => ({
    bottleneck: typeof s.bottleneck === 'string' ? s.bottleneck : undefined,
    bottleneckEntryId: typeof s.bottleneckEntryId === 'string' ? s.bottleneckEntryId : undefined,
  }),
  component: NewProject,
});

const SCENARIOS: { value: ScenarioType; label: string; description: string }[] = [
  { value: 'fluxo',          label: 'Fluxo',          description: 'Movimento de atenção ou demanda' },
  { value: 'processo',       label: 'Processo',        description: 'Etapas em sequência' },
  { value: 'oferta',         label: 'Oferta',          description: 'Produto, serviço ou decisão' },
  { value: 'relacionamento', label: 'Relacionamento',  description: 'Interação entre pessoas' },
  { value: 'pressao',        label: 'Pressão',         description: 'Urgência ou risco ativo' },
];

const LAYERS: { value: OperationalLayer; label: string; description: string }[] = [
  { value: 'operabilidade', label: 'Operabilidade', description: 'O básico não funciona' },
  { value: 'conversao',     label: 'Conversão',     description: 'Não vira resultado' },
  { value: 'recorrencia',   label: 'Recorrência',   description: 'Não se repete' },
  { value: 'escala',        label: 'Escala',        description: 'Não cresce' },
];

const NAME_HELP = {
  title: 'Nome do Projeto',
  paragraphs: [
    'O nome identifica o projeto em todas as telas do app — no dashboard, no histórico, no Diário e no Manual do Operador. Escolha um nome que descreva claramente o que você está trabalhando, não o problema que está tendo.',
    'Bons exemplos: "Lançamento do curso", "Equipe de vendas", "Fluxo de clientes na loja".',
    'Evite nomes vagos como "Minha empresa" ou "Projeto 1" — eles não ajudam a identificar o contexto quando você tiver vários projetos simultâneos.',
    'O nome pode ser editado depois no painel do projeto, mas quanto mais preciso for desde o início, mais claro será o histórico gerado.',
  ],
};

const NORTH_HELP = {
  title: 'Norte / Objetivo',
  paragraphs: [
    'O Norte é a frase que descreve como a situação estará quando o projeto tiver cumprido seu propósito. Ele funciona como bússola para todas as decisões e intervenções que virão.',
    'Complete mentalmente a frase: "Vai estar melhor quando..." e escreva o que você enxerga.',
    'Exemplos concretos:',
    '"...a taxa de conversão de vendas passar de 3% para 6% em 60 dias."',
    '"...a equipe conseguir operar a rotina semanal sem depender da minha presença."',
    '"...a caixa d\'água parar de vazar e o reparo for comprovado por 30 dias sem reincidência."',
    'Evite objetivos genéricos como "melhorar os resultados" — sem referência mensurável, não há como saber quando o Norte foi alcançado.',
    'O Norte aparece no dashboard, no Manual do Operador e no texto exportado da Clareza Operacional.',
  ],
};

const SCENARIO_HELP = {
  title: 'Tipo de Cenário',
  paragraphs: [
    'O tipo de cenário descreve a natureza central do que você está enfrentando e orienta como o método deve ser aplicado. Escolher o tipo certo direciona a análise, as intervenções e o aprendizado para o que realmente importa no seu projeto.',
    'Fluxo: quando o problema envolve movimento de atenção, demanda ou volume — algo que deveria estar acontecendo mas não está fluindo.',
    'Processo: quando o problema está em etapas sequenciais — algo trava, atrasa ou falha em algum ponto da operação.',
    'Oferta: quando o problema está no produto, serviço ou decisão em si — o que você entrega não está sendo percebido, escolhido ou valorizado.',
    'Relacionamento: quando o problema envolve interação entre pessoas — comunicação, confiança, alinhamento ou colaboração.',
    'Pressão: quando há urgência real ou risco ativo — algo que exige resposta antes de agravar.',
    'Pergunte-se: Qual é a natureza central do que está impedindo o avanço neste projeto?',
  ],
};

const LAYER_HELP = {
  title: 'Camada Operacional',
  paragraphs: [
    'A camada operacional indica onde está o principal obstáculo que limita o desempenho do projeto agora. Identificar a camada correta evita agir no lugar errado e desperdiçar recursos em intervenções que não atacam a causa real.',
    'Operabilidade: o básico não funciona — há falhas, erros, gargalos ou ausência de estrutura mínima para operar.',
    'Conversão: o movimento existe mas não vira resultado — há demanda, esforço ou oportunidade, mas o sistema não fecha.',
    'Recorrência: o resultado acontece mas não se repete — falta consistência, previsibilidade ou hábito instalado.',
    'Escala: o resultado é consistente mas não acompanha o crescimento da demanda — o sistema não sustenta o volume maior.',
    'Pergunte-se: Se eu resolver apenas um obstáculo agora, em qual dessas camadas ele está?',
  ],
};

type HelpKey = 'name' | 'north' | 'scenario' | 'layer' | null;

function NewProject() {
  const navigate = useNavigate();
  const { bottleneck, bottleneckEntryId } = useSearch({ from: '/project/new' });
  const [name, setName] = useState(bottleneck ?? '');
  const [north, setNorth] = useState('');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [notifyAuto, setNotifyAuto] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpKey, setHelpKey] = useState<HelpKey>(null);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 80;
  const northOk = north.trim().length >= 10 && north.trim().length <= 300;
  const canSubmit = nameOk && northOk && scenario !== null && layer !== null && !submitting;

  const helpContent =
    helpKey === 'name'     ? NAME_HELP :
    helpKey === 'north'    ? NORTH_HELP :
    helpKey === 'scenario' ? SCENARIO_HELP :
    helpKey === 'layer'    ? LAYER_HELP : null;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name,
        north,
        scenario_type: scenario,
        current_layer: layer,
      });
      void notifyAuto;
      if (bottleneckEntryId) {
        GuestStorage.dismissBottleneck(bottleneckEntryId);
      }
      navigate({ to: '/project/$id/dashboard', params: { id: project.id } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Bottom sheet de ajuda */}
      {helpContent && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setHelpKey(null)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">{helpContent.title}</h3>
              <button
                type="button"
                onClick={() => setHelpKey(null)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {helpContent.paragraphs.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-op-black flex flex-col" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 bg-op-navy">
          <BackButton />
          <h1 className="text-heading text-op-white">Novo projeto</h1>
          <CloseButton className="ml-auto" />
        </header>

        <main className="flex-1 px-6 py-6 max-w-md mx-auto w-full space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label text-op-gray uppercase">Nome do projeto</label>
              <button
                type="button"
                onClick={() => setHelpKey('name')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nomeie o que está trabalhando"
              maxLength={80}
              className="w-full rounded-md border border-op-gray/20 bg-op-navy px-3 py-2 text-body text-op-white placeholder:text-op-gray focus:outline-none focus:ring-2 focus:ring-op-amber"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label text-op-gray uppercase">
                Vai estar melhor quando…
              </label>
              <button
                type="button"
                onClick={() => setHelpKey('north')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <VoiceInput value={north} onChange={setNorth} rows={4} />
            <p className="text-label text-op-gray">{north.length}/300</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label text-op-gray uppercase">
                Tipo de cenário <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setHelpKey('scenario')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-label text-op-gray">Qual é a natureza do que você está enfrentando?</p>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScenario(s.value)}
                  className={`rounded-full border px-3 py-1 text-small transition-colors ${
                    scenario === s.value
                      ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                      : 'border-op-gray/20 bg-op-navy text-op-white hover:bg-op-navy-elevated'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {scenario && (
              <p className="text-label text-op-gray">
                {SCENARIOS.find((s) => s.value === scenario)?.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label text-op-gray uppercase">
                Camada operacional <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setHelpKey('layer')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-label text-op-gray">Onde está o principal obstáculo agora?</p>
            <div className="flex flex-wrap gap-2">
              {LAYERS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLayer(l.value)}
                  className={`rounded-full border px-3 py-1 text-small transition-colors ${
                    layer === l.value
                      ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                      : 'border-op-gray/20 bg-op-navy text-op-white hover:bg-op-navy-elevated'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {layer && (
              <p className="text-label text-op-gray">
                {LAYERS.find((l) => l.value === layer)?.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-op-gray/20 bg-op-navy px-3 py-3">
            <div>
              <p className="text-small text-op-white">Notificação</p>
              <p className="text-label text-op-gray">
                {notifyAuto ? 'Deixa o app escolher' : 'Sem notificação'}
              </p>
            </div>
            <button
              onClick={() => setNotifyAuto((v) => !v)}
              className={`h-6 w-11 rounded-full transition-colors ${
                notifyAuto ? 'bg-op-amber' : 'bg-op-gray/30'
              } relative`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-op-white transition-transform ${
                  notifyAuto ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {(!scenario || !layer) && nameOk && northOk && (
            <p className="text-small text-op-gray text-center">
              Selecione o tipo de cenário e a camada operacional para criar o projeto.
            </p>
          )}

          <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
            CRIAR PROJETO
          </Button>
        </main>
      </div>
    </>
  );
}
