// AuthScreen — moldura das telas de autenticação (PRD-AUTH-01, Etapa 5).
//
// Só o enquadramento: fundo, centralização, título e rodapé. /login e /signup
// diferem no conteúdo, não no layout — separar isso evita que as duas telas
// comecem a divergir visualmente com o tempo.

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Ação de escape ao pé da tela (ex.: "Continuar sem conta"). */
  footer?: React.ReactNode;
}

export function AuthScreen({ title, subtitle, children, footer }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{
        backgroundColor: '#070C12',
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-title text-op-white">{title}</h1>
          {subtitle && <p className="text-body text-op-gray">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="pt-2 border-t border-op-gray/20">{footer}</div>}
      </div>
    </div>
  );
}
