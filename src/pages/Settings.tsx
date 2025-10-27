import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Brain, Code, Radio } from 'lucide-react';
import { UnifiedMemoryControls } from '@/components/chat/UnifiedMemoryControls';
import { FileUploader } from '@/components/code-assistant/FileUploader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChatAgentsSection } from '@/components/settings/BarChatAgentsSection';
import { useBarChatAgents } from '@/hooks/useBarChatAgents';

type SettingsSection = 'memory' | 'general' | 'notifications' | 'integrations' | 'code-assistant' | 'voice-agents';

const Settings = () => {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('memory');
  const navigate = useNavigate();
  const barChatAgentsHook = useBarChatAgents();

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
      
      case 'code-assistant':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">AI Code Assistant</h2>
            </div>
            <FileUploader />
            <Card>
              <CardHeader>
                <CardTitle>Indexed Files</CardTitle>
                <CardDescription>Rivedi le proposte di modifica codice generate dall'AI</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/code-review')}>
                  <Code className="h-4 w-4 mr-2" />
                  View Code Review Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'voice-agents':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Agenti Vocali Bar Chat</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Configura gli agenti vocali ElevenLabs per la modalità Bar Chat. 
              Gestisci personalità, voci e parametri di generazione.
            </p>
            <BarChatAgentsSection {...barChatAgentsHook} />
          </div>
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
              <SelectItem value="code-assistant">💻 Code Assistant</SelectItem>
              <SelectItem value="voice-agents">🎙️ Agenti Vocali Bar Chat</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {renderSectionContent()}
    </div>
  );
};

export default Settings;
