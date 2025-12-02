import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Clock, Copy, Download, Link, FileText, FileCheck, Sparkles, ChevronDown, Users, FileCode } from 'lucide-react';
import { UploadedFile } from '@/components/chat/FileUploader';
import { toast } from '@/hooks/use-toast';
import { AudioMessagePlayer } from '@/components/chat-laboratory/AudioMessagePlayer';
import { DeliverableCard } from './DeliverableCard';
import { MessageCostBadge } from './MessageCostBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { TokenKeyIndicator } from '@/components/ui/token-key-indicator';

interface StructuredPrompt {
  global_system_prompt: string;
  base_sections?: Array<{
    type: string;
    content: string;
  }>;
  agent_personality?: Array<{
    agent_name: string;
    content: string;
  }>;
  cumulative_summary?: string | null;
  message_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  turn_context?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: {
    agent_index: number;
    total_agents: number;
    history_count: number;
    turn_context_count: number;
    economy_mode: boolean;
  };
}

export interface StructuredAttachments {
  appendix?: string;
  report?: string;
  structured_prompt?: StructuredPrompt;
  debug_info?: any;
}

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  content_user_friendly?: string;
  content_summary?: string;
  is_summary_available?: boolean;
  attachments?: StructuredAttachments | UploadedFile[];
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
  audio_url?: string | null;
}

type ViewMode = 'summary' | 'friendly' | 'full';

interface MultiAgentMessageProps {
  message: Message;
  onAudioEnd?: () => void;
  onAudioStateChange?: (isPlaying: boolean) => void;
  canAutoPlay?: boolean;
  isAudioPlayingGlobally?: boolean;
}

const SENDER_CONFIG = {
  human: {
    icon: User,
    iconBg: 'bg-blue-500',
    bg: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    textColor: 'text-blue-900 dark:text-blue-100',
    badgeColor: 'bg-blue-600 text-white'
  },
  chatgpt: {
    icon: Bot,
    iconBg: 'bg-green-500',
    bg: 'from-green-500/10 to-green-600/5',
    border: 'border-green-500/20',
    textColor: 'text-green-900 dark:text-green-100',
    badgeColor: 'bg-green-600 text-white'
  },
  gemini: {
    icon: Bot,
    iconBg: 'bg-cyan-500',
    bg: 'from-cyan-500/10 to-cyan-600/5',
    border: 'border-cyan-500/20',
    textColor: 'text-cyan-900 dark:text-cyan-100',
    badgeColor: 'bg-cyan-600 text-white'
  },
  claude: {
    icon: Bot,
    iconBg: 'bg-purple-500',
    bg: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    textColor: 'text-purple-900 dark:text-purple-100',
    badgeColor: 'bg-purple-600 text-white'
  }
};

