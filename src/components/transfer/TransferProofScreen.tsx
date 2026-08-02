// TransferProofScreen — orquestra todo o fluxo da Prova de Transferência.
// REQ-TRANSFER-01..05.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FlowHeader } from '@/components/app/FlowHeader';
import { PaywallGate } from '@/components/PaywallGate';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import {
  getInProgressProof,
  startTransferProof,
  saveScenarios,
  completeProof,
  generateLocalReport,
  parseRemoteReport,
  type TransferScenario,
  type TransferReportData,
} from '@/lib/transfer';
import { TransferEntry } from './TransferEntry';
import { TransferScenarioContext } from './TransferScenarioContext';
import { TransferScenarioLines } from './TransferScenarioLines';
import { TransferPrincipalExtraction } from './TransferPrincipalExtraction';
import { TransferReport } from './TransferReport';

type Step =
  | 'loading'
  | 'entry'
  | 'context'
  | 'lines'
  | 'principle'
  | 'analyzing'
  | 'report';

const EMPTY_SCENARIO: TransferScenario = {
  context: '',
  type: null,
  layer: null,
  fact: '',
  friction: '',
  imv: '',
  metric: '',
};

export function TransferProofScreen() {
  return (
    <PaywallGate feature="transfer_proof">
      <TransferProofInner />
    </PaywallGate>
  );
}

