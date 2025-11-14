import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';
import { usePagePromptCount } from '@/hooks/usePagePromptCount';

interface UnifiedAICommunicationBadgeProps {
  pageRoute: string;
}

export const UnifiedAICommunicationBadge = ({ pageRoute }: UnifiedAICommunicationBadgeProps) => {
  const navigate = useNavigate();
  const { count, loading } = usePagePromptCount(pageRoute);

  const handleClick = () => {
    navigate(`/ai-communication-hub?page=${encodeURIComponent(pageRoute)}`);
  };

  return (
    <div className="flex items-center gap-2">
      <GlobalAIAgentSelector />
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="relative"
        title={`Gestisci prompt per ${pageRoute}`}
      >
        <Brain className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Prompt</span>
        {!loading && count > 0 && (
          <Badge 
            variant="secondary" 
            className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5"
          >
            {count}
          </Badge>
        )}
      </Button>
    </div>
  );
};
