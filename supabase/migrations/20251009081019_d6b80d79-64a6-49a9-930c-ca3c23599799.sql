-- Passo 1: Enums e Tabelle per Sistema Accesso Stanze

-- Enum per tipo di accesso alle stanze
CREATE TYPE room_access_type AS ENUM ('public', 'request', 'private');

-- Enum per stato disponibilità utente
CREATE TYPE user_availability_status AS ENUM ('online', 'busy', 'dnd', 'offline');

-- Enum per stato richieste accesso
CREATE TYPE access_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Aggiungi colonna access_type alla tabella intranet_rooms
ALTER TABLE public.intranet_rooms 
ADD COLUMN access_type room_access_type NOT NULL DEFAULT 'public';

-- Aggiungi indice per performance
CREATE INDEX idx_intranet_rooms_access_type ON public.intranet_rooms(access_type);

-- Aggiungi campi di disponibilità a user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN availability_status user_availability_status NOT NULL DEFAULT 'online',
ADD COLUMN status_message text;

-- Crea tabella per richieste di accesso alle stanze
CREATE TABLE public.intranet_room_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.intranet_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status access_request_status NOT NULL DEFAULT 'pending',
  message text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Indici per performance
CREATE INDEX idx_room_requests_room ON public.intranet_room_access_requests(room_id);
CREATE INDEX idx_room_requests_user ON public.intranet_room_access_requests(user_id);
CREATE INDEX idx_room_requests_status ON public.intranet_room_access_requests(status);

-- Enable RLS
ALTER TABLE public.intranet_room_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies per intranet_room_access_requests

-- Gli utenti possono vedere le proprie richieste
CREATE POLICY "Users can view their own requests"
  ON public.intranet_room_access_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- I creatori delle stanze possono vedere tutte le richieste per le loro stanze
CREATE POLICY "Room creators can view requests for their rooms"
  ON public.intranet_room_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intranet_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

-- Gli admin possono vedere tutte le richieste
CREATE POLICY "Admins can view all requests"
  ON public.intranet_room_access_requests
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Gli utenti possono creare richieste di accesso
CREATE POLICY "Users can create access requests"
  ON public.intranet_room_access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- I creatori delle stanze possono aggiornare le richieste (approvare/rifiutare)
CREATE POLICY "Room creators can update requests for their rooms"
  ON public.intranet_room_access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intranet_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

-- Gli admin possono aggiornare tutte le richieste
CREATE POLICY "Admins can update all requests"
  ON public.intranet_room_access_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Trigger per updated_at
CREATE TRIGGER trigger_update_room_requests_updated_at
  BEFORE UPDATE ON public.intranet_room_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aggiorna le policy RLS per intranet_rooms: tutti possono vedere tutte le stanze
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.intranet_rooms;

CREATE POLICY "All authenticated users can view all rooms"
  ON public.intranet_rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- Abilita realtime per la nuova tabella
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_room_access_requests;