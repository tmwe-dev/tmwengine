import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, FileCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConvergenceMetrics {
  A: number;
  C: number;
  P: number;
  level: 'diverging' | 'converging' | 'lock';
  details: {
    totalMessages: number;
    proposalCount: number;
    critiqueCount: number;
    voteCount: number;
    agreementVotes: number;
    totalVotes: number;
    summaryAvailable: boolean;
  };
}

interface Props {
  conversationId: string;
  refreshTrigger?: number;
}

export const ConvergenceIndicator = ({ conversationId, refreshTrigger }: Props) => {
  const [metrics, setMetrics] = useState<ConvergenceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateConvergence = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-basic-convergence', {
        body: { conversationId, windowSize: 20 }
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error calculating convergence:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateConvergence();
  }, [conversationId, refreshTrigger]);

  if (!metrics) return null;

  const getLevelColor = () => {
    switch (metrics.level) {
      case 'lock': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'converging': return 'bg-sky-500/20 text-sky-400 border-sky-500/50';
      case 'diverging': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    }
  };

  const getLevelIcon = () => {
    switch (metrics.level) {
      case 'lock': return <Lock className="w-4 h-4" />;
      case 'converging': return <TrendingUp className="w-4 h-4" />;
      case 'diverging': return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Card className="p-4 bg-background/50 backdrop-blur-sm border-border/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Convergence Analysis
          </h3>
          <Badge variant="outline" className={getLevelColor()}>
            {getLevelIcon()}
            <span className="ml-1.5 capitalize">{metrics.level}</span>
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Agreement Ratio */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Agreement (A)</span>
              <span className="font-medium text-foreground">
                {(metrics.A * 100).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={metrics.A * 100} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.details.agreementVotes}/{metrics.details.totalVotes} votes positive
            </p>
          </div>

          {/* Contradiction Rate */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Critiques (C)</span>
              <span className="font-medium text-foreground">
                {(metrics.C * 100).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={metrics.C * 100} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.details.critiqueCount} critiques vs {metrics.details.proposalCount} proposals
            </p>
          </div>

          {/* Progress Coverage */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progress (P)</span>
              <span className="font-medium text-foreground">
                {(metrics.P * 100).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={metrics.P * 100} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.details.summaryAvailable ? 'Summaries available' : 'No summaries yet'}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Based on last {metrics.details.totalMessages} messages
          </p>
        </div>
      </div>
    </Card>
  );
};