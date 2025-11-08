import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileContent {
  path: string;
  content: string;
}

interface ScanStats {
  files_scanned: number;
  functions_found: number;
  duplicates_detected: number;
  shared_functions: number;
  heavy_functions: number;
}

interface ScanResult {
  success: boolean;
  scan_id: string;
  stats: ScanStats;
}

interface UseBrainCodeScannerReturn {
  isScanning: boolean;
  scanResult: ScanResult | null;
  startScan: (files: FileContent[], scan_type?: 'full' | 'incremental' | 'specific') => Promise<void>;
  error: string | null;
}

export function useCodeScanner(): UseBrainCodeScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startScan = async (files: FileContent[], scan_type: 'full' | 'incremental' | 'specific' = 'full') => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      console.log(`🔍 Starting ${scan_type} scan for ${files.length} files`);

      const { data, error: functionError } = await supabase.functions.invoke('brain-code-scanner', {
        body: {
          files,
          scan_type
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Scan failed');
      }

      console.log('✅ Scan completed:', data.stats);

      setScanResult(data as ScanResult);

      toast({
        title: 'Scan completato',
        description: `${data.stats.functions_found} funzioni analizzate, ${data.stats.duplicates_detected} duplicati rilevati`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Scan error:', errorMessage);
      setError(errorMessage);

      toast({
        title: 'Errore durante lo scan',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanResult,
    startScan,
    error
  };
}
