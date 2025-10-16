import { supabase } from '@/integrations/supabase/client';
import type { Test, TestSuite } from './test-types';

// Test microfono e audio
const microphoneTests: Test[] = [
  {
    name: "Accesso microfono",
    description: "Tempo permesso microfono",
    expected_time_ms: 500,
    test: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return { success: true, devices: stream.getTracks().length };
      } catch (error) {
        throw new Error(`Microfono non disponibile: ${error}`);
      }
    }
  },
  {
    name: "Lista dispositivi audio",
    description: "Enumerate audio devices",
    expected_time_ms: 200,
    test: async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      return { 
        total: devices.length, 
        audioInputs: audioInputs.length,
        devices: audioInputs.map(d => ({ label: d.label, deviceId: d.deviceId }))
      };
    }
  }
];

// Test AI Agents
const agentResponseTests: Test[] = [
  {
    name: "Carica conversazione + messaggi",
    description: "Performance load conversazione lab",
    expected_time_ms: 150,
    test: async () => {
      const { data: conversations } = await supabase
        .from('chat_laboratory_conversations')
        .select('id')
        .limit(1);
      
      if (!conversations || conversations.length === 0) {
        return { data: null, count: 0 };
      }
      
      const [conversationData, messagesData] = await Promise.all([
        supabase.from('chat_laboratory_conversations').select('*').eq('id', conversations[0].id).single(),
        supabase.from('chat_laboratory_messages').select('*').eq('conversation_id', conversations[0].id).order('created_at', { ascending: false }).limit(50)
      ]);
      
      return { conversationData, messagesData };
    }
  },
  {
    name: "Carica participants attivi",
    description: "Performance load participants",
    expected_time_ms: 100,
    test: async () => {
      const { data: conversations } = await supabase
        .from('chat_laboratory_conversations')
        .select('id')
        .limit(1);
      
      if (!conversations || conversations.length === 0) {
        return { data: [], count: 0 };
      }
      
      return await supabase
        .from('chat_laboratory_participants')
        .select('*')
        .eq('conversation_id', conversations[0].id)
        .eq('is_active', true);
    }
  },
  {
    name: "Conteggio messaggi per sender",
    description: "Aggregazione messaggi per tipo",
    expected_time_ms: 80,
    test: async () => {
      const { data: conversations } = await supabase
        .from('chat_laboratory_conversations')
        .select('id')
        .limit(1);
      
      if (!conversations || conversations.length === 0) {
        return { data: [], count: 0 };
      }
      
      return await supabase
        .from('chat_laboratory_messages')
        .select('sender_type', { count: 'exact', head: true })
        .eq('conversation_id', conversations[0].id);
    }
  }
];

// Test orchestratore
const orchestratorTests: Test[] = [
  {
    name: "Aggiorna configurazione conversazione",
    description: "Performance update settings",
    expected_time_ms: 100,
    test: async () => {
      const { data: conversations } = await supabase
        .from('chat_laboratory_conversations')
        .select('id')
        .limit(1);
      
      if (!conversations || conversations.length === 0) {
        return { data: null, count: 0 };
      }
      
      return await supabase
        .from('chat_laboratory_conversations')
        .update({ pause_between_agents_ms: 800 })
        .eq('id', conversations[0].id)
        .select()
        .single();
    }
  },
  {
    name: "Toggle participant attivo",
    description: "Performance activation toggle",
    expected_time_ms: 80,
    test: async () => {
      const { data: participants } = await supabase
        .from('chat_laboratory_participants')
        .select('id, is_active')
        .limit(1);
      
      if (!participants || participants.length === 0) {
        return { data: null, count: 0 };
      }
      
      return await supabase
        .from('chat_laboratory_participants')
        .update({ is_active: !participants[0].is_active })
        .eq('id', participants[0].id)
        .select()
        .single();
    }
  }
];

// Test prompt sections
const promptSectionTests: Test[] = [
  {
    name: "Carica prompt sections attive",
    description: "Performance load active sections",
    expected_time_ms: 100,
    test: async () => {
      return await supabase
        .from('chat_laboratory_prompt_sections')
        .select('*')
        .eq('is_active', true)
        .order('order_priority', { ascending: true });
    }
  },
  {
    name: "Filtra sections per topic",
    description: "Performance topic filtering",
    expected_time_ms: 80,
    test: async () => {
      return await supabase
        .from('chat_laboratory_prompt_sections')
        .select('*')
        .contains('topic_tags', ['general'])
        .eq('is_active', true);
    }
  }
];

export const laboratoryTestSuites: TestSuite[] = [
  {
    name: "Microphone & Audio",
    description: "Test accesso microfono e dispositivi audio",
    category: 'laboratory',
    tests: microphoneTests
  },
  {
    name: "AI Agents Response",
    description: "Test performance caricamento conversazioni e messaggi",
    category: 'laboratory',
    tests: agentResponseTests
  },
  {
    name: "Orchestrator Logic",
    description: "Test configurazione e gestione orchestratore",
    category: 'laboratory',
    tests: orchestratorTests
  },
  {
    name: "Prompt Sections",
    description: "Test caricamento e filtraggio sezioni prompt",
    category: 'laboratory',
    tests: promptSectionTests
  }
];
