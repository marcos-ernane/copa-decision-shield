interface Props {
  text: string | null;
}

export function QualitativeEvolution({ text }: Props) {
  if (!text) return null;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-label text-muted-foreground uppercase tracking-wide">
        Evolução qualitativa
      </div>
      <p className="text-body text-foreground mt-1">{text}</p>
    </div>
  );
}
