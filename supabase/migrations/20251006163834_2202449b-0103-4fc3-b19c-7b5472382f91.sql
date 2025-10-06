-- Create intranet chat rooms table
CREATE TABLE public.intranet_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intranet messages table
CREATE TABLE public.intranet_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.intranet_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image'
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intranet room members table
CREATE TABLE public.intranet_room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.intranet_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.intranet_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intranet_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intranet_room_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms they are members of"
ON public.intranet_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_room_members
    WHERE room_id = intranet_rooms.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create rooms"
ON public.intranet_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
ON public.intranet_rooms
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their rooms"
ON public.intranet_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_room_members
    WHERE room_id = intranet_messages.room_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their rooms"
ON public.intranet_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.intranet_room_members
    WHERE room_id = intranet_messages.room_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies for room members
CREATE POLICY "Users can view members of their rooms"
ON public.intranet_room_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_room_members irm
    WHERE irm.room_id = intranet_room_members.room_id
    AND irm.user_id = auth.uid()
  )
);

CREATE POLICY "Room creators can add members"
ON public.intranet_room_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.intranet_rooms
    WHERE id = room_id
    AND created_by = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_intranet_messages_room_id ON public.intranet_messages(room_id);
CREATE INDEX idx_intranet_messages_created_at ON public.intranet_messages(created_at);
CREATE INDEX idx_intranet_room_members_room_id ON public.intranet_room_members(room_id);
CREATE INDEX idx_intranet_room_members_user_id ON public.intranet_room_members(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_intranet_rooms_updated_at
BEFORE UPDATE ON public.intranet_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_room_members;

-- Set replica identity for realtime
ALTER TABLE public.intranet_messages REPLICA IDENTITY FULL;
ALTER TABLE public.intranet_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.intranet_room_members REPLICA IDENTITY FULL;