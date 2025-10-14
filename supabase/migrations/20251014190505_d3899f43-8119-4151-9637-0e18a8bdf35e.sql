-- Add audio_mode and preset columns to chat_laboratory_bar_mode
ALTER TABLE public.chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS audio_mode TEXT NOT NULL DEFAULT 'stable',
ADD COLUMN IF NOT EXISTS preset TEXT NOT NULL DEFAULT 'professional';

-- Add check constraints
ALTER TABLE public.chat_laboratory_bar_mode
ADD CONSTRAINT audio_mode_check CHECK (audio_mode IN ('stable', 'continuous', 'extended', 'hybrid'));

ALTER TABLE public.chat_laboratory_bar_mode
ADD CONSTRAINT preset_check CHECK (preset IN ('fast', 'professional', 'deep', 'custom'));

COMMENT ON COLUMN public.chat_laboratory_bar_mode.audio_mode IS 'Audio recording mode: stable (manual), continuous (auto-stop), extended (press-hold), hybrid (multi-chunk)';
COMMENT ON COLUMN public.chat_laboratory_bar_mode.preset IS 'Conversation preset: fast, professional, deep, or custom';