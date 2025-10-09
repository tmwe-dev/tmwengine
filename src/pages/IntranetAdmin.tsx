import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Users, DoorOpen, Brain, BarChart3 } from 'lucide-react';
import { AdminRoomManager } from '@/components/intranet/admin/AdminRoomManager';
import { AdminUserManager } from '@/components/intranet/admin/AdminUserManager';
import { AdminGlobalPrompt } from '@/components/intranet/admin/AdminGlobalPrompt';
import { AdminStats } from '@/components/intranet/admin/AdminStats';

const IntranetAdmin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        navigate('/intranet');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      navigate('/intranet');
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard Amministratore</h1>
        </div>
        <p className="text-muted-foreground">
          Gestisci stanze, utenti e configurazioni AI dell'intranet
        </p>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <DoorOpen className="h-4 w-4" />
            Stanze
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            Prompt AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <AdminStats />
        </TabsContent>

        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Stanze</CardTitle>
              <CardDescription>
                Visualizza e gestisci tutte le stanze dell'intranet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminRoomManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Utenti e Ruoli</CardTitle>
              <CardDescription>
                Assegna ruoli amministrativi agli utenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminUserManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Prompt AI Globale</CardTitle>
              <CardDescription>
                Configura il prompt AI utilizzato in tutte le stanze che usano le impostazioni standard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminGlobalPrompt />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntranetAdmin;
