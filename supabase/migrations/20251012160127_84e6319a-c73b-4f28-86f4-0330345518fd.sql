-- Inserisci la configurazione ElevenLabs API key
INSERT INTO voice_agent_config (elevenlabs_api_key, enabled)
VALUES ('sk_a62bbdb3b474fad9df5f621bdb85aca47d2153a5b6e3541f', true)
ON CONFLICT (id) DO UPDATE SET
  elevenlabs_api_key = EXCLUDED.elevenlabs_api_key,
  enabled = EXCLUDED.enabled,
  updated_at = now();