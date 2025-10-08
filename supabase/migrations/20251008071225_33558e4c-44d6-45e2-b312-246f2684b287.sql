-- Aggiungi campo per prompt di moderazione
ALTER TABLE public.intranet_room_ai_prompts 
ADD COLUMN moderation_prompt text;

-- Aggiungi campo per abilitare/disabilitare moderazione
ALTER TABLE public.intranet_room_ai_prompts
ADD COLUMN enable_moderation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.intranet_room_ai_prompts.moderation_prompt IS 'Prompt comportamentale per la moderazione: regole su parolacce, offese, bilanciamento interventi, toni';
COMMENT ON COLUMN public.intranet_room_ai_prompts.custom_prompt IS 'Prompt operativo e funzionale del sistema AI';