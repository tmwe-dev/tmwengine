import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Users, MessageSquare, Sparkles } from 'lucide-react';
import { AdminRoomManager } from '@/components/intranet/admin/AdminRoomManager';
import { AdminUserManager } from '@/components/intranet/admin/AdminUserManager';
import { AdminGlobalPrompt } from '@/components/intranet/admin/AdminGlobalPrompt';
import { AdminStats } from '@/components/intranet/admin/AdminStats';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';

const IntranetAdmin = () => {
  // SVILUPPO: Controlli di autorizzazione disabilitati
  console.log('🚧 Admin panel in modalità sviluppo - accesso libero');

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
            <Sparkles className="h-4 w-4" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Stanze
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
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
