import { Badge } from '@/components/ui/badge';
import { Euro, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { calculateMessageCost, formatCost, formatCostPer1000, type CostBreakdown } from '@/lib/pricing-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageCostBadgeProps {
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
}

export const MessageCostBadge = ({ 
  provider, 
  model, 
  inputTokens, 
  outputTokens 
}: MessageCostBadgeProps) => {
  const [costData, setCostData] = useState<CostBreakdown | null>(null);

  useEffect(() => {
    async function loadCost() {
      // Determina modello se non fornito
      let modelName = model || '';
      if (!modelName) {
        const providerLower = provider.toLowerCase();
        if (providerLower.includes('claude') || providerLower === 'anthropic') {
          modelName = 'claude-sonnet-4-5';
        } else if (providerLower.includes('gpt') || providerLower === 'openai' || providerLower === 'chatgpt') {
          modelName = 'gpt-5-2025-08-07';
        } else if (providerLower.includes('gemini') || providerLower === 'lovable' || providerLower === 'google') {
          modelName = 'gemini-2.5-flash';
        }
      }
      
      const cost = await calculateMessageCost(provider, modelName, inputTokens, outputTokens);
      setCostData(cost);
    }
    
    loadCost();
  }, [provider, model, inputTokens, outputTokens]);

  if (!costData) return null;

  if (costData.isFree) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs bg-green-500/20 text-green-400 border-green-500/30">
        <Euro className="h-3 w-3" />
        GRATIS
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 text-xs cursor-help">
            <Euro className="h-3 w-3" />
            {formatCost(costData.totalCost, costData.isFree)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-semibold">Costo Singolo Messaggio</div>
            <div>Input: {formatCost(costData.inputCost)} ({inputTokens.toLocaleString()} token)</div>
            <div>Output: {formatCost(costData.outputCost)} ({outputTokens.toLocaleString()} token)</div>
            <div className="border-t pt-1 mt-1">
              <strong>Per 1000 messaggi: {formatCostPer1000(costData.costPer1000Messages)}</strong>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
