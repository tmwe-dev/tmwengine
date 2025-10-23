-- Fix conversazione corrente con mode errato
UPDATE chat_laboratory_bar_mode 
SET mode = 'bar' 
WHERE conversation_id = 'b22051c8-dfaa-456c-82a7-6e62bab8e631' 
AND mode = 'laboratory';