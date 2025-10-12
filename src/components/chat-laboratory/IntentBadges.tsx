import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  MessageSquare, 
  HelpCircle, 
  FileText, 
  Merge, 
  Vote, 
  FileCheck,
  Settings
} from "lucide-react";

interface Props {
  intents: string[];
}

const intentConfig = {
  Proposal: { icon: Lightbulb, color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  Critique: { icon: MessageSquare, color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  Question: { icon: HelpCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  Evidence: { icon: FileText, color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  Merge: { icon: Merge, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' },
  Vote: { icon: Vote, color: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
  Summarize: { icon: FileCheck, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' },
  Meta: { icon: Settings, color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
};

export const IntentBadges = ({ intents }: Props) => {
  if (!intents || intents.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {intents.map((intent) => {
        const config = intentConfig[intent as keyof typeof intentConfig];
        if (!config) return null;

        const Icon = config.icon;
        
        return (
          <Badge 
            key={intent} 
            variant="outline" 
            className={`${config.color} text-xs`}
          >
            <Icon className="w-3 h-3 mr-1" />
            {intent}
          </Badge>
        );
      })}
    </div>
  );
};