interface Props {
  text: string | null;
}

export function QualitativeEvolution({ text }: Props) {
  if (!text) return null;
  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-4">
      <div className="text-label text-op-gray uppercase tracking-wide">
        Evolução qualitativa
      </div>
      <p className="text-body text-op-white mt-1">{text}</p>
    </div>
  );
}
