import { ArrowLeft, Reply, Forward, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Attachment {
  filename: string;
  size: number;
  content_id?: string;
  data?: string;
  type?: string;
}

interface EmailDetailNewProps {
  email: {
    id: string;
    subject: string;
    from: string;
    to: string | string[];
    cc?: string | string[];
    date: string;
    body: string;
    attachments?: Attachment[];
  };
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  isMobile?: boolean;
}

export function EmailDetailNew({
  email,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isMobile,
}: EmailDetailNewProps) {
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const downloadAttachment = (attachment: Attachment) => {
    if (!attachment.data) return;
    
    const link = document.createElement('a');
    link.href = `data:${attachment.type || 'application/octet-stream'};base64,${attachment.data}`;
    link.download = attachment.filename;
    link.click();
  };

  const toArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const downloadableAttachments = email.attachments?.filter(
    att => !att.content_id
  ) || [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 space-y-3">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {!isMobile && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onReply && (
              <Button variant="ghost" size="icon" onClick={onReply}>
                <Reply className="h-4 w-4" />
              </Button>
            )}
            {onForward && (
              <Button variant="ghost" size="icon" onClick={onForward}>
                <Forward className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Subject */}
        <h1 className="text-xl font-semibold">{email.subject}</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* From/To/Date */}
          <Card className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div>
                  <div className="text-sm text-muted-foreground">Da:</div>
                  <div className="font-medium">{email.from}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">A:</div>
                  <div className="text-sm">
                    {toArray(email.to).join(', ')}
                  </div>
                </div>

                {email.cc && toArray(email.cc).length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Cc:</div>
                    <div className="text-sm">
                      {toArray(email.cc).join(', ')}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {formatDate(email.date)}
              </div>
            </div>
          </Card>

          {/* Attachments */}
          {downloadableAttachments.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-medium mb-3">
                Allegati ({downloadableAttachments.length})
              </div>
              <div className="space-y-2">
                {downloadableAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{att.filename}</span>
                      {att.size && (
                        <Badge variant="secondary" className="text-xs">
                          {(att.size / 1024).toFixed(1)} KB
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadAttachment(att)}
                      disabled={!att.data}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Separator />

          {/* Body */}
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
