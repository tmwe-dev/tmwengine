-- Registro versione baseline di bar-chat-orchestrator
-- Migration: register_bar_chat_orchestrator_v1_baseline
-- Date: 2025-01-12

INSERT INTO edge_function_versions (
  function_name,
  version_number,
  description,
  created_by,
  is_active,
  content
) VALUES (
  'bar-chat-orchestrator',
  1,
  'v1.0 - Baseline con TTS support (backup 2025-01-12). Prima versione stabile con integrazione ElevenLabs TTS e turn-taking logic.',
  'dc50c3d3-e88a-4fd6-8102-b7736935a482'::uuid,
  false,
  '// Bar Chat Orchestrator v1.0 - Baseline with TTS support
// Backup salvato in index-old-2025-01-12.ts
// Questa versione include: TTS con ElevenLabs, prompt composition dinamico, turn-taking logic
// Vedere file backup per codice completo'
) ON CONFLICT (function_name, version_number) DO NOTHING;

INSERT INTO edge_function_versions (
  function_name,
  version_number,
  description,
  created_by,
  is_active,
  content
) VALUES (
  'bar-chat-orchestrator',
  2,
  'v2.0 - Interrupt Support + Bidirectional Audio (2025-01-12). Aggiunge gestione interrupt, controlli audio bidirezionali, check interrupt prima di TTS.',
  'dc50c3d3-e88a-4fd6-8102-b7736935a482'::uuid,
  true,
  '// Bar Chat Orchestrator v2.0 - Interrupt + Bidirectional Audio
// Deployed: 2025-01-12
// New features: interrupt_requested check, action-based routing, audio stream ready
// Vedere file index.ts corrente per codice completo'
) ON CONFLICT (function_name, version_number) DO NOTHING;