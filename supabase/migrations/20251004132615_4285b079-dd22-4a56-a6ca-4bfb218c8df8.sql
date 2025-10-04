-- Enable realtime for email_messages table
ALTER TABLE public.email_messages REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;