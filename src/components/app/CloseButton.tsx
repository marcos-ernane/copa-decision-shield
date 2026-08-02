import { useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';

interface Props {
  className?: string;
  /**
   * Espelha o BackButton: sem isto o Fechar sempre vai para a Início, o que
   * está certo nos fluxos, mas não em telas abertas de dentro de uma lista
   * (uma simulação, por exemplo) onde fechar significa voltar à lista.
   */
  onClick?: () => void;
  label?: string;
}

export function CloseButton({ className = '', onClick, label = 'Fechar e ir para Início' }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick ?? (() => void navigate({ to: '/' }))}
      className={`inline-flex items-center gap-1.5 bg-op-navy border border-op-gray/30 rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity ${className}`}
      aria-label={label}
    >
      <span className="text-sm font-medium text-op-white">Fechar</span>
      <X className="size-4 text-op-gray" />
    </button>
  );
}
