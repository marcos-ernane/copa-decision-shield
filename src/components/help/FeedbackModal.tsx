import { useState } from 'react';
import { ChevronLeft, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  {
    key: 'cenarios',
    label: 'Cenários',
    subtypes: ['Fluxo', 'Processo', 'Oferta', 'Relacionamento', 'Pressão', 'Novo tipo'],
  },
  {
    key: 'camadas',
    label: 'Camadas',
    subtypes: ['Operabilidade', 'Conversão', 'Recorrência', 'Escala', 'Nova camada'],
  },
  {
    key: 'tipos_entrada',
    label: 'Tipos de Entrada',
    subtypes: ['Pulso', 'IMV', 'APA', 'Organização', 'Análise', 'Corretiva', 'Novo tipo'],
  },
  {
    key: 'navegacao',
    label: 'Navegação & Interface',
    subtypes: ['Bottom Nav', 'Telas', 'Botões', 'Fluxos', 'Visual'],
  },
  {
    key: 'funcionalidades',
    label: 'Funcionalidades',
    subtypes: ['COPA de Bolso', 'Modo Pressão', 'Diário', 'Bússola', 'Painel', 'Notificações'],
  },
  { key: 'outro', label: 'Outro', subtypes: [] },
];

const IMPACT_OPTIONS = [
  { key: 'blocks_me',   label: 'Me impede de usar o app' },
  { key: 'sometimes',   label: 'Às vezes atrapalha'       },
  { key: 'improvement', label: 'É só uma melhoria'         },
];

const MAX_PER_MONTH = 5;

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getDeviceId(): string {
  const k = 'aop.device_id';
  let id = localStorage.getItem(k);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); }
  return id;
}

function getLocalCount(): number {
  return parseInt(localStorage.getItem(`aop.feedback_${monthKey()}`) ?? '0', 10);
}

function incrementLocalCount() {
  const k = `aop.feedback_${monthKey()}`;
  localStorage.setItem(k, String(getLocalCount() + 1));
}

type Step = 'category' | 'subcategory' | 'form' | 'success';

interface Props { onClose: () => void; }

