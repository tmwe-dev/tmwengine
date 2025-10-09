import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export const AccessSystemDebugger = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults: TestResult[] = [];

    // Test 1: Verifica utente autenticato
    if (currentUser) {
      testResults.push({
        name: 'Autenticazione',
        status: 'success',
        message: `Utente autenticato: ${currentUser.email}`
      });
    } else {
      testResults.push({
        name: 'Autenticazione',
        status: 'error',
        message: 'Utente non autenticato'
      });
      setResults(testResults);
      setTesting(false);
      return;
    }

    // Test 2: Carica stanze
    const { data: rooms, error: roomsError } = await supabase
      .from('intranet_rooms')
      .select('*');

    if (roomsError) {
      testResults.push({
        name: 'Caricamento Stanze',
        status: 'error',
        message: `Errore: ${roomsError.message}`
      });
    } else {
      testResults.push({
        name: 'Caricamento Stanze',
        status: 'success',
        message: `Trovate ${rooms?.length || 0} stanze`
      });

      // Test 3: Verifica access_type per ogni stanza
      if (rooms) {
        const publicRooms = rooms.filter(r => r.access_type === 'public');
        const requestRooms = rooms.filter(r => r.access_type === 'request');
        const privateRooms = rooms.filter(r => r.access_type === 'private');

        testResults.push({
          name: 'Tipi di Accesso',
          status: 'success',
          message: `Pubbliche: ${publicRooms.length}, Su Richiesta: ${requestRooms.length}, Private: ${privateRooms.length}`
        });

        // Test 4: Verifica membership per ogni stanza
        for (const room of rooms) {
          const { data: member } = await supabase
            .from('intranet_room_members')
            .select('id')
            .eq('room_id', room.id)
            .eq('user_id', currentUser.id)
            .maybeSingle();

          const isMember = !!member;
          const canAccess = room.access_type === 'public' || isMember;

          testResults.push({
            name: `Stanza: ${room.name}`,
            status: canAccess ? 'success' : (room.access_type === 'public' ? 'warning' : 'error'),
            message: `Tipo: ${room.access_type}, Membro: ${isMember ? 'Sì' : 'No'}, Accesso: ${canAccess ? 'Sì' : 'No'}`
          });
        }
      }
    }

    // Test 5: Verifica richieste pendenti
    const { data: myRequests } = await supabase
      .from('intranet_room_access_requests')
      .select('*')
      .eq('user_id', currentUser.id);

    if (myRequests) {
      const pendingCount = myRequests.filter(r => r.status === 'pending').length;
      testResults.push({
        name: 'Richieste Pendenti',
        status: pendingCount >= 3 ? 'warning' : 'success',
        message: `${pendingCount}/3 richieste pendenti`
      });
    }

    // Test 6: Verifica trigger auto_approve
    const { data: publicRoomRequests } = await supabase
      .from('intranet_room_access_requests')
      .select(`
        *,
        intranet_rooms!inner(access_type)
      `)
      .eq('user_id', currentUser.id);

    if (publicRoomRequests) {
      const publicPending = publicRoomRequests.filter(
        r => r.intranet_rooms?.access_type === 'public' && r.status === 'pending'
      );

      if (publicPending.length > 0) {
        testResults.push({
          name: 'Trigger Auto-Approve',
          status: 'warning',
          message: `${publicPending.length} richieste per stanze pubbliche ancora pending (dovrebbero essere auto-approvate)`
        });
      } else {
        testResults.push({
          name: 'Trigger Auto-Approve',
          status: 'success',
          message: 'Nessuna richiesta pubblica pendente'
        });
      }
    }

    setResults(testResults);
    setTesting(false);
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ERRORE</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">ATTENZIONE</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Debug Sistema Accessi</span>
          <Button onClick={runTests} disabled={testing}>
            {testing ? 'Testing...' : 'Esegui Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.length === 0 && !testing && (
            <p className="text-sm text-muted-foreground">Clicca "Esegui Test" per verificare il sistema</p>
          )}
          
          {testing && (
            <p className="text-sm text-muted-foreground">Test in corso...</p>
          )}

          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              {getIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{result.name}</span>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-xs text-muted-foreground">{result.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
