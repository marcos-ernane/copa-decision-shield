// Tela DONE — apenas 3 opções. Zero motivacional.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  onClose: () => void;
}

export function PressureDone({ projectId, onClose }: Props) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-title text-foreground">Modo Pressão concluído.</h2>
      <Button
        className="w-full"
        onClick={() => navigate({ to: '/register/pulse', search: { projectId } as never })}
      >
        Registrar resultado
      </Button>
      <Button
        className="w-full"
        variant="outline"
        onClick={() => navigate({ to: '/register/structured', search: { projectId } as never })}
      >
        Abrir Registro Estruturado
      </Button>
      <Button className="w-full" variant="ghost" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}
