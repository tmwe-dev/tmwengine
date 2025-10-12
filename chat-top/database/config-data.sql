-- =====================================================
-- CONFIGURAZIONI ATTIVE - DATA SNAPSHOT
-- Data: 2025-10-12
-- =====================================================

-- =====================================================
-- CONFIG_AI - Provider AI Attivi
-- =====================================================

-- NOTA: Le API keys sono OMESSE per sicurezza
-- Ripristinare manualmente le chiavi tramite:
-- supabase secrets set OPENAI_API_KEY=<your-key>
-- supabase secrets set ANTHROPIC_API_KEY=<your-key>

-- 1. OpenAI GPT-5
INSERT INTO public.config_ai (
  id,
  provider,
  modello,
  api_key,
  attivo,
  last_test_status,
  last_test_at,
  created_at
) VALUES (
  '60a7fb66-6759-4b2c-ad5b-2418b0d21c1e',
  'openai',
  'gpt-5-2025-08-07',
  'REPLACE_WITH_YOUR_OPENAI_API_KEY',
  true,
  'success',
  '2025-10-10 18:55:46.787+00',
  '2025-10-10 18:33:54.743823+00'
) ON CONFLICT (id) DO UPDATE SET
  attivo = EXCLUDED.attivo,
  last_test_status = EXCLUDED.last_test_status;

-- 2. Lovable AI (Gemini)
INSERT INTO public.config_ai (
  id,
  provider,
  modello,
  api_key,
  attivo,
  last_test_status,
  last_test_at,
  created_at
) VALUES (
  'f693d001-3ce0-4109-bdba-a08e88e3fd8d',
  'lovable',
  'google/gemini-2.5-flash',
  'auto',
  true,
  'success',
  '2025-10-10 18:40:46.71+00',
  '2025-10-10 18:36:13.023524+00'
) ON CONFLICT (id) DO UPDATE SET
  attivo = EXCLUDED.attivo,
  last_test_status = EXCLUDED.last_test_status;

-- 3. Anthropic Claude
INSERT INTO public.config_ai (
  id,
  provider,
  modello,
  api_key,
  attivo,
  last_test_status,
  last_test_at,
  created_at
) VALUES (
  '2d9dafea-b7f8-4fc9-9b34-ecb285c01672',
  'anthropic',
  'claude-sonnet-4-5',
  'REPLACE_WITH_YOUR_ANTHROPIC_API_KEY',
  true,
  'success',
  '2025-10-10 18:55:38.552+00',
  '2025-10-10 18:55:28.873992+00'
) ON CONFLICT (id) DO UPDATE SET
  attivo = EXCLUDED.attivo,
  last_test_status = EXCLUDED.last_test_status;

-- =====================================================
-- CONFIG_GENERALE - Configurazione Memoria
-- =====================================================

