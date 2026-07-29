// Documentos legais versionados (PRD-AUTH-01, Etapa 2).
//
// O campo `version` é a FONTE ÚNICA DE VERDADE para a reexibição do aceite:
// quando uma nova versão de um documento é publicada, incrementa-se aqui e a
// comparação com o maior `version` aceito em `legal_acceptances` decide se o
// usuário precisa aceitar de novo.
//
// O conteúdo vive em constantes TS (não no banco) para versionar junto do código
// e continuar disponível offline — o app é offline-first.

import type { LegalDocumentType } from '@/types/database';
import { PRIVACY_POLICY } from './privacyPolicy';
import { TERMS_OF_USE } from './termsOfUse';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  /**
   * Parágrafos que, no documento oficial, aparecem DEPOIS da lista de bullets.
   * Preserva a ordem original de leitura — essencial num texto jurídico, onde
   * inverter um parágrafo de ressalva muda o sentido da cláusula.
   */
  closingParagraphs?: string[];
}

export interface LegalDocument {
  type: LegalDocumentType;
  title: string;
  /** Fonte única de verdade para reexibição do aceite. */
  version: string;
  /** Linha de vigência logo abaixo do título, no documento oficial. */
  subtitle?: string;
  /** Linha de rodapé do documento oficial. */
  footer?: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocument> = {
  privacy_policy: PRIVACY_POLICY,
  terms_of_use: TERMS_OF_USE,
};

export { PRIVACY_POLICY, TERMS_OF_USE };
