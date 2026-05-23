// TransferEntry — tela de entrada com detecção de prova em andamento.


interface Props {
  inProgress: boolean;
  onStart: () => void;
  onContinue: () => void;
  onLater: () => void;
}

export function TransferEntry({ inProgress, onStart, onContinue, onLater }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-display text-foreground">Prova de Transferência</h1>
        <p className="text-body text-foreground">
          Você vai aplicar o método em 3 cenários completamente diferentes.
        </p>
        <p className="text-body text-foreground">
          Para cada cenário: 6 linhas.<br />
          Não precisa ser perfeito.<br />
          Precisa ser honesto.
        </p>
        <p className="text-small text-muted-foreground">Tempo estimado: 15-20 minutos.</p>
        <div className="flex gap-3 pt-4">
          {inProgress ? (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-body"
            >
              Continuar prova
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-body"
            >
              Começar
            </button>
          )}
          <button
            type="button"
            onClick={onLater}
            className="px-4 py-2 rounded-md border border-border text-body text-foreground"
          >
            Talvez depois
          </button>
        </div>
      </div>
    </div>
  );
}
