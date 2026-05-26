// Validação de community_link conforme REQ-COMM-01.
// Apenas HTTPS. Domínios permitidos configuráveis (lista aberta — o admin escolhe
// qual plataforma usa: Discord, Telegram, Circle, Slack, WhatsApp, etc.)

export const ALLOWED_COMMUNITY_DOMAINS: readonly string[] = [
  'discord.gg',
  'discord.com',
  'telegram.me',
  't.me',
  'chat.whatsapp.com',
  'community.circle.so',
  'slack.com',
  'groups.google.com',
  'chat.google.com',
  'luma.com',
  'lu.ma',
  'notion.so',
  'hotmart.com',
  'kiwify.com.br',
  'eduzz.com',
  'monetizze.com.br',
];

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCommunityUrl(url: string): UrlValidationResult {
  if (!url || !url.trim()) {
    return { valid: false, reason: 'URL vazia.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { valid: false, reason: 'URL malformada.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Apenas URLs HTTPS são permitidas.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_COMMUNITY_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );

  if (!allowed) {
    return { valid: false, reason: `Domínio não permitido: ${hostname}.` };
  }

  return { valid: true };
}