export function FeedbackModal({ onClose }: Props) {
  const [step, setStep]               = useState<Step>('category');
  const [category, setCategory]       = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [impact, setImpact]           = useState('');
  const [message, setMessage]         = useState('');
  const [userName, setUserName]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [monthCount, setMonthCount]   = useState(getLocalCount);

  const remaining = MAX_PER_MONTH - monthCount;
  const selectedCat = CATEGORIES.find(c => c.key === category);

  function handleBack() {
    if (step === 'category')    { onClose(); return; }
    if (step === 'subcategory') { setSubcategory(''); setStep('category'); return; }
    if (step === 'form') {
      setImpact(''); setMessage(''); setUserName('');
      if (selectedCat && selectedCat.subtypes.length > 0) setStep('subcategory');
      else setStep('category');
      return;
    }
    if (step === 'success') { onClose(); }
  }

  function pickCategory(key: string) {
    setCategory(key);
    const cat = CATEGORIES.find(c => c.key === key);
    if (cat && cat.subtypes.length > 0) setStep('subcategory');
    else setStep('form');
  }

  async function submit() {
    if (!message.trim() || !category || !impact || remaining <= 0) return;
    setLoading(true);
    try {
      const deviceId = getDeviceId();
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('feedback_suggestions').insert({
        user_id:      session?.user.id ?? null,
        device_id:    deviceId,
        category,
        subcategory:  subcategory || null,
        impact_level: impact,
        message:      message.trim(),
        user_name:    userName.trim() || null,
      });
      incrementLocalCount();
      setMonthCount(prev => prev + 1);
    } catch {
      // falha silenciosa — mostra sucesso mesmo assim
    } finally {
      setLoading(false);
      setStep('success');
    }
  }

  const stepTitle: Record<Step, string> = {
    category:    'Sugerir Melhoria',
    subcategory: selectedCat?.label ?? 'Subcategoria',
    form:        'Sua Sugestão',
    success:     'Recebemos!',
  };

  return (
    <div
      className="fixed inset-0 flex flex-col z-[300]"
      style={{ backgroundColor: '#070C12' }}
    >
      {/* Header */}
      <header className="shrink-0 border-b border-op-gray/30 bg-op-black px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-small text-op-white bg-op-navy border border-op-gray/30 rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-4 text-op-amber" />
          <span>Voltar</span>
        </button>
        <h1 className="flex-1 text-heading text-op-white">{stepTitle[step]}</h1>
        {step !== 'success' && (
          <span className="text-label text-op-gray shrink-0">
            {remaining} de {MAX_PER_MONTH} restantes
          </span>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ paddingBottom: '80px' }}>

        {/* STEP: category */}
        {step === 'category' && (
          <>
            <p className="text-small text-op-gray">
              Onde você quer dar sua sugestão?
            </p>
            {remaining <= 0 ? (
              <div className="rounded-xl border border-op-gray/30 bg-op-navy p-4 text-center space-y-2">
                <p className="text-body font-semibold text-op-white">Limite mensal atingido</p>
                <p className="text-small text-op-gray">
                  Você usou todas as {MAX_PER_MONTH} sugestões deste mês.
                  O limite é resetado no início do próximo mês.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => pickCategory(cat.key)}
                    className="rounded-xl border border-op-gray/30 bg-op-navy text-op-white text-small font-medium p-4 text-left hover:border-op-amber/50 hover:bg-op-amber/5 transition-colors"
                  >
                    {cat.label}
                    {cat.subtypes.length > 0 && (
                      <span className="block text-label text-op-gray mt-1">
                        {cat.subtypes.length} subtipos
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP: subcategory */}
        {step === 'subcategory' && selectedCat && (
          <>
            <p className="text-small text-op-gray">Qual subtipo se aplica?</p>
            <div className="flex flex-wrap gap-2">
              {selectedCat.subtypes.map(sub => (
                <button
                  key={sub}
                  onClick={() => { setSubcategory(sub); setStep('form'); }}
                  className={`rounded-full px-4 py-2 text-small border transition-colors ${
                    subcategory === sub
                      ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                      : 'bg-op-navy text-op-gray border-op-gray/30 hover:opacity-80'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP: form */}
        {step === 'form' && (
          <>
            {/* Contexto */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-op-gray/30 bg-op-navy text-op-gray text-label px-2 py-0.5">
                {selectedCat?.label}
              </span>
              {subcategory && (
                <span className="inline-flex items-center rounded-full border border-op-gray/30 bg-op-navy text-op-gray text-label px-2 py-0.5">
                  {subcategory}
                </span>
              )}
            </div>

            {/* Impacto */}
            <div className="space-y-2">
              <p className="text-label text-op-gray uppercase tracking-wide">
                Isso me impede de usar o app?
              </p>
              <div className="flex flex-col gap-2">
                {IMPACT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setImpact(opt.key)}
                    className={`rounded-xl px-4 py-3 text-small text-left border transition-colors ${
                      impact === opt.key
                        ? 'bg-op-amber/10 border-op-amber text-op-amber font-medium'
                        : 'bg-op-navy border-op-gray/30 text-op-white hover:opacity-80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sugestão */}
            <div className="space-y-1">
              <p className="text-label text-op-gray uppercase tracking-wide">
                Sua sugestão
              </p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 500))}
                placeholder="Descreva sua sugestão com o máximo de detalhes possível..."
                rows={5}
                className="w-full resize-none rounded-xl border border-op-gray/30 bg-op-navy text-op-white text-small px-4 py-3 placeholder:text-op-gray focus:outline-none focus:border-op-cyan/60 transition-colors"
              />
              <p className={`text-label text-right ${message.length >= 480 ? 'text-op-amber' : 'text-op-gray'}`}>
                {message.length}/500
              </p>
            </div>

            {/* Nome opcional */}
            <div className="space-y-1">
              <p className="text-label text-op-gray uppercase tracking-wide">
                Seu nome <span className="normal-case">(opcional — você não é obrigado a se identificar)</span>
              </p>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Como podemos te chamar?"
                className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white text-small px-4 py-3 placeholder:text-op-gray focus:outline-none focus:border-op-cyan/60 transition-colors"
              />
            </div>

            {/* Enviar */}
            <button
              onClick={() => void submit()}
              disabled={!message.trim() || !impact || loading}
              className="w-full rounded-xl bg-op-amber text-op-black text-small font-semibold py-3 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {loading
                ? <><Loader2 className="size-4 animate-spin" /> Enviando...</>
                : <><Send className="size-4" /> Enviar sugestão</>
              }
            </button>
          </>
        )}

        {/* STEP: success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <CheckCircle2 className="size-14 text-op-cyan" />
            <p className="text-body font-semibold text-op-white">Sugestão recebida!</p>
            <p className="text-small text-op-gray max-w-xs">
              Obrigado por contribuir com o app. Você usou{' '}
              <span className="text-op-white font-medium">{monthCount} de {MAX_PER_MONTH}</span>{' '}
              sugestões disponíveis este mês.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-op-navy border border-op-gray/30 text-op-white text-small px-8 py-3 hover:opacity-80 transition-opacity"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
