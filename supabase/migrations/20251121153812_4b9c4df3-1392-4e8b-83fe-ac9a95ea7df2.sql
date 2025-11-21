-- Add Thai language to system_languages with native_name
INSERT INTO system_languages (code, name, native_name, flag, is_active, order_index)
VALUES ('th', 'Thai', 'ไทย', '🇹🇭', true, 6)
ON CONFLICT (code) DO NOTHING;