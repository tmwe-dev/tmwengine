/**
 * AISidebarSliderUnified - Sidebar AI globale (versione base)
 */

import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';
import { GlobalAIAgentSelector } from './GlobalAIAgentSelector';

export const AISidebarSliderUnified = () => {
  const { state, closeCanvas } = useGlobalAICanvas();

  return (
    <>
      {state.isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in"
          onClick={closeCanvas}
        />
      )}

      <div className={cn(
        "fixed left-0 top-0 h-screen w-96 bg-background border-r z-50",
        "transition-transform duration-300 ease-in-out flex flex-col",
        state.isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Assistente AI</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={closeCanvas}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <GlobalAIAgentSelector />
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
          <p className="text-sm">Sidebar AI - Implementazione base completata<br/>Fase 1-3 del piano Big Bang ✅</p>
        </div>
      </div>
    </>
  );
};
