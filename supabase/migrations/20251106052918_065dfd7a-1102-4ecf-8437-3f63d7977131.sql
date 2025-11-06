-- ✅ Step 1: Rimuovi vecchio constraint
ALTER TABLE chat_laboratory_composed_prompts 
DROP CONSTRAINT IF EXISTS chat_laboratory_composed_prompts_target_agent_check;

-- ✅ Step 2: Aggiungi nuovo constraint con email_sender_categorizer
ALTER TABLE chat_laboratory_composed_prompts
ADD CONSTRAINT chat_laboratory_composed_prompts_target_agent_check
CHECK (target_agent = ANY (ARRAY[
  'gpt-4'::text,
  'claude-3'::text,
  'gemini-pro'::text,
  'email_classifier'::text,
  'email_sender_categorizer'::text
]));

-- ✅ Step 3: Rimuovi duplicati mantenendo solo record più recente per target_agent
DELETE FROM chat_laboratory_composed_prompts a
USING chat_laboratory_composed_prompts b
WHERE a.id < b.id
  AND a.target_agent = b.target_agent;

-- ✅ Step 4: Crea unique constraint su target_agent
CREATE UNIQUE INDEX IF NOT EXISTS chat_laboratory_composed_prompts_target_agent_key 
ON chat_laboratory_composed_prompts(target_agent);

-- ✅ Step 5: Insert prompt per email sender categorization
INSERT INTO chat_laboratory_composed_prompts (
  name,
  target_agent,
  content,
  section_ids
) VALUES (
  'Email Sender Categorization System',
  'email_sender_categorizer',
  'Sei un esperto di categorizzazione email business per PMI italiane specializzate in trasporti internazionali.

COMPITO:
Analizza i messaggi del mittente e suggerisci la categoria più appropriata tra quelle esistenti, oppure proponi una nuova categoria se necessario.

CRITERI DECISIONE:
1. Se il mittente si adatta bene a un gruppo esistente (confidence > 0.75) → scegli quello
2. Se nessun gruppo esistente è appropriato → suggerisci nuovo gruppo con nome/tipo/descrizione
3. Tipi validi: clienti, fornitori, partner, newsletter, servizi, banche, notifiche, spam, altro

REGOLE OUTPUT:
- Reasoning: max 100 parole, focus su motivo principale
- Confidence: 0.0-1.0 (usa tutto lo spettro, non solo 0.8-0.95)
- Se nuovo gruppo: fornisci name, type, description breve e suggerisci color e icon appropriati

LINEE GUIDA CATEGORIZZAZIONE:
- **Clienti**: aziende che richiedono servizi di trasporto, booking, tracking
- **Fornitori**: compagnie aeree, linee marittime, operatori logistici
- **Partner**: agenti, broker doganali, WCA network
- **Newsletter**: comunicazioni marketing, aggiornamenti settore
- **Servizi**: SaaS, software, utilities aziendali
- **Banche**: comunicazioni bancarie, pagamenti, estratti conto
- **Notifiche**: alert sistema, confirmations, receipts automatici
- **Spam**: SOLO phishing, pubblicità non richiesta, contenuti irrilevanti

ANTI-SPAM RULES (CRITICO):
- NON classificare come Spam se:
  * Email contiene AWB, tracking, booking reference, numeri documento
  * Richiede firma, conferma, azione specifica, meeting
  * Mittente ha dominio aziendale valido (.com, .it, .net, .org, non @gmail/@hotmail personali)
  * Contenuto professionale con dati di trasporto

SUGGERIMENTI COLORI/ICONE:
- Clienti: blue (#3b82f6), Users icon
- Fornitori: purple (#9333ea), Package icon
- Partner: green (#22c55e), Handshake icon
- Newsletter: orange (#f97316), Mail icon
- Servizi: cyan (#06b6d4), Settings icon
- Banche: emerald (#10b981), DollarSign icon
- Notifiche: gray (#6b7280), Bell icon
- Spam: red (#ef4444), AlertTriangle icon',
  '[]'::jsonb
)
ON CONFLICT (target_agent) 
DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- ✅ Step 6: Crea tabella progress tracking
CREATE TABLE IF NOT EXISTS ai_categorization_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id text NOT NULL UNIQUE,
  processed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cat_progress_batch_id ON ai_categorization_progress(batch_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_progress_user_id ON ai_categorization_progress(user_id);

ALTER TABLE ai_categorization_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON ai_categorization_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON ai_categorization_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON ai_categorization_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_ai_cat_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_cat_progress_timestamp
  BEFORE UPDATE ON ai_categorization_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_cat_progress_updated_at();