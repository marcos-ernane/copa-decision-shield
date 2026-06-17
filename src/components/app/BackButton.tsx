import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

interface Props {
  className?: string;
  label?: string;
  onClick?: () => void;
}

export function BackButton({ className = '', label = 'Voltar', onClick }: Props) {
  const router = useRouter();
  return (
    <button
      onClick={onClick ?? (() => router.history.back())}
      className={`inline-flex items-center gap-1.5 bg-op-navy border border-op-gray/30 rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity ${className}`}
      aria-label={label}
    >
      <ChevronLeft className="size-4 text-op-amber" />
      <span className="text-sm font-medium text-op-white">{label}</span>
    </button>
  );
}
