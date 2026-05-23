// transfer.ts — Persistência e helpers da Prova de Transferência (REQ-TRANSFER-01..05).
// Online: tabela transfer_proofs. Offline: GuestStorage.

import jsPDF from 'jspdf';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type {
  TransferProof,
  TransferProofStatus,
} from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

export interface TransferScenario {
  context: string;
  type: ScenarioType | null;
  layer: OperationalLayer | null;
  fact: string;
  friction: string;
  imv: string;
  metric: string;
}

export interface TransferReportData {
  score: number;
  observations: string[]; // 4 frases
}

const TRANSFER_KEY = 'aop.transfer_proof.current';

interface LocalProof {
  id: string;
  status: TransferProofStatus;
  scenarios: TransferScenario[];
  final_principle: string | null;
  consistency_report: string | null;
  consistency_score: number | null;
  completed_at: string | null;
  created_at: string;
}

function readLocal(): LocalProof | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TRANSFER_KEY);
    return raw ? (JSON.parse(raw) as LocalProof) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: LocalProof | null): void {
  if (typeof window === 'undefined') return;
  if (p === null) localStorage.removeItem(TRANSFER_KEY);
  else localStorage.setItem(TRANSFER_KEY, JSON.stringify(p));
}

export async function getInProgressProof(): Promise<TransferProof | LocalProof | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return readLocal();

  const { data } = await supabase
    .from('transfer_proofs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as TransferProof | null) ?? null;
}

export async function startTransferProof(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const nowIso = new Date().toISOString();

  if (!session) {
    const local: LocalProof = {
      id: guestId(),
      status: 'in_progress',
      scenarios: [],
      final_principle: null,
      consistency_report: null,
      consistency_score: null,
      completed_at: null,
      created_at: nowIso,
    };
    writeLocal(local);
    return local.id;
  }

  // Reuse existing in_progress if present.
  const existing = await getInProgressProof();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('transfer_proofs')
    .insert({
      user_id: session.user.id,
      status: 'in_progress',
      scenarios: [],
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('insert failed');
  return (data as { id: string }).id;
}

export async function saveScenarios(
  proofId: string,
  scenarios: TransferScenario[],
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const local = readLocal();
    if (!local) return;
    writeLocal({ ...local, scenarios });
    return;
  }
  await supabase
    .from('transfer_proofs')
    .update({ scenarios: scenarios as unknown as object[] })
    .eq('id', proofId);
}

export async function completeProof(
  proofId: string,
  scenarios: TransferScenario[],
  finalPrinciple: string,
  report: TransferReportData,
): Promise<void> {
  const completedAt = new Date().toISOString();
  const reportText = JSON.stringify({ observations: report.observations });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const local = readLocal();
    if (local) {
      writeLocal({
        ...local,
        scenarios,
        final_principle: finalPrinciple,
        consistency_report: reportText,
        consistency_score: report.score,
        completed_at: completedAt,
        status: 'completed',
      });
    }
    return;
  }

  await supabase
    .from('transfer_proofs')
    .update({
      scenarios: scenarios as unknown as object[],
      final_principle: finalPrinciple,
      consistency_report: reportText,
      consistency_score: report.score,
      completed_at: completedAt,
      status: 'completed',
    })
    .eq('id', proofId);
}

export async function savePrincipleToBank(principleText: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Sem sessão: registra localmente.
    if (typeof window === 'undefined') return;
    const key = 'aop.principles.local';
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    arr.push({
      id: guestId(),
      content: principleText,
      tags: ['transfer_proof'],
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(arr));
    return;
  }
  await supabase.from('principles').insert({
    user_id: session.user.id,
    project_id: null,
    content: principleText,
    tags: ['transfer_proof'],
    connections: [],
    versions: [],
    is_archived: false,
    is_master_principle: false,
    recall_count: 0,
  } as unknown as Record<string, unknown>);
}

// --------- Relatório local (fallback heurístico) ---------

const INTERP_TOKENS = [
  'acho', 'parece', 'talvez', 'provavelmente', 'deve', 'sinto',
  'imagino', 'acredito', 'me parece', 'tenho a impressão',
];

function looksInterpretive(text: string): boolean {
  const t = text.toLowerCase();
  return INTERP_TOKENS.some((k) => t.includes(k));
}

function hasMetric(text: string): boolean {
  // Métrica: número, %, "por", "em N dias/semanas", "até".
  return /\d|%|\bpor\b|\baté\b|\bdias?\b|\bsemanas?\b|\bvezes?\b/i.test(text);
}

function principleExtrapolates(principle: string, scenarios: TransferScenario[]): boolean {
  const p = principle.toLowerCase();
  if (p.split(/\s+/).filter(Boolean).length < 5) return false;
  // Não pode citar contexto específico de um único cenário.
  const contexts = scenarios.map((s) => s.context.toLowerCase());
  for (const c of contexts) {
    const words = c.split(/\s+/).filter((w) => w.length > 4);
    let hits = 0;
    for (const w of words) if (p.includes(w)) hits++;
    if (hits >= 2) return false;
  }
  return true;
}

