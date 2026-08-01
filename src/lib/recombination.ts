import type { StructuredOContent, RecombinationItem } from './register';

/**
 * Extrai a lista de recursos disponíveis do conteúdo do Formato O.
 * Modo 3R: split de resources por \n.
 * Modo 4D: itens não-vazios das 4 dimensões do Inventário 4D.
 */
export function extractResourceList(content: Partial<StructuredOContent>): string[] {
  if (content.resources?.trim()) {
    return content.resources.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (content.inventory_4d) {
    const inv = content.inventory_4d;
    return [
      ...Object.values(inv.density),
      ...Object.values(inv.direction),
      ...Object.values(inv.delay),
      ...Object.values(inv.desire),
    ].map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Retorna o item selecionado ou null. */
export function getSelectedRecombination(
  items: RecombinationItem[],
): RecombinationItem | null {
  return items.find((i) => i.selected) ?? null;
}
