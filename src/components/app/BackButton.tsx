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
      className={`p-2 -ml-2 rounded-md hover:bg-accent text-op-white ${className}`}
      aria-label={label}
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}
