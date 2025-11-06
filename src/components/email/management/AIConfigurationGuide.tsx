/**
 * Guida per configurare l'AI quando ci sono problemi con i crediti
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ExternalLink, Sparkles, DollarSign } from 'lucide-react';

interface AIConfigurationGuideProps {
  error?: string;
  onDismiss?: () => void;
}

export const AIConfigurationGuide = ({ error, onDismiss }: AIConfigurationGuideProps) => {
  const isAnthropicError = error?.includes('credit balance') || error?.includes('Anthropic');
  
  return (
    <Card className="p-6 border-warning/50 bg-warning/5">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Problema con la configurazione AI</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isAnthropicError 
              ? "L'account Anthropic non ha crediti sufficienti. Usa Lovable AI come alternativa gratuita."
              : "Impossibile trovare una configurazione AI attiva."}
          </p>
        </div>
      </div>

      {isAnthropicError ? (
        <div className="space-y-3">
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <AlertTitle className="text-sm">Soluzione Consigliata: Usa Lovable AI</AlertTitle>
            <AlertDescription className="text-xs mt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Vai su <strong>/configurazione-ai</strong></li>
                <li>Trova la configurazione <strong>Lovable AI (google/gemini-2.5-flash)</strong></li>
                <li>Assicurati sia <strong>Attiva</strong> (toggle verde)</li>
                <li>Disattiva le altre configurazioni se necessario</li>
                <li>Riprova a generare i suggerimenti</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Alert className="bg-muted/50">
            <DollarSign className="w-4 h-4" />
            <AlertTitle className="text-sm">Alternativa: Aggiungi crediti Anthropic</AlertTitle>
            <AlertDescription className="text-xs mt-2">
              <p className="mb-2">Se preferisci continuare ad usare Claude:</p>
              <ol className="list-decimal list-inside space-y-1 mb-2">
                <li>Vai su <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Console</a></li>
                <li>Aggiungi crediti al tuo account</li>
                <li>Riprova a generare i suggerimenti</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => window.location.href = '/configurazione-ai'}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Vai a Configurazione AI
            </Button>
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Chiudi
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Alert className="bg-muted/50">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle className="text-sm">Come risolvere</AlertTitle>
            <AlertDescription className="text-xs mt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Vai su <strong>/configurazione-ai</strong></li>
                <li>Crea o attiva una configurazione AI</li>
                <li>Assicurati che la configurazione sia <strong>Attiva</strong></li>
                <li>Riprova a generare i suggerimenti</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => window.location.href = '/configurazione-ai'}
              className="flex-1"
            >
              Vai a Configurazione AI
            </Button>
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Chiudi
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
