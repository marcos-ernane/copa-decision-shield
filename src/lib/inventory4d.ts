import type { Inventory4D, Inventory4DItems } from './register';

const LABELS: Record<keyof Inventory4D, string> = {
  density:   'Densidade',
  direction: 'Direção',
  delay:     'Demora',
  desire:    'Desejo',
};

// Retorna true se ao menos 1 campo de qualquer dimensão foi preenchido
export function hasInventory4DContent(inv: Inventory4D): boolean {
  return (Object.values(inv) as Inventory4DItems[]).some((dim) =>
    Object.values(dim).some((v) => (v as string).trim().length > 0),
  );
}

// Converte 4D para texto plano compacto para preview na Timeline
export function inventory4DToPreview(inv: Inventory4D): string {
  return (Object.entries(inv) as [keyof Inventory4D, Inventory4D[keyof Inventory4D]][])
    .map(([key, dim]) => {
      const items = Object.values(dim).filter((v) => v.trim());
      if (!items.length) return null;
      return `${LABELS[key]}: ${items.join(' · ')}`;
    })
    .filter(Boolean)
    .join('\n');
}
