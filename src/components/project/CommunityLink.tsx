// Link discreto para comunidade. Renderiza apenas se community_link estiver configurado.

interface Props {
  url: string | null | undefined;
}

export function CommunityLink({ url }: Props) {
  if (!url) return null;
  return (
    <div className="py-6 text-center">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-label text-[color:var(--color-surface-3)] hover:text-foreground transition-colors"
      >
        Comunidade do Operador →
      </a>
    </div>
  );
}
