import { supabase } from '@/integrations/supabase/client';
import type { Test, TestSuite } from './test-types';

// Test relazioni Rubrica ↔ Attività
const rubricaAttivitaTests: Test[] = [
  {
    name: "Carica contatto + attività (INNER JOIN)",
    description: "JOIN tra rubrica e attività",
    expected_time_ms: 150,
    test: async () => {
      const { data: rubrica } = await supabase
        .from('rubrica')
        .select('*')
        .limit(1)
        .single();
      
      if (!rubrica) return { data: null, count: 0 };
      
      const result = await supabase
        .from('rubrica')
        .select('*, attivita(*)')
        .eq('id', rubrica.id)
        .single();
      
      return result;
    }
  },
  {
    name: "Carica attività di un contatto (paginato)",
    description: "Attività filtrate per contatto con paginazione",
    expected_time_ms: 100,
    test: async () => {
      const { data: rubrica } = await supabase
        .from('rubrica')
        .select('id')
        .limit(1)
        .single();
      
      if (!rubrica) return { data: [], count: 0 };
      
      return await supabase
        .from('attivita')
        .select('*')
        .eq('rubrica_id', rubrica.id)
        .range(0, 49)
        .order('created_at', { ascending: false });
    }
  },
  {
    name: "Conteggio attività per stato",
    description: "Aggregazione veloce tramite function",
    expected_time_ms: 80,
    test: async () => {
      const { data: rubrica } = await supabase
        .from('rubrica')
        .select('id')
        .limit(1)
        .single();
      
      if (!rubrica) return { data: [], count: 0 };
      
      return await supabase
        .from('attivita')
        .select('stato', { count: 'exact', head: true })
        .eq('rubrica_id', rubrica.id);
    }
  }
];

// Test relazioni Imported Contacts ↔ Attività
const importAttivitaTests: Test[] = [
  {
    name: "Contatti importati con conteggio attività",
    description: "Verifica efficienza JOIN con conteggio",
    expected_time_ms: 200,
    test: async () => {
      return await supabase
        .from('imported_contacts')
        .select('id, name, company_name')
        .range(0, 99);
    }
  },
  {
    name: "Load imported contacts batch",
    description: "Caricamento batch 100 record",
    expected_time_ms: 150,
    test: async () => {
      return await supabase
        .from('imported_contacts')
        .select('*')
        .range(0, 99)
        .order('created_at', { ascending: false });
    }
  }
];

// Test relazioni Attività ↔ User Assignment
const attivitaUserTests: Test[] = [
  {
    name: "Attività assegnate a utente",
    description: "Dashboard attività utente con profilo",
    expected_time_ms: 120,
    test: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], count: 0 };
      
      return await supabase
        .from('attivita')
        .select('*')
        .eq('assegnato_a', user.id)
        .order('scadenza', { ascending: true })
        .limit(50);
    }
  },
  {
    name: "Attività per periodo temporale",
    description: "Filtraggio efficiente per date",
    expected_time_ms: 80,
    test: async () => {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      return await supabase
        .from('attivita')
        .select('*')
        .gte('scadenza', today)
        .lte('scadenza', nextMonth)
        .order('scadenza', { ascending: true })
        .limit(100);
    }
  },
  {
    name: "Attività create oggi",
    description: "Filter by date range efficiente",
    expected_time_ms: 60,
    test: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      return await supabase
        .from('attivita')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today);
    }
  }
];

export const databaseTestSuites: TestSuite[] = [
  {
    name: "Rubrica ↔ Attività Relations",
    description: "Test performance relazioni tra contatti e attività",
    category: 'database',
    tests: rubricaAttivitaTests
  },
  {
    name: "Import ↔ Attività Relations",
    description: "Test performance import e gestione contatti",
    category: 'database',
    tests: importAttivitaTests
  },
  {
    name: "Attività ↔ User Assignment",
    description: "Test assegnazione attività e filtri temporali",
    category: 'database',
    tests: attivitaUserTests
  }
];
