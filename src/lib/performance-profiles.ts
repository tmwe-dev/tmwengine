import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface OptimizationFlags {
  enableLogging?: boolean;
  useDoubleSerializat?: boolean;
  useSequentialExecution?: boolean;
  useTextResponse?: boolean;
  batchChunkSize?: number;
}

export type PerformanceProfile = Database['public']['Tables']['performance_profiles']['Row'] & {
  optimization_flags: OptimizationFlags;
};

export interface TestResult {
  id: string;
  name: string;
  testType: 'single' | 'batch';
  batchSize: number;
  executionMode: 'sequential' | 'parallel';
  avgTime: number;
  successRate: number;
  repetitions: number;
  optimizationFlags: OptimizationFlags;
}

/**
 * Salva risultato test come nuovo profilo (o aggiorna se esiste)
 */
export async function saveTestResultAsProfile(
  testResult: TestResult,
  profileName?: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const name = profileName || testResult.name;
  
  // Cerca profilo esistente con stesso user_id e profile_name
  const { data: existing } = await supabase
    .from('performance_profiles')
    .select('id, total_tests_run')
    .eq('user_id', user.id)
    .eq('profile_name', name)
    .maybeSingle();
  
  if (existing) {
    // Aggiorna profilo esistente cumulando i test
    const { data, error } = await supabase
      .from('performance_profiles')
      .update({
        optimization_flags: testResult.optimizationFlags as any,
        avg_response_time_ms: testResult.avgTime,
        success_rate: testResult.successRate,
        total_tests_run: existing.total_tests_run + testResult.repetitions,
        source_test_name: testResult.testType,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } else {
    // Inserisci nuovo profilo
    const { data, error } = await supabase
      .from('performance_profiles')
      .insert({
        user_id: user.id,
        profile_name: name,
        optimization_flags: testResult.optimizationFlags as any,
        avg_response_time_ms: testResult.avgTime,
        success_rate: testResult.successRate,
        total_tests_run: testResult.repetitions,
        source_test_name: testResult.testType,
        is_active: false
      })
      .select()
      .single();
      
    if (error) throw error;
    return data.id;
  }
}

/**
 * Carica profilo attivo corrente
 */
export async function getActiveProfile(): Promise<PerformanceProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('performance_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
    
  if (error) throw error;
  return data as PerformanceProfile | null;
}

/**
 * Carica tutti i profili dell'utente
 */
export async function getAllProfiles(): Promise<PerformanceProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('performance_profiles')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return (data || []) as PerformanceProfile[];
}

/**
 * Attiva profilo (disattiva gli altri)
 */
export async function activateProfile(profileId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Disattiva tutti
  await supabase
    .from('performance_profiles')
    .update({ is_active: false });
    
  // Attiva selezionato e incrementa usage_count
  const { data: currentProfile } = await supabase
    .from('performance_profiles')
    .select('usage_count')
    .eq('id', profileId)
    .single();
    
  const { error } = await supabase
    .from('performance_profiles')
    .update({ 
      is_active: true,
      last_used_at: new Date().toISOString(),
      usage_count: (currentProfile?.usage_count || 0) + 1
    })
    .eq('id', profileId);
    
  if (error) throw error;
}

/**
 * Disattiva profilo corrente
 */
export async function deactivateProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('performance_profiles')
    .update({ is_active: false })
    .eq('id', profileId);
    
  if (error) throw error;
}

/**
 * Elimina profilo
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('performance_profiles')
    .delete()
    .eq('id', profileId);
    
  if (error) throw error;
}

/**
 * Utility: chunk array
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
