import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2, Check, X, Trash2, Sparkles, FileText, Cpu, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Participant {
  name: string;
  type: string;
}

export interface ConversationItem {
  id: string;
  titolo: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  total_tokens?: number;
  riassunto_contesto?: string | null;
  active_participants?: Participant[];
}

interface ConversationListItemProps {
  conv: ConversationItem;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingTitleChange: (v: string) => void;
  onDelete: () => void;
  onGenerateSummary?: () => void;
  onGenerateFullReport?: () => void;
}

const formatTokens = (tokens?: number): string => {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
};

const ICON_MAP = {
  'chatgpt': { icon: Sparkles, color: 'text-green-500' },
  'gemini': { icon: Cpu, color: 'text-blue-500' },
  'claude': { icon: Bot, color: 'text-purple-500' },
  'human': { icon: UserIcon, color: 'text-muted-foreground' }
} as const;

const getParticipantIcons = (participants?: Participant[]) => {
  const aiParticipants = participants?.filter(p => p.type !== 'human') || [];
  return aiParticipants.slice(0, 3).map(p => ({
    ...ICON_MAP[p.type as keyof typeof ICON_MAP] || ICON_MAP.human,
    name: p.name
  }));
};

export const ConversationListItem = ({
  conv, isSelected, isEditing, editingTitle,
  onSelect, onStartEdit, onSaveEdit, onCancelEdit, onEditingTitleChange,
  onDelete, onGenerateSummary, onGenerateFullReport
}: ConversationListItemProps) => {
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "group relative p-3 rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer",
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left",
            isSelected
              ? 'bg-email-selected border-primary/40 after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent'
              : 'bg-transparent border-border/20 hover:border-border/40 hover:bg-transparent after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent hover:after:animate-line-bounce'
          )}
          onClick={() => !isEditing && onSelect()}
        >
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingTitle}
                onChange={(e) => onEditingTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={onSaveEdit}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={onCancelEdit}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Title + Tokens */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className={cn(
                  "text-sm font-semibold line-clamp-2 flex-1 max-w-[calc(100%-60px)] transition-all duration-200",
                  "group-hover:scale-105",
                  isSelected ? "text-purple-300 scale-105" : ""
                )}>
                  {conv.titolo || "Nuova conversazione"}
                </h4>
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0 self-start">
                  {formatTokens(conv.total_tokens)}
                </span>
              </div>

              {/* Participants + Message Count + Actions */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {getParticipantIcons(conv.active_participants).map((p, i) => {
                      const Icon = p.icon;
                      return <Icon key={i} className={cn("w-3.5 h-3.5", p.color)} />;
                    })}
                    {conv.active_participants && conv.active_participants.filter(p => p.type !== 'human').length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{conv.active_participants.filter(p => p.type !== 'human').length - 3}</span>
                    )}
                  </div>
                  <Badge variant="secondary" className={cn(
                    "ml-2 h-5 min-w-5 px-1.5 flex-shrink-0 bg-transparent border font-medium",
                    isSelected ? "text-purple-300 border-purple-300" : "text-foreground border-border"
                  )}>
                    {conv.message_count || 0}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onGenerateSummary && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Genera riassunto" onClick={(e) => { e.stopPropagation(); onGenerateSummary(); }}>
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  )}
                  {onGenerateFullReport && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Genera report completo" onClick={(e) => { e.stopPropagation(); onGenerateFullReport(); }}>
                      <FileText className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(conv.created_at), "dd/MM HH:mm")}
                </span>
              </div>
            </>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{conv.titolo || "Senza titolo"}</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Creata: {format(new Date(conv.created_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
            <p>Messaggi: {conv.message_count || 0}</p>
            <p>Token totali: {formatTokens(conv.total_tokens)}</p>
          </div>
          {conv.riassunto_contesto && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground line-clamp-3">{conv.riassunto_contesto}</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
