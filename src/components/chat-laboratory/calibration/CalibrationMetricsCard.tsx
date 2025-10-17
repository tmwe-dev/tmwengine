import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Coins, Zap } from 'lucide-react';
import type { TestResult } from '@/pages/ChatLaboratoryCalibration';

interface CalibrationMetricsCardProps {
  result: TestResult;
}

export const CalibrationMetricsCard = ({ result }: CalibrationMetricsCardProps) => {
  const getStatusColor = () => {
    if (!result.success) return 'destructive';
    if (result.latency < 1000) return 'default';
    if (result.latency < 3000) return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {result.provider === 'chatgpt' && '🤖 OpenAI'}
            {result.provider === 'gemini' && '✨ Gemini'}
            {result.provider === 'claude' && '🧠 Claude'}
            {result.provider === 'error' && '❌ Error'}
          </CardTitle>
          <Badge variant={getStatusColor()}>
            {result.success ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.success ? (
          <>
            <MetricRow
              icon={<Clock className="h-3 w-3" />}
              label="Latency"
              value={`${result.latency}ms`}
              color={result.latency < 1000 ? 'text-green-600' : result.latency < 3000 ? 'text-yellow-600' : 'text-red-600'}
            />
            <MetricRow
              icon={<Zap className="h-3 w-3" />}
              label="Tokens In"
              value={result.tokens_in.toString()}
            />
            <MetricRow
              icon={<Zap className="h-3 w-3" />}
              label="Tokens Out"
              value={result.tokens_out.toString()}
            />
            {result.cost_estimate !== undefined && (
              <MetricRow
                icon={<Coins className="h-3 w-3" />}
                label="Cost (est.)"
                value={`€${result.cost_estimate.toFixed(4)}`}
              />
            )}
            {result.response_preview && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <p className="text-xs italic">{result.response_preview}...</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-destructive">
            {result.error_message || 'Test fallito'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MetricRow = ({ 
  icon, 
  label, 
  value, 
  color = 'text-foreground' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  color?: string;
}) => (
  <div className="flex items-center justify-between text-xs">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <span className={`font-mono font-semibold ${color}`}>{value}</span>
  </div>
);