export function generateLocalReport(
  scenarios: TransferScenario[],
  finalPrinciple: string,
): TransferReportData {
  // 1. Tipos coerentes
  const typesPresent = scenarios.every((s) => !!s.type && !!s.layer);
  const typesScore = typesPresent ? 25 : Math.round((scenarios.filter((s) => !!s.type).length / 3) * 25);

  // 2. Fatos limpos
  const cleanFacts = scenarios.filter((s) => !looksInterpretive(s.fact)).length;
  const factsScore = Math.round((cleanFacts / 3) * 25);

  // 3. IMVs com métrica
  const imvsWithMetric = scenarios.filter((s) => hasMetric(s.metric)).length;
  const imvScore = Math.round((imvsWithMetric / 3) * 25);

  // 4. Princípio extrapola
  const principleScore = principleExtrapolates(finalPrinciple, scenarios) ? 25 : 0;

  const score = typesScore + factsScore + imvScore + principleScore;

  const obs = [
    typesPresent
      ? 'Tipos e camadas atribuídos de forma consistente aos três contextos.'
      : 'Atribuição de tipo ou camada incompleta em parte dos cenários.',
    cleanFacts === 3
      ? 'Fatos formulados de forma observável, sem termos de interpretação.'
      : `Padrão de interpretação detectado em ${3 - cleanFacts} fato(s).`,
    imvsWithMetric === 3
      ? 'IMVs apresentam métrica verificável em todos os cenários.'
      : `Métrica ausente ou genérica em ${3 - imvsWithMetric} IMV(s).`,
    principleScore === 25
      ? 'Princípio final formulado em nível que atravessa os três cenários.'
      : 'Princípio final mantém-se próximo ao vocabulário de um cenário específico.',
  ];

  return { score, observations: obs };
}

export function parseRemoteReport(
  raw: string | null,
  fallback: TransferReportData,
): TransferReportData {
  if (!raw) return fallback;
  // O modelo retorna texto livre. Quebra em frases por ponto final.
  const sentences = raw
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 4);

  // Tenta extrair um número 0-100 do texto como score; caso contrário usa fallback.
  const m = raw.match(/(\b\d{1,3})\s*\/?\s*100\b/);
  const score = m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : fallback.score;

  const observations = sentences.length === 4 ? sentences : fallback.observations;
  return { score, observations };
}

// --------- PDF ---------

export async function exportTransferPDF(input: {
  userName: string;
  scenarios: TransferScenario[];
  finalPrinciple: string;
  report: TransferReportData;
  completedAt: string;
}): Promise<void> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;

  // Capa
  pdf.setFontSize(24);
  pdf.text('Prova de Transferência', pageW / 2, pageH / 2 - 40, { align: 'center' });
  pdf.setFontSize(13);
  pdf.text(`Operador: ${input.userName || 'Operador'}`, pageW / 2, pageH / 2, { align: 'center' });
  pdf.setFontSize(11);
  const dateStr = new Date(input.completedAt).toLocaleDateString('pt-BR');
  pdf.text(`Data: ${dateStr}`, pageW / 2, pageH / 2 + 22, { align: 'center' });

  const writeBlock = (title: string, lines: string[]) => {
    pdf.addPage();
    let y = margin;
    pdf.setFontSize(16);
    pdf.text(title, margin, y);
    y += 24;
    pdf.setFontSize(11);
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(line, maxW) as string[];
      for (const w of wrapped) {
        if (y > pageH - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(w, margin, y);
        y += 16;
      }
      y += 4;
    }
  };

  input.scenarios.forEach((s, i) => {
    writeBlock(`Cenário ${i + 1}`, [
      `Contexto: ${s.context}`,
      `Tipo: ${s.type ?? '-'} | Camada: ${s.layer ?? '-'}`,
      `Fato: ${s.fact}`,
      `Fricção: ${s.friction}`,
      `IMV: ${s.imv}`,
      `Métrica: ${s.metric}`,
    ]);
  });

  writeBlock('Princípio Final', [`"${input.finalPrinciple}"`]);

  writeBlock('Relatório de Consistência', [
    `Score: ${input.report.score}/100`,
    '',
    ...input.report.observations,
  ]);

  const fileName = `prova-transferencia-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const blob = pdf.output('blob');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Share.share({
          title: 'Prova de Transferência',
          text: 'Resultado da prova.',
          url: reader.result as string,
        });
      } catch {
        /* user cancel */
      }
    };
    reader.readAsDataURL(blob);
  } else {
    pdf.save(fileName);
  }
}

export function isContextValid(context: string): boolean {
  return context.trim().length >= 10;
}

export function isPrincipleValid(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= 5;
}

export function isScenarioComplete(s: TransferScenario): boolean {
  return (
    !!s.type &&
    !!s.layer &&
    s.fact.trim().length > 0 &&
    s.friction.trim().length > 0 &&
    s.imv.trim().length > 0 &&
    s.metric.trim().length > 0
  );
}
