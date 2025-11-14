import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, MessageSquare, Mic, Volume2 } from 'lucide-react';
import { AIAgentsPromptsTab } from '@/components/ai-communication-hub/AIAgentsPromptsTab';
import { VoiceAgentsTab } from '@/components/ai-communication-hub/VoiceAgentsTab';
import { TTSVoicesTab } from '@/components/ai-communication-hub/TTSVoicesTab';
import { AudioInputTab } from '@/components/ai-communication-hub/AudioInputTab';
import { useSearchParams } from 'react-router-dom';

const AICommunicationHub = () => {
  const [searchParams] = useSearchParams();
  const pageParam = searchParams.get('page');
  const [activeTab, setActiveTab] = useState('ai-prompts');

  useEffect(() => {
    // Se c'è un parametro ?page=, apri tab AI & Prompts
    if (pageParam) {
      setActiveTab('ai-prompts');
    }
  }, [pageParam]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Communication Hub</h1>
          <p className="text-muted-foreground">
            Centro di controllo unificato per AI, prompt, voci e audio
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="ai-prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI & Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="voice-agents" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Voice Agents</span>
            </TabsTrigger>
            <TabsTrigger value="tts-voices" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">TTS Voices</span>
            </TabsTrigger>
            <TabsTrigger value="audio-input" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Audio Input</span>
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="ai-prompts" className="mt-0">
              <AIAgentsPromptsTab initialPageFilter={pageParam || undefined} />
            </TabsContent>

            <TabsContent value="voice-agents" className="mt-0">
              <VoiceAgentsTab />
            </TabsContent>

            <TabsContent value="tts-voices" className="mt-0">
              <TTSVoicesTab />
            </TabsContent>

            <TabsContent value="audio-input" className="mt-0">
              <AudioInputTab />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};

export default AICommunicationHub;
