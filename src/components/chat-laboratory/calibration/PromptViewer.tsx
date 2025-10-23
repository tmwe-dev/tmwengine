import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TokenKeyIndicator } from '@/components/ui/token-key-indicator';

interface PromptSection {
  key: string;
  label: string;
  content: string;
  color: string;
  bgColor: string;
  tokenCount?: number;
}

interface PromptViewerProps {
  structuredPrompt: {
    global_system_prompt?: string;
    base_sections?: string[];
    topic_sections?: string[];
    kb_context_sections?: string[];
    kb_documents?: string[];
    cumulative_summary?: string;
    message_history?: string;
    current_user_message?: string;
  };
}

export const PromptViewer = ({ structuredPrompt }: PromptViewerProps) => {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['global_system_prompt']));

  const sections: PromptSection[] = [
    {
      key: 'global_system_prompt',
      label: '🌐 Global System Prompt',
      content: structuredPrompt.global_system_prompt || '',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      tokenCount: Math.ceil((structuredPrompt.global_system_prompt || '').length / 4)
    },
    {
      key: 'base_sections',
      label: '📋 Base Sections',
      content: Array.isArray(structuredPrompt.base_sections) 
        ? structuredPrompt.base_sections.join('\n\n---\n\n')
        : '',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      tokenCount: Math.ceil((Array.isArray(structuredPrompt.base_sections) 
        ? structuredPrompt.base_sections.join('').length 
        : 0) / 4)
    },
    {
      key: 'topic_sections',
      label: '🎯 Topic Sections',
      content: Array.isArray(structuredPrompt.topic_sections)
        ? structuredPrompt.topic_sections.join('\n\n---\n\n')
        : '',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      tokenCount: Math.ceil((Array.isArray(structuredPrompt.topic_sections)
        ? structuredPrompt.topic_sections.join('').length
        : 0) / 4)
    },
    {
      key: 'kb_context_sections',
      label: '📚 KB Context Sections',
      content: Array.isArray(structuredPrompt.kb_context_sections)
        ? structuredPrompt.kb_context_sections.join('\n\n---\n\n')
        : '',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      tokenCount: Math.ceil((Array.isArray(structuredPrompt.kb_context_sections)
        ? structuredPrompt.kb_context_sections.join('').length
        : 0) / 4)
    },
    {
      key: 'kb_documents',
      label: '🗂️ Knowledge Base Documents',
      content: Array.isArray(structuredPrompt.kb_documents)
        ? structuredPrompt.kb_documents.join('\n\n---\n\n')
        : '',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      tokenCount: Math.ceil((Array.isArray(structuredPrompt.kb_documents)
        ? structuredPrompt.kb_documents.join('').length
        : 0) / 4)
    },
    {
      key: 'cumulative_summary',
      label: '📝 Cumulative Summary',
      content: structuredPrompt.cumulative_summary || '',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
      tokenCount: Math.ceil((structuredPrompt.cumulative_summary || '').length / 4)
    },
    {
      key: 'message_history',
      label: '💬 Message History',
      content: structuredPrompt.message_history || '',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      tokenCount: Math.ceil((structuredPrompt.message_history || '').length / 4)
    },
    {
      key: 'current_user_message',
      label: '👤 Current User Message',
      content: structuredPrompt.current_user_message || '',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
      tokenCount: Math.ceil((structuredPrompt.current_user_message || '').length / 4)
    }
  ];

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "✅ Copiato",
      description: `${label} copiato negli appunti`,
    });
  };

  const totalTokens = sections.reduce((sum, s) => sum + (s.tokenCount || 0), 0);
  const debugInfo = (structuredPrompt as any)?.debug_info;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🔍 Prompt Strutturato
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Totale:</span>
            <TokenKeyIndicator tokenCount={totalTokens} variant="total" showLabel />
          </div>
        </div>
        
        {/* Debug Info Section */}
        {debugInfo && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <h4 className="font-semibold text-sm mb-2">🔍 Debug Info</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <span className="ml-2 font-semibold">{debugInfo.provider}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Model:</span>
                <span className="ml-2">{debugInfo.model}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timeout:</span>
                <span className="ml-2">{debugInfo.timeout}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tokens Est:</span>
                <span className="ml-2">{debugInfo.tokens_estimated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Strategy:</span>
                <span className="ml-2">{debugInfo.turn_strategy}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Selection:</span>
                <span className="ml-2 text-xs">{debugInfo.agent_selection_reason}</span>
              </div>
              {debugInfo.blocked_monopoly && (
                <div className="col-span-2 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded mt-1">
                  🚫 Anti-monopolio attivato: {debugInfo.last_two_speakers?.join(' → ')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {sections.map((section) => {
          if (!section.content) return null;
          
          const isExpanded = expandedSections.has(section.key);

          return (
            <div
              key={section.key}
              className={`border rounded-lg ${section.bgColor} transition-all`}
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5"
                onClick={() => toggleSection(section.key)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className={`font-semibold ${section.color}`}>
                    {section.label}
                  </span>
                  <TokenKeyIndicator tokenCount={section.tokenCount} />
                </div>
                
                {isExpanded && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(section.content, section.label)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-background/50 p-3 rounded border">
                    {section.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
