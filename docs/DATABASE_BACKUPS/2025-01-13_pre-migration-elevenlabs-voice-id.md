## Schema Pre-Migration: 2025-01-13

### Obiettivo Modifica
Aggiungere colonna `default_voice_id` a `voice_agent_config` per supportare selezione dinamica voice ElevenLabs in `useElevenLabsTTS.tsx`.

### Tabelle Coinvolte
- `voice_agent_config`

### DDL Corrente (voice_agent_config)
```sql
CREATE TABLE public.voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevenlabs_api_key TEXT NOT NULL,
  agent_id TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Trigger Attivi
```sql
CREATE TRIGGER update_voice_agent_config_updated_at
  BEFORE UPDATE ON public.voice_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### RLS Policies
```sql
-- Policy: Allow all operations on voice_agent_config
CREATE POLICY "Allow all operations on voice_agent_config"
ON public.voice_agent_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy: Service role can read voice config
CREATE POLICY "Service role can read voice config"
ON voice_agent_config FOR SELECT
TO service_role
USING (true);

-- Policy: Authenticated users can read voice config
CREATE POLICY "Authenticated users can read voice config"
ON voice_agent_config FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can manage voice config
CREATE POLICY "Authenticated users can manage voice config"
ON voice_agent_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

### Motivazione
Eliminare hardcoded voice IDs da `useElevenLabsTTS.tsx` (VOICE_MAP) e centralizzare configurazione nel database, come da best practices.

### Impatto
- Frontend: `src/hooks/useElevenLabsTTS.tsx` leggerà `default_voice_id`
- Nessun impatto su dati esistenti (colonna nullable)
- Fallback: se NULL, usa primo `voice_id` da `elevenlabs_agents`
