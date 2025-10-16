import { supabase } from '@/integrations/supabase/client';
import type { Test, TestSuite } from './test-types';

// Test performance chat
const chatPerformanceTests: Test[] = [
  {
    name: "Invio messaggio singolo",
    description: "Latenza insert messaggio",
    expected_time_ms: 150,
    test: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      return await supabase
        .from('intranet_messages')
        .insert({
          room_id: rooms[0].id,
          user_id: user.id,
          content: '[TEST] Performance test message'
        })
        .select()
        .single();
    }
  },
  {
    name: "Carica storico messaggi (50)",
    description: "Load messaggi con JOIN user",
    expected_time_ms: 150,
    test: async () => {
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      return await supabase
        .from('intranet_messages')
        .select('*, user_profiles(*)')
        .eq('room_id', rooms[0].id)
        .order('created_at', { ascending: false })
        .limit(50);
    }
  },
  {
    name: "Conteggio messaggi non letti",
    description: "Performance conteggio messaggi",
    expected_time_ms: 80,
    test: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      return await supabase
        .from('intranet_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', rooms[0].id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    }
  }
];

// Test sistema presenza
const presenceTests: Test[] = [
  {
    name: "Carica membri stanza",
    description: "Performance load membri con profili",
    expected_time_ms: 100,
    test: async () => {
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      return await supabase
        .from('intranet_room_members')
        .select('*, user_profiles(*)')
        .eq('room_id', rooms[0].id);
    }
  },
  {
    name: "Verifica accesso utente",
    description: "Check membership performance",
    expected_time_ms: 50,
    test: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      return await supabase
        .from('intranet_room_members')
        .select('id')
        .eq('room_id', rooms[0].id)
        .eq('user_id', user.id)
        .maybeSingle();
    }
  }
];

// Test gestione stanze
const roomManagementTests: Test[] = [
  {
    name: "Lista stanze utente",
    description: "Performance caricamento stanze",
    expected_time_ms: 120,
    test: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      return await supabase
        .from('intranet_rooms')
        .select('*')
        .order('created_at', { ascending: false });
    }
  },
  {
    name: "Dettagli stanza completi",
    description: "Load stanza con membri e ultimo messaggio",
    expected_time_ms: 200,
    test: async () => {
      const { data: rooms } = await supabase
        .from('intranet_rooms')
        .select('id')
        .limit(1);
      
      if (!rooms || rooms.length === 0) throw new Error('No rooms available');
      
      const [roomData, membersData, lastMessage] = await Promise.all([
        supabase.from('intranet_rooms').select('*').eq('id', rooms[0].id).single(),
        supabase.from('intranet_room_members').select('*, user_profiles(*)').eq('room_id', rooms[0].id),
        supabase.from('intranet_messages').select('*').eq('room_id', rooms[0].id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]);
      
      return { roomData, membersData, lastMessage };
    }
  }
];

export const intranetTestSuites: TestSuite[] = [
  {
    name: "Chat Performance",
    description: "Test invio, ricezione e latenza messaggi",
    category: 'intranet',
    tests: chatPerformanceTests
  },
  {
    name: "Presence System",
    description: "Test tracking presenza e membri",
    category: 'intranet',
    tests: presenceTests
  },
  {
    name: "Room Management",
    description: "Test gestione e navigazione stanze",
    category: 'intranet',
    tests: roomManagementTests
  }
];
