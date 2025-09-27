-- Create activities table
CREATE TABLE public.attivita (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rubrica_id UUID REFERENCES public.rubrica(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('chiamata', 'meeting', 'email', 'task')),
  descrizione TEXT NOT NULL,
  stato VARCHAR(50) NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'in_corso', 'completata', 'annullata')),
  scadenza TIMESTAMP WITH TIME ZONE,
  priorita VARCHAR(50) NOT NULL DEFAULT 'media' CHECK (priorita IN ('alta', 'media', 'bassa')),
  assegnato_a UUID,
  creato_da UUID,
  data_creazione TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attivita ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
CREATE POLICY "Allow all operations on attivita" 
ON public.attivita 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attivita_updated_at
BEFORE UPDATE ON public.attivita
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();