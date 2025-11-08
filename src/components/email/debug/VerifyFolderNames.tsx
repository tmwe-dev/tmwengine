import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function VerifyFolderNames() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const verifyFolders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-folder-names', {
        body: {}
      });

      if (error) throw error;
      setResult(data);
    } catch (error: any) {
      console.error('Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>🔍 Verifica Nomi Cartelle Server</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={verifyFolders} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verifica Nomi sul Server TMWE
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
