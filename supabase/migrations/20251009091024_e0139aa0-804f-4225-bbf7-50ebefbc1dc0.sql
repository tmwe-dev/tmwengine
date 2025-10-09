-- CRITICAL FIX: Remove Albert AI completely from database
-- Albert caused "Database error finding users" when calling listUsers()
-- Albert should be handled in application code, not as a real database user

-- Delete Albert from user_profiles (this will cascade if needed)
DELETE FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Delete Albert from auth.users  
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';