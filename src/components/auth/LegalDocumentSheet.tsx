// LegalDocumentSheet — leitura da Política de Privacidade / Termos de Uso.
// (PRD-AUTH-01, Etapa 4)
//
// O aceite só é aceite se o usuário puder ler o que está aceitando: este sheet
// é aberto a partir dos links do <AuthForm> e, futuramente, de Configurações.
// Conteúdo vem de LEGAL_DOCUMENTS — offline, sem rede.

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { LEGAL_DOCUMENTS } from '@/content/legal';
import type { LegalDocumentType } from '@/types/database';

interface Props {
  /** null fecha o sheet. */
  documentType: LegalDocumentType | null;
  onClose: () => void;
}

export function LegalDocumentSheet({ documentType, onClose }: Props) {
  const doc = documentType ? LEGAL_DOCUMENTS[documentType] : null;

  return (
    <Drawer open={doc !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-background max-h-[88vh]">
        <DrawerHeader className="text-left shrink-0">
          <DrawerTitle className="text-heading text-foreground">
            {doc?.title ?? ''}
          </DrawerTitle>
          {doc?.subtitle && (
            <p className="text-small text-muted-foreground">{doc.subtitle}</p>
          )}
        </DrawerHeader>

        {/* Área rolável: em telas pequenas o documento é longo. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-6">
          {doc?.sections.map((section, i) => (
            <section key={i} className="space-y-2">
              <h3 className="text-heading text-foreground">{section.heading}</h3>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-body text-muted-foreground">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="space-y-1 pl-4">
                  {section.bullets.map((b, j) => (
                    <li
                      key={j}
                      className="text-body text-muted-foreground list-disc"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {section.closingParagraphs?.map((p, j) => (
                <p key={j} className="text-body text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}

          {doc?.footer && (
            <p className="text-small text-muted-foreground border-t border-border pt-4">
              {doc.footer}
            </p>
          )}

          <p className="text-label text-muted-foreground">
            Versão {doc?.version}
          </p>
        </div>

        <div
          className="shrink-0 px-4 pt-3 border-t border-border"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Button variant="ghost" className="w-full h-12" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
