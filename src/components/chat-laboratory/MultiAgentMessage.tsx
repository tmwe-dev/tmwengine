import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Clock, Zap, Copy, Download, Link, FileText, FileCheck, Sparkles, ChevronDown } from 'lucide-react';
import { UploadedFile } from '@/components/chat/FileUploader';
import { toast } from '@/hooks/use-toast';
import { AudioMessagePlayer } from '@/components/chat-laboratory/AudioMessagePlayer';
import { DeliverableCard } from './DeliverableCard';
import { MessageCostBadge } from './MessageCostBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';

interface StructuredAttachments {
  appendix?: string;
  report?: string;
  structured_prompt?: any;
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

export const MultiAgentMessage = ({ message, onAudioEnd }: MultiAgentMessageProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('friendly');
  const config = SENDER_CONFIG[message.sender_type];
  const Icon = config.icon;

  // Type guard per structured attachments
  const isStructuredAttachments = (attachments: any): attachments is StructuredAttachments => {
    return attachments && typeof attachments === 'object' && !Array.isArray(attachments);
  };

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

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none">
          {viewMode === 'summary' && tokenSavings > 0 && (
            <Badge variant="outline" className="mb-2 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
              ⚡ Economy Mode: -{tokenSavings} token
            </Badge>
          )}
          <p className="whitespace-pre-wrap">{displayContent}</p>
        </div>

        {/* ✅ NUOVO: Appendice Tecnica (Collapsible) */}
        {isStructuredAttachments(message.attachments) && message.attachments.appendix && message.sender_type !== 'human' && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm font-medium group">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">📎 Appendice Tecnica</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {message.attachments.appendix.length} chars
              </Badge>
              <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 bg-muted/30 rounded-lg border border-border/40">
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{message.attachments.appendix}</ReactMarkdown>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ✅ NUOVO: Report Completo (Collapsible) */}
        {isStructuredAttachments(message.attachments) && message.attachments.report && message.sender_type !== 'human' && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium group">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-foreground">📊 Report Completo</span>
              <Badge variant="outline" className="ml-auto text-xs bg-primary/10 border-primary/30">
                {message.attachments.report.length} chars
              </Badge>
              <ChevronDown className="h-4 w-4 ml-2 text-primary transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{message.attachments.report}</ReactMarkdown>
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
        {message.audio_url && message.sender_type !== 'human' && (
          <div className="mt-2">
            <AudioMessagePlayer 
              audioUrl={message.audio_url}
              autoPlay={true}
              onPlayStart={() => {
                console.log(`🔊 [MultiAgentMessage] Audio START: ${message.sender_name}`);
              }}
              onPlayEnd={() => {
                console.log(`⏸️ [MultiAgentMessage] Audio END: ${message.sender_name}`);
                onAudioEnd?.();
              }}
              onPlayingChange={(playing) => {
                console.log(`🎵 [MultiAgentMessage] Audio ${playing ? 'PLAYING' : 'PAUSED'}: ${message.sender_name}`);
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

        {/* Stats */}
        {(message.token_input || message.token_output || message.tempo_risposta_ms) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {message.token_input && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {message.token_input} token in
              </Badge>
            )}
            {message.token_output && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {message.token_output} token out
              </Badge>
            )}
            {message.tempo_risposta_ms && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(message.tempo_risposta_ms)}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};