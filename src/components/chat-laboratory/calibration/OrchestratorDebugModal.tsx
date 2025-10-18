import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Zap, Volume2, MessageSquare, ArrowRight, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DebugStep {
  order: number;
  agentName: string;
  agentType: string;
  aiCallDurationMs: number;
  estimatedAudioDurationSec: number;
  tokensIn: number;
  tokensOut: number;
  contextReceived: {
    type: 'initial' | 'cumulative';
    includes: string[];
    previousResponses: number;
  };
  contentPreview: string;
  directCallsTo: string[] | null;
  wasDirectCall: boolean;
  audioUrl?: string;
}

interface DebugMeta {
  totalAgents: number;
  autoFollowEnabled: boolean;
  conversationPace: string;
  pauseBetweenTurnsMs: number;
  voiceEnabled: boolean;
}

interface OrchestratorDebugModalProps {
  open: boolean;
  onClose: () => void;
  timeline: DebugStep[];
  meta: DebugMeta;
  userMessage: string;
}

export function OrchestratorDebugModal({ 
  open, 
  onClose, 
  timeline,
  meta,
  userMessage
}: OrchestratorDebugModalProps) {
  const totalAiTime = timeline.reduce((sum, s) => sum + s.aiCallDurationMs, 0);
  const totalAudioTime = timeline.reduce((sum, s) => sum + s.estimatedAudioDurationSec, 0);
  const totalTokens = timeline.reduce((sum, s) => sum + s.tokensIn + s.tokensOut, 0);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔍 Orchestrator Debug Timeline
            <Badge variant="outline">{timeline.length} agents</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            
            {/* 👤 USER MESSAGE */}
            <Card className="p-4 bg-blue-500/10 border-blue-500/30">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-blue-400 mt-1" />
                <div className="flex-1">
                  <div className="font-semibold mb-2">👤 User Message</div>
                  <p className="text-sm text-muted-foreground italic">"{userMessage}"</p>
                </div>
              </div>
            </Card>
            
            <Separator className="my-4" />
            
            {/* ⚡ ORCHESTRATION TIMELINE */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Flusso di Orchestrazione
              </h3>
              
              {timeline.map((step, idx) => (
                <div key={idx}>
                  {/* Package Card */}
                  <Card className={`p-4 ${step.wasDirectCall ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className="text-lg px-3">#{step.order}</Badge>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {step.agentName}
                            {step.wasDirectCall && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/20">
                                🎯 Direct Call
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {step.agentType}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {step.aiCallDurationMs}ms
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Context Received */}
                    <div className="mb-3 p-3 bg-accent/50 rounded-lg">
                      <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                        📦 Context Package Received:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {step.contextReceived.includes.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        + {step.contextReceived.previousResponses} risposte precedenti di questo turno
                      </div>
                    </div>
                    
                    {/* Response Preview */}
                    <div className="text-sm text-muted-foreground mb-3 italic">
                      "{step.contentPreview}"
                    </div>
                    
                    {/* Metrics Row */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex gap-4">
                        <span>↓ {step.tokensIn} tok in</span>
                        <span>↑ {step.tokensOut} tok out</span>
                        {meta.voiceEnabled && (
                          <span className="flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            ~{step.estimatedAudioDurationSec.toFixed(1)}s audio
                          </span>
                        )}
                      </div>
                      
                      {step.directCallsTo && step.directCallsTo.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10">
                          📢 Mentions: {step.directCallsTo.join(', ')}
                        </Badge>
                      )}
                    </div>
                  </Card>
                  
                  {/* Pause Indicator */}
                  {idx < timeline.length - 1 && !step.directCallsTo && (
                    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                      ⏸️  {meta.pauseBetweenTurnsMs}ms pause
                    </div>
                  )}
                  
                  {idx < timeline.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            {/* 🎵 AUDIO PLAYBACK SEQUENCE */}
            {meta.voiceEnabled && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Sequenza Audio Prevista
                  {meta.autoFollowEnabled && (
                    <Badge variant="outline" className="text-xs bg-green-500/20">
                      <Play className="h-3 w-3 mr-1" />
                      Auto-Follow ON
                    </Badge>
                  )}
                </h3>
                
                {timeline.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="text-lg">{idx + 1}°</Badge>
                    <div className="flex-1">
                      <div className="font-semibold">{step.agentName}</div>
                      <div className="text-sm text-muted-foreground">
                        ~{step.estimatedAudioDurationSec.toFixed(1)}s audio → 
                        {meta.autoFollowEnabled && idx < timeline.length - 1 && (
                          <span className="ml-1 text-green-400">Tab passa automaticamente</span>
                        )}
                        {!meta.autoFollowEnabled && (
                          <span className="ml-1 text-muted-foreground">Tab manuale</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">Tab {idx + 1}</Badge>
                  </div>
                ))}
              </div>
            )}
            
            <Separator className="my-4" />
            
            {/* 📊 METRICS SUMMARY */}
            <Card className="p-4 bg-accent/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📊 Riepilogo Metriche
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Tempo AI Totale</div>
                  <div className="font-semibold">{(totalAiTime / 1000).toFixed(2)}s</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Audio Totale</div>
                  <div className="font-semibold">{totalAudioTime.toFixed(1)}s</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Token Totali</div>
                  <div className="font-semibold">{totalTokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Agenti</div>
                  <div className="font-semibold">{timeline.length}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span>Pace: <strong>{meta.conversationPace}</strong></span>
                  <span>Pause: <strong>{meta.pauseBetweenTurnsMs}ms</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {meta.voiceEnabled && (
                    <Badge variant="outline" className="bg-green-500/10">🎤 Voice ON</Badge>
                  )}
                  {meta.autoFollowEnabled && (
                    <Badge variant="outline" className="bg-blue-500/10">▶️ Auto-Follow</Badge>
                  )}
                </div>
              </div>
            </Card>
            
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
