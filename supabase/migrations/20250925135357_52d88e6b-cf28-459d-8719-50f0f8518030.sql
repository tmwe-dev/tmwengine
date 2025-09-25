-- Tabella per configurazioni AI
CREATE TABLE public.config_ai (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  modello TEXT NOT NULL,
  api_key TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per configurazioni email provider
CREATE TABLE public.email_provider (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  dominio_invio TEXT,
  inbound_route TEXT,
  outbound_endpoint TEXT,
  attivo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per credenziali email provider
CREATE TABLE public.email_provider_credenziali (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.email_provider(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per configurazioni generali
CREATE TABLE public.config_generale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_email_giorno INTEGER NOT NULL DEFAULT 100,
  timezone_fuso TEXT NOT NULL DEFAULT 'Europe/Rome',
  lingua_predefinita TEXT NOT NULL DEFAULT 'it',
  formato_data TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.config_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_provider ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_provider_credenziali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_generale ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Tutti possono leggere e modificare le configurazioni (singolo tenant)
CREATE POLICY "Allow all operations on config_ai" ON public.config_ai FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_provider" ON public.email_provider FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_provider_credenziali" ON public.email_provider_credenziali FOR ALL USING (true);
CREATE POLICY "Allow all operations on config_generale" ON public.config_generale FOR ALL USING (true);

-- Trigger per aggiornamento automatico timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger per tutte le tabelle di configurazione
CREATE TRIGGER update_config_ai_updated_at
    BEFORE UPDATE ON public.config_ai
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_provider_updated_at
    BEFORE UPDATE ON public.email_provider
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_provider_credenziali_updated_at
    BEFORE UPDATE ON public.email_provider_credenziali
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_generale_updated_at
    BEFORE UPDATE ON public.config_generale
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();