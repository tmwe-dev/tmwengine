import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Clock, Zap, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude' | 'user';
  sender_name: string;
  content: string;
  attachments?: {
    appendix?: string;
    report?: string;
    [key: string]: any;
  };
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
  audio_url?: string | null;
}

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
  user: {
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
  const [showAppendix, setShowAppendix] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  const config = SENDER_CONFIG[message.sender_type] || SENDER_CONFIG.user;
  const Icon = config.icon;

  const hasAppendix = message.attachments?.appendix;
  const hasReport = message.attachments?.report;

  const formatTime = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const copyMessageText = () => {
    navigator.clipboard.writeText(message.content);
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

        {/* Main Content */}
        <div className="prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* ✅ APPENDICE COLLAPSIBLE */}
        {hasAppendix && (
          <div className="mt-3">
            <Collapsible open={showAppendix} onOpenChange={setShowAppendix}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    📎 Appendice Tecnica
                  </span>
                  {showAppendix ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted/50 rounded-md border border-amber-500/20">
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.attachments!.appendix}</ReactMarkdown>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* ✅ REPORT COLLAPSIBLE */}
        {hasReport && (
          <div className="mt-3">
            <Collapsible open={showReport} onOpenChange={setShowReport}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    📊 Report Completo
                  </span>
                  {showReport ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted/50 rounded-md border border-blue-500/20 max-h-96 overflow-y-auto">
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.attachments!.report}</ReactMarkdown>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.images.map((url, idx) => (
              <img 
                key={idx}
                src={url} 
                alt="Uploaded" 
                className="rounded-lg max-h-48 object-cover w-full"
              />
            ))}
          </div>
        )}

        {/* Generated Images */}
        {message.generated_images && message.generated_images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.generated_images.map((url, idx) => (
              <img 
                key={idx}
                src={url} 
                alt="Generated" 
                className="rounded-lg max-h-48 object-cover w-full"
              />
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