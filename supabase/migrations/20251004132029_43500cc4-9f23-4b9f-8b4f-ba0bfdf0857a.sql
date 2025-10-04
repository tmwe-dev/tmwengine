-- Add unique constraint on message_id to allow upsert operations
ALTER TABLE public.email_messages 
ADD CONSTRAINT email_messages_message_id_unique UNIQUE (message_id);