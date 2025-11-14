import { BarChatAgentsSection } from '@/components/settings/BarChatAgentsSection';
import { useBarChatAgents } from '@/hooks/useBarChatAgents';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio } from 'lucide-react';

export const VoiceAgentsTab = () => {
  const barChatAgentsHook = useBarChatAgents();

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Voice Agents (ElevenLabs)</CardTitle>
              <CardDescription className="mt-1">
                Configura gli agenti vocali conversazionali per Bar Chat, Radio Chat e altre modalità vocali
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <BarChatAgentsSection {...barChatAgentsHook} />
    </div>
  );
};
