import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface SummaryChunk {
  messageRange: [number, number];
  summary: string;
  keyPoints: string[];
  participants: string[];
}

interface ConversationSummaryPanelProps {
  finalSummary: string;
  chunks: SummaryChunk[];
  lastSummarizedAt: string | null;
  totalMessages: number;
  lastMessageSummarized: number;
}

export function ConversationSummaryPanel({
  finalSummary,
  chunks,
  lastSummarizedAt,
  totalMessages,
  lastMessageSummarized
}: ConversationSummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChunks, setShowChunks] = useState(false);

  if (!finalSummary) return null;

  const isFresh = lastMessageSummarized >= totalMessages - 5;
  const freshness = isFresh ? "Aggiornato" : "Da aggiornare";
  const freshnessColor = isFresh ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300";

  const allParticipants = [...new Set(chunks.flatMap(c => c.participants))];

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Riassunto Conversazione</h3>
            <Badge variant="outline" className={freshnessColor}>
              {freshness}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Compact Info */}
        {!isExpanded && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {finalSummary}
          </p>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{lastMessageSummarized} / {totalMessages} messaggi</span>
              </div>
              {lastSummarizedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(lastSummarizedAt), "dd MMM yyyy HH:mm", { locale: it })}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{allParticipants.join(", ")}</span>
              </div>
            </div>

            {/* Final Summary */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-foreground">{finalSummary}</p>
            </div>

            {/* Chunks Toggle */}
            {chunks.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChunks(!showChunks)}
              >
                {showChunks ? "Nascondi" : "Mostra"} dettagli per sezione ({chunks.length})
              </Button>
            )}

            {/* Chunks Detail */}
            {showChunks && chunks.length > 1 && (
              <div className="space-y-3 mt-3">
                {chunks.map((chunk, idx) => (
                  <Card key={idx} className="p-3 bg-background/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Messaggi {chunk.messageRange[0] + 1}-{chunk.messageRange[1] + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {chunk.participants.join(", ")}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{chunk.summary}</p>
                    {chunk.keyPoints.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {chunk.keyPoints.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}