import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrainScan {
  id: string;
  scan_type: string;
  files_scanned: number;
  functions_found: number;
  duplicates_detected: number;
  shared_functions: number;
  heavy_functions: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  user_id: string;
}

export interface FunctionAnalysis {
  id: string;
  file_path: string;
  function_name: string;
  function_signature: string;
  lines_of_code: number;
  cyclomatic_complexity: number;
  dependencies: string[];
  is_duplicate: boolean;
  duplicate_of: string | null;
  is_shared: boolean;
  shared_in_files: string[] | null;
  share_count: number;
  is_heavy: boolean;
  scan_id: string;
  created_at: string;
}

export function useBrainScans() {
  return useQuery({
    queryKey: ['brain-scans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_code_scans')
        .select('*')
        .order('started_at', { ascending: false }) as any;

      if (error) throw error;
      return data as BrainScan[];
    }
  });
}

export function useBrainFunctions(scanId: string | null) {
  return useQuery({
    queryKey: ['brain-functions', scanId],
    queryFn: async () => {
      if (!scanId) return [];

      const { data, error } = await supabase
        .from('brain_function_analysis')
        .select('*')
        .eq('scan_id', scanId)
        .order('file_path', { ascending: true }) as any;

      if (error) throw error;
      return data as FunctionAnalysis[];
    },
    enabled: !!scanId
  });
}
