-- Enable real-time for chat_laboratory_messages table
-- This ensures the frontend receives INSERT events with full message data

-- Set REPLICA IDENTITY FULL to receive complete row data
ALTER TABLE chat_laboratory_messages REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE chat_laboratory_messages;