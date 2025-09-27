-- Create attachments table for email attachments
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for attachments
CREATE POLICY "Allow all operations on email_attachments" 
ON public.email_attachments 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_attachments_updated_at
BEFORE UPDATE ON public.email_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();