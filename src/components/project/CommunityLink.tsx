// Link discreto para comunidade externa. REQ-COMM-01/02/03/04.
// Renderiza apenas se url estiver configurada E passar na validação HTTPS + domínio.
// rel="noopener noreferrer" garante isolamento (REQ-COMM-02).

import { validateCommunityUrl } from '@/lib/communityUrl';

interface Props {
  url: string | null | undefined;
}

export function CommunityLink({ url }: Props) {
  if (!url) return null;

  const { valid } = validateCommunityUrl(url);
  if (!valid) return null;

  return (
    <div className="py-6 text-center">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-label text-[color:var(--color-surface-3)] hover:text-foreground transition-colors"
      >
        Comunidade do Operador →
      </a>
    </div>
  );
}
