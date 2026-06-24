import { useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';

interface Props {
  className?: string;
}

export function CloseButton({ className = '' }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => void navigate({ to: '/' })}
      className={`inline-flex items-center gap-1.5 bg-op-navy border border-op-gray/30 rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity ${className}`}
      aria-label="Fechar e ir para Início"
    >
      <span className="text-sm font-medium text-op-white">Fechar</span>
      <X className="size-4 text-op-gray" />
    </button>
  );
}
