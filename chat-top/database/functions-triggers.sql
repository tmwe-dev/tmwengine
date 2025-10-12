-- =====================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- Data: 2025-10-12
-- =====================================================

-- =====================================================
-- FUNCTION: Auto-update updated_at column
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- FUNCTION: Auto-update for Chat Laboratory tables
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_chat_laboratory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPERS: RLS functions
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
  )
$$;

-- =====================================================
-- NOTE:
-- Triggers are already defined in schema-chat-tables.sql
-- This file is for future custom functions
-- =====================================================
