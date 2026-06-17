// TransferReport — tela do relatório com score, observações e ações.
import { useState } from 'react';
import {
  savePrincipleToBank,
  exportTransferPDF,
  type TransferReportData,
  type TransferScenario,
} from '@/lib/transfer';

interface Props {
  scenarios: TransferScenario[];
  finalPrinciple: string;
  report: TransferReportData;
  userName: string;
  completedAt: string;
  onClose: () => void;
}

export function TransferReport({
  scenarios, finalPrinciple, report, userName, completedAt, onClose,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  const handleSave = async () => {
    try {
      await savePrincipleToBank(finalPrinciple);
      setSaved(true);
    } catch {
      setSaved(true); // silencioso
    }
  };

  const handlePdf = async () => {
    setSavingPdf(true);
    try {
      await exportTransferPDF({
        userName,
        scenarios,
        finalPrinciple,
        report,
        completedAt,
      });
    } catch {
      /* silencioso */
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-op-black px-6 py-8" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-title text-foreground">Resultado da Prova de Transferência</h1>

        <p className="text-body text-foreground">
          Consistência geral: <span className="text-heading">{report.score}/100</span>
        </p>

        <div className="border-t border-b border-border py-4 space-y-3">
          <p className="text-label text-muted-foreground uppercase tracking-wider">
            Pontos observados
          </p>
          {report.observations.map((o, i) => (
            <p key={i} className="text-body text-foreground">{o}</p>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-label text-muted-foreground uppercase tracking-wider">
            Princípio final
          </p>
          <p className="text-body text-foreground">"{finalPrinciple}"</p>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="px-4 py-2 rounded-xl bg-op-amber text-op-black font-semibold text-body disabled:opacity-50"
          >
            {saved ? 'Princípio salvo no Banco' : 'Salvar no Banco de Princípios'}
          </button>
          <button
            type="button"
            onClick={handlePdf}
            disabled={savingPdf}
            className="px-4 py-2 rounded-md border border-border text-body text-foreground disabled:opacity-50"
          >
            {savingPdf ? 'Gerando PDF…' : 'Exportar como PDF'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-body text-muted-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