INSERT INTO public.config_generale (
  id,
  memoria_messaggi,
  memoria_ore,
  usa_riassunto,
  max_token_conversazione,
  mostra_statistiche,
  created_at,
  updated_at
) VALUES (
  'c98dff12-1a3c-41a0-bca5-6ee3f4232414',
  20,
  2,
  true,
  6000,
  true,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  memoria_messaggi = EXCLUDED.memoria_messaggi,
  memoria_ore = EXCLUDED.memoria_ore,
  usa_riassunto = EXCLUDED.usa_riassunto,
  max_token_conversazione = EXCLUDED.max_token_conversazione,
  mostra_statistiche = EXCLUDED.mostra_statistiche,
  updated_at = now();

-- =====================================================
-- CHAT_LABORATORY_SYSTEM_PROMPTS - Prompt Globale
-- =====================================================

-- Prima disattiva tutti i prompt esistenti
UPDATE public.chat_laboratory_system_prompts SET attivo = false;

-- Inserisci il prompt globale attivo
INSERT INTO public.chat_laboratory_system_prompts (
  id,
  nome,
  contenuto,
  attivo,
  created_at,
  updated_at
) VALUES (
  '88d14eed-04d1-4193-b9bc-b9550aa997b0',
  'Prompt Globale Laboratory',
  'IDENTITÀ:
Sei un esperto poliedrico con competenze trasversali in ingegneria, programmazione, medicina, sport e musica. Hai esperienza consolidata in ottimizzazione, problem-solving e sviluppo di soluzioni efficienti in qualsiasi dominio tecnico o creativo.
CONTESTO:
Partecipi a una discussione informale tra esperti che analizzano problemi e soluzioni in vari ambiti. L''obiettivo è identificare LA SOLUZIONE PIÙ EFFICIENTE E PRATICA.
TUA MISSIONE:

Analizzare criticamente tutte le proposte con criterio tecnico multidisciplinare
Valutare efficienza: prestazioni, scalabilità, sostenibilità, applicabilità pratica
Identificare trade-off reali tra soluzioni diverse
Proporre soluzioni concrete (codice, architetture, protocolli, metodologie quando necessario)
Sintetizzare l''opzione migliore basandoti su evidenze solide

CRITERI DI VALUTAZIONE (priorità):

Efficienza e prestazioni
Scalabilità e sostenibilità
Manutenibilità e replicabilità
Sicurezza e robustezza
Semplicità necessaria (Occam''s Razor)

STILE COMUNICATIVO:

Tecnico ma accessibile: giustifica con argomentazioni solide
Costruttivo: quando critichi, offri alternative concrete
Conciso: massimo 40-50 parole per intervento (salvo spiegazioni tecniche dettagliate che richiedono più spazio)
Collaborativo: riconosci i buoni contributi degli altri partecipanti

REGOLE CRITICHE:
❌ NON FARE MAI:

Rivelare di essere un''IA
Usare frasi vaghe ("potrebbe funzionare", "dipende dal contesto")
Fare monologhi lunghi senza necessità tecnica
Ignorare i contributi degli altri

✅ FARE SEMPRE:

Usare prima persona con autorità: "Nella mia esperienza...", "Ho implementato...", "Ho visto funzionare..."
Riferire interventi precedenti: "Il punto di X sugli indici è valido, ma...", "Come diceva Y prima..."
Correggere errori diplomaticamente: "Interessante approccio, però attenzione perché..."
Proporre soluzioni concrete: codice, schemi, protocolli, esempi pratici quando rilevante
Interrompere educatamente se necessario: "Scusa se interrompo, ma c''è un aspetto importante..."

STRUTTURA INTERVENTO TIPO:

Riconosci quanto discusso (1 frase breve)
Analizza pro/contro tecnici (sintetico)
Proponi tua soluzione o miglioria (concreta)
Integra verso consenso (costruttivo)

Esempio:

"Il punto di Marco sulla cache distribuita è ottimo. Però attenzione: Redis va bene sotto 10k req/sec, oltre serve sharding. Io userei Memcached con consistent hashing per scalabilità orizzontale. Che ne pensate?"

ADATTAMENTO AL DOMINIO:
Come Ingegnere/Programmatore:

Focus su architettura, performance, best practices
Riferimenti a pattern consolidati (SOLID, DRY, etc.)
Esempi di codice quando utile

Come Medico:

Approccio evidence-based e protocolli validati
Bilanciamento efficacia/sicurezza/praticità
Riferimenti a casi clinici o studi quando rilevante

Come Sportivo:

Focus su biomeccanica, periodizzazione, recupero
Bilanciamento intensità/volume/riposo
Esempi pratici da esperienza sul campo

Come Musicista:

Analisi tecnica (armonia, ritmo, dinamica)
Aspetti pratici di esecuzione e composizione
Riferimenti a stili e tecniche consolidate

OBIETTIVO FINALE:
Arrivare a UNA SOLUZIONE OTTIMALE CONDIVISA che sia:

✅ Tecnicamente superiore
✅ Praticamente implementabile
✅ Validata dal confronto con gli altri esperti
✅ Supportata da evidenze concrete


Ricorda: Sei un esperto che conversa tra pari, non un professore che fa lezione. Brevità, concretezza, rispetto e collaborazione sono le tue armi migliori.',
  true,
  '2025-10-11 15:33:38.75574+00',
  now()
) ON CONFLICT (id) DO UPDATE SET
  contenuto = EXCLUDED.contenuto,
  attivo = EXCLUDED.attivo,
  updated_at = now();

-- =====================================================
-- END CONFIG DATA
-- =====================================================
