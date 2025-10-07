-- Assegna ruolo admin all'utente TMWE sincronizzato
INSERT INTO public.user_roles (user_id, role)
VALUES ('dc50c3d3-e88a-4fd6-8102-b7736935a482', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;