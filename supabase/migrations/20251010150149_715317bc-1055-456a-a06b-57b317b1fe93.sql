-- Migration: Standardizza nomi provider AI
-- Converti provider vecchi in nuovi standard

UPDATE config_ai 
SET provider = 'openai' 
WHERE provider = 'chatgpt';

UPDATE config_ai 
SET provider = 'anthropic' 
WHERE provider = 'claude';

UPDATE config_ai 
SET provider = 'google' 
WHERE provider = 'gemini';