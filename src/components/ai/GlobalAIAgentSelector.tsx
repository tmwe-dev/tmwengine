import { cn } from '@/lib/utils';
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';
import { useGlobalAIAgent } from '@/hooks/useGlobalAIAgent';

interface AIAgent {
  id: 'gpt' | 'gemini' | 'claude';
  name: string;
  model: string;
  gif: string;
  staticFrame: string;
  description: string;
}

const AI_AGENTS: AIAgent[] = [
  {
    id: 'gpt',
    name: 'Albert (GPT-5)',
    model: 'openai/gpt-5-mini',
    gif: albertGif,
    staticFrame: albertStatic,
    description: 'Versatile e preciso'
  },
  {
    id: 'gemini',
    name: 'Pitagora (Gemini)',
    model: 'google/gemini-2.5-flash',
    gif: pitagoraGif,
    staticFrame: pitagoraStatic,
    description: 'Veloce ed efficiente (Default)'
  },
  {
    id: 'claude',
    name: 'Archimede (Claude)',
    model: 'anthropic/claude-3-5-sonnet',
    gif: archimedeGif,
    staticFrame: archimedeStatic,
    description: 'Analisi approfondita'
  }
];

export const GlobalAIAgentSelector = () => {
  const { selectedAgent, setSelectedAgent } = useGlobalAIAgent();

  return (
    <div className="flex gap-2">
      {AI_AGENTS.map(agent => (
        <button
          key={agent.id}
          onClick={() => setSelectedAgent(agent.id)}
          className={cn(
            "relative w-12 h-12 rounded-full overflow-hidden transition-all duration-300",
            "hover:scale-110",
            selectedAgent === agent.id 
              ? "shadow-lg scale-105" 
              : "grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
          )}
          title={`${agent.name}\n${agent.description}\nModello: ${agent.model}`}
        >
          <img 
            src={selectedAgent === agent.id ? agent.gif : agent.staticFrame}
            alt={agent.name}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
};

export const getModelFromAgentId = (agentId: string): string => {
  const agent = AI_AGENTS.find(a => a.id === agentId);
  return agent?.model || 'google/gemini-2.5-flash';
};
