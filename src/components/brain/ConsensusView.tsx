import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import albertGif from '@/assets/albert-mining.gif';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import archimedeGif from '@/assets/archimede-stones.gif';

interface ConsensusViewProps {
  tasks: any[];
  rounds: number;
}

export function ConsensusView({ tasks, rounds }: ConsensusViewProps) {
  const lastRoundTasks = tasks.filter(t => t.round_number === rounds && t.status === 'completed');

  const agentConfig = {
    gemini: { name: 'Pitagora', avatar: pitagoraGif },
    chatgpt: { name: 'Albert', avatar: albertGif },
    claude: { name: 'Archimede', avatar: archimedeGif }
  };

  // Extract common keywords from final responses
  const extractKeywords = () => {
    const allText = lastRoundTasks
      .map(t => t.output_data?.content || '')
      .join(' ')
      .toLowerCase();

    const words = allText.split(/\W+/).filter(w => w.length > 5);
    const wordCounts = new Map<string, number>();
    
    words.forEach(w => {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    });

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  const commonKeywords = extractKeywords();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Proposte Finali</h3>
      
      {lastRoundTasks.map(task => (
        <div key={task.id} className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={agentConfig[task.assigned_agent as keyof typeof agentConfig]?.avatar} />
            </Avatar>
            <span className="font-semibold">
              {agentConfig[task.assigned_agent as keyof typeof agentConfig]?.name}
            </span>
          </div>
          <div className="text-sm prose dark:prose-invert max-w-none">
            <ReactMarkdown>{task.output_data?.content as string}</ReactMarkdown>
          </div>
        </div>
      ))}

      {commonKeywords.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <h4 className="font-semibold mb-2">🔑 Punti di Accordo</h4>
          <div className="flex flex-wrap gap-2">
            {commonKeywords.map(keyword => (
              <Badge key={keyword} variant="secondary">{keyword}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
