import { cn } from '@/lib/utils';
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';

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

interface AIAgentSelectorProps {
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
}

export const AIAgentSelector = ({ selectedAgent, onAgentChange }: AIAgentSelectorProps) => {
  return (
    <div className="flex gap-3 items-center">
      <span className="text-sm font-semibold text-white/90">Agente AI:</span>
      <div className="flex gap-2">
        {AI_AGENTS.map(agent => (
          <button
            key={agent.id}
            onClick={() => onAgentChange(agent.id)}
            className={cn(
              "relative w-16 h-16 rounded-full overflow-hidden transition-all duration-300",
              "border-2 hover:scale-110",
              selectedAgent === agent.id 
                ? "border-primary shadow-lg shadow-primary/50 scale-105" 
                : "border-white/20 grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
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
    </div>
  );
};

export const getModelFromAgentId = (agentId: string): string => {
  const agent = AI_AGENTS.find(a => a.id === agentId);
  return agent?.model || 'google/gemini-2.5-flash';
};