export const MultiAgentMessage = ({ message, onAudioEnd, onAudioStateChange, canAutoPlay = true, isAudioPlayingGlobally = false }: MultiAgentMessageProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('friendly');
  const [appendixAudioPlaying, setAppendixAudioPlaying] = useState(false);
  const [appendixOpen, setAppendixOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const config = SENDER_CONFIG[message.sender_type];
  const Icon = config.icon;

  // Type guard per structured attachments
  const isStructuredAttachments = (attachments: any): attachments is StructuredAttachments => {
    return attachments && typeof attachments === 'object' && !Array.isArray(attachments);
  };

  // Verifica presenza structured_prompt
  const hasStructuredPrompt = 
    isStructuredAttachments(message.attachments) && 
    message.attachments.structured_prompt;
  
  const structuredPrompt = hasStructuredPrompt && isStructuredAttachments(message.attachments)
    ? message.attachments.structured_prompt
    : null;

  // Determine which content to display based on viewMode
  const displayContent = (() => {
    if (message.sender_type === 'human') return message.content;
    
    if (viewMode === 'summary' && message.content_summary) {
      return message.content_summary;
    }
    if (viewMode === 'friendly' && message.content_user_friendly) {
      return message.content_user_friendly;
    }
    return message.content;
  })();

  // Calculate token savings if using summary
  const tokenSavings = viewMode === 'summary' && message.token_output 
    ? Math.round(message.token_output * 0.8)
    : 0;

  const formatTime = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const copyMessageText = () => {
    navigator.clipboard.writeText(message.content);
  };

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${message.id}-${index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Silent error
    }
  };

  // 🎯 Ottieni gli altri 2 agenti (escluso sender corrente)
  const getOtherAgents = (): string[] => {
    const allAgents = ['chatgpt', 'gemini', 'claude'];
    const currentSender = message.sender_type.toLowerCase();
    return allAgents.filter(agent => agent !== currentSender);
  };

  // 🎯 Gestisci richiesta commento manuale
  const handleRequestComment = async (target: 'all' | string) => {
    try {
      const conversationId = (message as any).conversation_id;
      if (!conversationId) {
        toast({ title: "Errore", description: "Conversation ID non trovato", variant: "destructive" });
        return;
      }

      // Chiama direttamente bar-chat-orchestrator con flag di richiesta manuale
      const { error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId,
          messageId: message.id,
          targetAgent: target,
          manualRequest: true,
          requestingUser: true
        }
      });

      if (error) throw error;

      toast({
        title: "Richiesta inviata",
        description: target === 'all' 
          ? "Tutti gli agenti sono stati chiamati a commentare"
          : `${target.toUpperCase()} è stato chiamato a commentare`
      });
    } catch (error) {
      console.error('Error requesting comment:', error);
      toast({ title: "Errore", description: "Impossibile inviare la richiesta", variant: "destructive" });
    }
  };

  return (
    <Card className={`bg-gradient-to-br ${config.bg} border ${config.border}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${config.iconBg} p-2 rounded-lg`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className={`font-semibold ${config.textColor}`}>
                {message.sender_name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={config.badgeColor} variant="secondary">
              {message.sender_type.toUpperCase()}
            </Badge>
            
            {/* 💰 Badge costo messaggio */}
            {message.token_input && message.token_output && (
              <MessageCostBadge
                provider={message.sender_type}
                inputTokens={message.token_input}
                outputTokens={message.token_output}
              />
            )}
            
            {/* Desktop only: View mode toggle for AI messages */}
            {message.sender_type !== 'human' && (
              <div className="hidden md:flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'summary' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setViewMode('summary')}
                  title="Sintetico (Economy Mode)"
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
                <Button
                  variant={viewMode === 'friendly' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setViewMode('friendly')}
                  title="Ibrido (User-Friendly)"
                >
                  <FileCheck className="h-3 w-3" />
                </Button>
                <Button
                  variant={viewMode === 'full' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setViewMode('full')}
                  title="Completo"
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Icona "Vedi Prompt" - solo per messaggi AI con structured_prompt */}
            {hasStructuredPrompt && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPrompt(!showPrompt)}
                title="Visualizza prompt completo utilizzato"
              >
                <FileCode className={`h-4 w-4 ${showPrompt ? 'text-violet-500' : ''}`} />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyMessageText}
              title="Copia messaggio"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - NO ReactMarkdown, puro testo conversazionale */}
        <div className="max-w-none">
          {viewMode === 'summary' && tokenSavings > 0 && (
            <Badge variant="outline" className="mb-2 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
              ⚡ Economy Mode: -{tokenSavings} token
            </Badge>
          )}
          <div className="prose dark:prose-invert max-w-none text-base">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        </div>


        {/* ✅ REPORT: Supporto sia structured che legacy format */}
        {((isStructuredAttachments(message.attachments) && message.attachments.report) || (message.attachments as any)?.report) && message.sender_type !== 'human' && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium group">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-foreground">📊 Report Completo</span>
              <Badge variant="outline" className="ml-auto text-xs bg-primary/10 border-primary/30">
                {(isStructuredAttachments(message.attachments) ? message.attachments.report?.length : (message.attachments as any)?.report?.length) || 0} chars
              </Badge>
              <ChevronDown className="h-4 w-4 ml-2 text-primary transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>
                  {isStructuredAttachments(message.attachments) ? message.attachments.report : (message.attachments as any)?.report}
                </ReactMarkdown>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 🧠 PROMPT COMPLETO UTILIZZATO */}
        {hasStructuredPrompt && (
          <Collapsible open={showPrompt} onOpenChange={setShowPrompt} className="mt-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-3 bg-violet-500/10 rounded-lg hover:bg-violet-500/20 transition-colors text-sm font-medium group border border-violet-500/30">
                <span className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-violet-600" />
                  <span className="text-foreground">🧠 Prompt Completo Utilizzato</span>
                </span>
                <div className="flex items-center gap-2">
                  {structuredPrompt?.metadata && (
                    <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/30">
                      {structuredPrompt.metadata.history_count + 
                       structuredPrompt.metadata.turn_context_count} messaggi
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 text-violet-600 transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-violet-500/5 rounded-lg border border-violet-500/20 space-y-4 max-h-[700px] overflow-y-auto">
                
                {/* SEZIONE 1: System Prompt Globale */}
                {structuredPrompt && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2 border-b border-violet-500/30 pb-1">
                      <FileCode className="h-4 w-4" />
                      📋 System Prompt Globale
                    </h5>
                    <div className="bg-background/80 p-3 rounded border border-violet-500/20 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                      {structuredPrompt.global_system_prompt}
                    </div>
                  </div>
                )}

                {/* SEZIONE 2: Riassunto Cumulativo (se presente) */}
                {structuredPrompt?.cumulative_summary && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2 border-b border-violet-500/30 pb-1">
                      📚 Riassunto Cumulativo
                      <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30">
                        Storico &gt; 20 messaggi
                      </Badge>
                    </h5>
                    <div className="bg-amber-500/5 p-3 rounded border border-amber-500/20 text-xs leading-relaxed">
                      <ReactMarkdown>
                        {structuredPrompt.cumulative_summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* SEZIONE 3: Storico Messaggi */}
                {structuredPrompt?.message_history && 
                 structuredPrompt.message_history.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2 border-b border-violet-500/30 pb-1">
                      💬 Storico Messaggi
                      <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
                        {structuredPrompt.message_history.length} messaggi
                      </Badge>
                    </h5>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {structuredPrompt.message_history.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded text-xs border ${
                            msg.role === 'user' 
                              ? 'bg-blue-500/5 border-blue-500/20' 
                              : 'bg-green-500/5 border-green-500/20'
                          }`}
                        >
                          <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 opacity-70">
                            {msg.role === 'user' ? '👤 USER' : '🤖 ASSISTANT'}
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEZIONE 4: Contesto Turno Corrente */}
                {structuredPrompt?.turn_context && 
                 structuredPrompt.turn_context.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2 border-b border-violet-500/30 pb-1">
                      🔄 Contesto Turno Corrente
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 border-cyan-500/30">
                        {structuredPrompt.turn_context.length} messaggi
                      </Badge>
                    </h5>
                    <div className="space-y-2">
                      {structuredPrompt.turn_context.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded text-xs border ${
                            msg.role === 'user' 
                              ? 'bg-blue-500/5 border-blue-500/20' 
                              : 'bg-green-500/5 border-green-500/20'
                          }`}
                        >
                          <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 opacity-70">
                            {msg.role === 'user' ? '👤 USER' : '🤖 ASSISTANT'}
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEZIONE 5: Metadata */}
                {structuredPrompt?.metadata && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2 border-b border-violet-500/30 pb-1">
                      ℹ️ Metadata
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-background/80 p-2 rounded border border-violet-500/20">
                        <span className="font-semibold">Agente:</span> {structuredPrompt.metadata.agent_index + 1}/{structuredPrompt.metadata.total_agents}
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-violet-500/20">
                        <span className="font-semibold">Messaggi Storico:</span> {structuredPrompt.metadata.history_count}
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-violet-500/20">
                        <span className="font-semibold">Messaggi Turno:</span> {structuredPrompt.metadata.turn_context_count}
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-violet-500/20">
                        <span className="font-semibold">Economy Mode:</span> {structuredPrompt.metadata.economy_mode ? '✅ Sì' : '❌ No'}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.images.map((url, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={url} 
                  alt="Uploaded" 
                  className="rounded-lg max-h-48 object-cover w-full"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyImageUrl(url)}
                    title="Copia URL"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => downloadImage(url, idx)}
                    title="Scarica immagine"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generated Images */}
        {message.generated_images && message.generated_images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.generated_images.map((url, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={url} 
                  alt="Generated" 
                  className="rounded-lg max-h-48 object-cover w-full"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyImageUrl(url)}
                    title="Copia URL"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => downloadImage(url, idx)}
                    title="Scarica immagine"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audio Player (se presente audio_url) */}
        {message.audio_url && (
          <div className="mt-2">
            <AudioMessagePlayer 
              key={message.id}
              audioUrl={message.audio_url}
              autoPlay={canAutoPlay}
              isAudioPlayingGlobally={isAudioPlayingGlobally}
              onPlayStart={() => {
                console.log(`🔊 [MultiAgentMessage] Audio START: ${message.sender_name}`);
                onAudioStateChange?.(true);
              }}
              onPlayEnd={() => {
                console.log(`⏸️ [MultiAgentMessage] Audio END: ${message.sender_name}`);
                onAudioEnd?.();
              }}
              onError={(error) => {
                console.error(`❌ [MultiAgentMessage] Audio ERROR: ${message.sender_name}`, error);
                onAudioStateChange?.(false);
                onAudioEnd?.();
              }}
            />
          </div>
        )}

        {/* Deliverable Card */}
        <DeliverableCard messageId={message.id} />

        {/* Attachments - Solo file caricati dall'utente (legacy UploadedFile[]) */}
        {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((file, idx) => (
              <Badge key={idx} variant="outline">
                {file.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats + Bottoni Richiesta Commento */}
        <div className="flex items-center justify-between gap-2">
          {(message.token_input || message.token_output || message.tempo_risposta_ms) && (
            <div className="flex flex-wrap gap-3 items-center">
              {message.token_input && (
                <TokenKeyIndicator tokenCount={message.token_input} variant="input" showLabel />
              )}
              {message.token_output && (
                <TokenKeyIndicator tokenCount={message.token_output} variant="output" showLabel />
              )}
              {message.tempo_risposta_ms && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(message.tempo_risposta_ms)}
                </Badge>
              )}
            </div>
          )}

          {/* 🎯 Bottoni Richiesta Commento (solo AI messages) */}
          {message.sender_type !== 'human' && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRequestComment('all')}
                className="h-7 px-2 text-xs hover:bg-primary/10"
                title="Chiedi commento a tutti gli altri agenti"
              >
                <Users className="h-3 w-3 mr-1" />
                Tutti
              </Button>
              {getOtherAgents().map((agentType) => {
                const agentConfig = SENDER_CONFIG[agentType as keyof typeof SENDER_CONFIG];
                const AgentIcon = agentConfig?.icon;
                return (
                  <Button
                    key={agentType}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRequestComment(agentType)}
                    className="h-7 px-2 text-xs hover:bg-primary/10"
                    title={`Chiedi commento a ${agentType}`}
                  >
                    {AgentIcon && <AgentIcon className="h-3 w-3 mr-1" />}
                    <span className="capitalize">{agentType === 'chatgpt' ? 'GPT' : agentType}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};