import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Brain } from 'lucide-react';
import { UnifiedMemoryControls } from '@/components/chat/UnifiedMemoryControls';

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type SettingsSection = 'memory' | 'general' | 'notifications' | 'integrations';

const Settings = () => {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('memory');
  const navigate = useNavigate();

  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'memory':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Gestione Memoria AI</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Queste impostazioni valgono per tutte le chat (Chat AI, Laboratory, Intranet). 
              Modifica qui i parametri globali di memoria e ottimizzazione.
            </p>
            <UnifiedMemoryControls />
          </div>
        );
      
      case 'general':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Generale</CardTitle>
              <CardDescription>Impostazioni generali dell'applicazione</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sezione in sviluppo...</p>
            </CardContent>
          </Card>
        );
      
      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notifiche</CardTitle>
              <CardDescription>Gestisci le preferenze di notifica</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sezione in sviluppo...</p>
            </CardContent>
          </Card>
        );
      
      case 'integrations':
        return (
          <Card>
            <CardHeader>
              <CardTitle>API & Integrazioni</CardTitle>
              <CardDescription>Configura integrazioni esterne</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sezione in sviluppo...</p>
            </CardContent>
          </Card>
        );
      
      
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Impostazioni</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">Seleziona Sezione:</label>
          </div>
          <Select value={selectedSection} onValueChange={(value) => setSelectedSection(value as SettingsSection)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="memory">🧠 Memoria AI</SelectItem>
              <SelectItem value="general">⚙️ Configurazione Generale</SelectItem>
              <SelectItem value="notifications">🔔 Notifiche</SelectItem>
              <SelectItem value="integrations">🔌 API & Integrazioni</SelectItem>
              
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {renderSectionContent()}
    </div>
  );
};

export default Settings;
