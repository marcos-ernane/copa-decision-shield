-- PRD-ITEM-01 v2.0 — Ciclo Aberto de APA
-- Adds 'quick_review' to entries.entry_type CHECK constraint.

ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_entry_type_check;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_entry_type_check CHECK (entry_type IN (
    'pulse',
    'structured_C',
    'structured_O',
    'structured_P',
    'structured_A',
    'passive',
    'corrective',
    'copa_session',
    'pressure_session',
    'protocol_5min',
    'creative_session',
    'simulation_session',
    'quick_review'
  ));
