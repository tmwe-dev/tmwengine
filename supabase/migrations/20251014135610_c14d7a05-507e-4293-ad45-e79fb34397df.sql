-- Add performance indexes for email_messages table
-- These indexes will significantly improve query performance for email operations

-- Index for querying emails by sender (EmailSenders.tsx uses this heavily)
CREATE INDEX IF NOT EXISTS idx_email_messages_from_email 
ON email_messages(from_email);

-- Index for querying emails by folder (filtering by INBOX, Sent, etc.)
CREATE INDEX IF NOT EXISTS idx_email_messages_cartella 
ON email_messages(cartella);

-- Index for querying emails by user (filtering user's emails)
CREATE INDEX IF NOT EXISTS idx_email_messages_user_email 
ON email_messages(user_email);

-- Index for querying emails by reception date (sorting by date DESC)
CREATE INDEX IF NOT EXISTS idx_email_messages_data_ricezione 
ON email_messages(data_ricezione DESC);

-- Composite index for common query pattern: user emails in specific folder
CREATE INDEX IF NOT EXISTS idx_email_messages_user_cartella 
ON email_messages(user_email, cartella);

-- Composite index for sender statistics queries
CREATE INDEX IF NOT EXISTS idx_email_messages_from_date 
ON email_messages(from_email, data_ricezione DESC);