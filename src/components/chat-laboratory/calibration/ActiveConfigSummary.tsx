import { Badge } from '@/components/ui/badge';

interface ActiveConfigSummaryProps {
  turnStrategy: string;
  pauseBetweenTurns: number;
  enableDirectCalls: boolean;
  voiceEnabled: boolean;
  audioMode?: string;
  lastResponse?: {
    speaker: string;
    responseTime: number;
    tokensUsed?: { input: number; output: number };
  };
}

export function ActiveConfigSummary({
  turnStrategy,
  pauseBetweenTurns,
  enableDirectCalls,
  voiceEnabled,
  audioMode,
  lastResponse
}: ActiveConfigSummaryProps) {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <h4 className="text-sm font-semibold text-foreground">Configurazione Attiva</h4>
      
      <div className="space-y-2 text-xs">
        {audioMode && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Modalità Audio:</span>
            <Badge variant="secondary" className="font-mono">
              {audioMode}
            </Badge>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Smart Turn-Taking:</span>
          <Badge variant={turnStrategy === 'SMART_PRIORITY' ? 'default' : 'secondary'}>
            {turnStrategy === 'SMART_PRIORITY' ? 'Attivo' : 'Disattivo'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Chiamate Dirette:</span>
          <Badge variant={enableDirectCalls ? 'default' : 'secondary'}>
            {enableDirectCalls ? 'Abilitate' : 'Disabilitate'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Voice:</span>
          <Badge variant={voiceEnabled ? 'default' : 'secondary'}>
            {voiceEnabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pausa tra Turni:</span>
          <Badge variant="outline" className="font-mono">
            {pauseBetweenTurns}ms
          </Badge>
        </div>
        
        {lastResponse && (
          <>
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ultimo Risultato:</span>
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  {lastResponse.speaker}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo Risposta:</span>
              <Badge variant="outline" className="font-mono">
                {lastResponse.responseTime}ms
              </Badge>
            </div>
            
            {lastResponse.tokensUsed && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Token Totali:</span>
                <Badge variant="outline" className="font-mono">
                  {lastResponse.tokensUsed.input + lastResponse.tokensUsed.output}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