function TransferProofInner() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [proofId, setProofId] = useState<string | null>(null);
  const [hasInProgress, setHasInProgress] = useState(false);
  const [scenarios, setScenarios] = useState<TransferScenario[]>([
    { ...EMPTY_SCENARIO }, { ...EMPTY_SCENARIO }, { ...EMPTY_SCENARIO },
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'context' | 'lines'>('context');
  const [finalPrinciple, setFinalPrinciple] = useState('');
  const [report, setReport] = useState<TransferReportData | null>(null);
  const [completedAt, setCompletedAt] = useState<string>('');
  const [userName, setUserName] = useState('Operador');

  useEffect(() => {
    (async () => {
      const profile = GuestStorage.getProfile();
      if (profile?.display_name) setUserName(profile.display_name);
      const existing = await getInProgressProof();
      if (existing) {
        setHasInProgress(true);
        setProofId(existing.id);
        const arr = Array.isArray(existing.scenarios) ? (existing.scenarios as TransferScenario[]) : [];
        const padded = [
          arr[0] ?? { ...EMPTY_SCENARIO },
          arr[1] ?? { ...EMPTY_SCENARIO },
          arr[2] ?? { ...EMPTY_SCENARIO },
        ];
        setScenarios(padded);
      }
      setStep('entry');
    })();
  }, []);

  const beginNew = async () => {
    const id = await startTransferProof();
    setProofId(id);
    setScenarios([{ ...EMPTY_SCENARIO }, { ...EMPTY_SCENARIO }, { ...EMPTY_SCENARIO }]);
    setCurrentIdx(0);
    setPhase('context');
    setStep('context');
  };

  const resume = () => {
    // Encontra o primeiro cenário incompleto.
    let idx = 0;
    for (let i = 0; i < 3; i++) {
      const s = scenarios[i];
      if (!s.context || !s.fact || !s.friction || !s.imv || !s.metric || !s.type || !s.layer) {
        idx = i;
        break;
      }
      if (i === 2) idx = 3;
    }
    if (idx >= 3) {
      setStep('principle');
      return;
    }
    setCurrentIdx(idx);
    setPhase(scenarios[idx].context ? 'lines' : 'context');
    setStep(scenarios[idx].context ? 'lines' : 'context');
  };

  const onContextContinue = (ctx: string) => {
    const next = [...scenarios];
    next[currentIdx] = { ...next[currentIdx], context: ctx };
    setScenarios(next);
    setPhase('lines');
    setStep('lines');
  };

  const onLinesContinue = async (s: TransferScenario) => {
    const next = [...scenarios];
    next[currentIdx] = { ...s, context: scenarios[currentIdx].context };
    setScenarios(next);
    if (proofId) await saveScenarios(proofId, next);
    if (currentIdx < 2) {
      setCurrentIdx(currentIdx + 1);
      setPhase('context');
      setStep('context');
    } else {
      setStep('principle');
    }
  };

  const onPrincipleConclude = async (principle: string) => {
    setFinalPrinciple(principle);
    setStep('analyzing');

    // Fallback local pré-calculado.
    const local = generateLocalReport(scenarios, principle);

    // Chamada à Edge Function com timeout 8s próprio.
    let final: TransferReportData = local;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const remotePromise = supabase.functions.invoke('assistant-facilitator', {
        body: {
          trigger: 'TRANSFER_CONSISTENCY_REPORT',
          context: {
            scenarios: scenarios.map((s) => ({
              context: s.context,
              type: s.type,
              layer: s.layer,
              fact: s.fact,
              friction: s.friction,
              imv: s.imv,
              metric: s.metric,
            })),
            final_principle: principle,
          },
        },
      });
      const winner = await Promise.race<{ remote: true; res: Awaited<typeof remotePromise> } | { remote: false }>([
        remotePromise.then((res) => ({ remote: true as const, res })),
        new Promise<{ remote: false }>((resolve) => {
          controller.signal.addEventListener('abort', () => resolve({ remote: false }));
          setTimeout(() => resolve({ remote: false }), 8000);
        }),
      ]);
      clearTimeout(timer);
      if (winner.remote && !winner.res.error) {
        const suggestion = (winner.res.data as { suggestion?: string | null } | null)?.suggestion ?? null;
        final = parseRemoteReport(suggestion, local);
      }
    } catch {
      final = local;
    }

    const at = new Date().toISOString();
    setCompletedAt(at);
    setReport(final);
    if (proofId) {
      try {
        await completeProof(proofId, scenarios, principle, final);
      } catch {
        /* silencioso */
      }
    }
    setStep('report');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-op-black flex items-center justify-center" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
        <p className="text-small text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  /**
   * Voltar percorre as etapas e não o histórico: o fluxo inteiro é uma rota só.
   * Cenário 2 e 3 voltam ao bloco de linhas do cenário anterior — é lá que
   * estava o trabalho, e refazer o contexto seria o passo errado.
   *
   * 'analyzing' não tem Voltar (chamada em curso) e 'report' também não
   * (a prova já foi gravada).
   */
  function backTarget(): (() => void) | undefined {
    switch (step) {
      case 'entry':
        return undefined; // primeira tela — histórico do navegador
      case 'context':
        if (currentIdx === 0) return () => setStep('entry');
        return () => {
          setCurrentIdx(currentIdx - 1);
          setPhase('lines');
          setStep('lines');
        };
      case 'lines':
        return () => { setPhase('context'); setStep('context'); };
      case 'principle':
        return () => {
          setCurrentIdx(2);
          setPhase('lines');
          setStep('lines');
        };
      default:
        return undefined;
    }
  }

  const eyebrow = 'Prova de Transferência';
  const titulo =
    step === 'entry' ? 'Início'
    : step === 'principle' ? 'Princípio final'
    : step === 'analyzing' ? 'Analisando'
    : step === 'report' ? 'Relatório'
    : `Cenário ${currentIdx + 1} de 3`;

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <FlowHeader
        eyebrow={eyebrow}
        title={titulo}
        onBack={backTarget()}
        hideBack={step === 'analyzing' || step === 'report'}
      />

      {step === 'entry' && (
        <TransferEntry
          inProgress={hasInProgress}
          onStart={beginNew}
          onContinue={resume}
          onLater={() => navigate({ to: '/panel' })}
        />
      )}

      {step === 'context' && (
        <TransferScenarioContext
          initial={scenarios[currentIdx].context}
          onContinue={onContextContinue}
        />
      )}

      {step === 'lines' && (
        <TransferScenarioLines
          scenarioIndex={currentIdx}
          context={scenarios[currentIdx].context}
          initial={scenarios[currentIdx]}
          isLast={currentIdx === 2}
          onContinue={onLinesContinue}
        />
      )}

      {step === 'principle' && (
        <TransferPrincipalExtraction
          initial={finalPrinciple}
          onConclude={onPrincipleConclude}
        />
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <p className="text-body text-foreground">Analisando os 3 cenários…</p>
          <div className="mt-4 h-1 w-32 bg-border overflow-hidden rounded-full">
            <div className="h-full w-1/2 bg-primary animate-pulse" />
          </div>
        </div>
      )}

      {step === 'report' && report && (
        <TransferReport
          scenarios={scenarios}
          finalPrinciple={finalPrinciple}
          report={report}
          userName={userName}
          completedAt={completedAt}
          onClose={() => navigate({ to: '/panel' })}
        />
      )}
    </div>
  );
}
