import { format } from 'date-fns';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Trash2, 
  Star,
  MoreVertical,
  Download,
  Paperclip
} from 'lucide-react';
import { formatFileSize, downloadBase64File } from '@/lib/fileUtils';

interface EmailDetailProps {
  email: {
    id: string;
    subject: string;
    from: string;
    to: string[];
    cc?: string[];
    date: string;
    body: string;
    attachments?: any[];
  };
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete: () => void;
}

export const EmailDetail = ({ 
  email, 
  onReply, 
  onReplyAll, 
  onForward, 
  onDelete 
}: EmailDetailProps) => {
  // Validate and parse date safely
  const emailDate = (() => {
    try {
      const date = new Date(email.date);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', email.date);
        return new Date(); // Fallback to current date
      }
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  })();

  // Process email body to replace cid: references with base64 images
  const processedBody = useMemo(() => {
    if (!email.body || !email.attachments) return email.body;
    
    console.log('Email attachments:', email.attachments);
    console.log('Email body:', email.body);
    
    let htmlBody = email.body;
    
    // Replace cid: references with base64 data
    email.attachments.forEach((attachment: any) => {
      console.log('Processing attachment:', {
        filename: attachment.filename,
        content_id: attachment.content_id,
        contentId: attachment.contentId,
        cid: attachment.cid,
        hasData: !!attachment.data
      });
      
      // Try multiple possible content_id field names
      const contentId = attachment.content_id || attachment.contentId || attachment.cid;
      
      if (attachment.data) {
        const mimeType = attachment.mimetype || attachment.content_type || 'image/png';
        
        // Clean base64 data - remove any data URL prefix if present
        let base64Data = attachment.data;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        if (contentId) {
          // Remove < and > brackets if present
          const cleanContentId = contentId.replace(/[<>]/g, '');
          console.log('Replacing cid:', cleanContentId);
          
          // Replace all occurrences of cid:contentId with properly formatted data URI
          const cidPattern = new RegExp(`cid:${cleanContentId}`, 'gi');
          htmlBody = htmlBody.replace(
            cidPattern, 
            `data:${mimeType};base64,${base64Data}`
          );
        } else {
          // If no content_id, try to extract from all cid: references in the HTML
          const cidMatches = htmlBody.match(/cid:([^"'\s]+)/gi);
          console.log('Found cid references:', cidMatches);
          
          if (cidMatches && cidMatches.length > 0) {
            // Try to match by filename or replace all cid: references
            cidMatches.forEach(cidMatch => {
              const cidValue = cidMatch.replace('cid:', '');
              console.log('Attempting to replace cid:', cidValue);
              htmlBody = htmlBody.replace(
                cidMatch,
                `data:${mimeType};base64,${base64Data}`
              );
            });
          }
        }
      }
    });
    
    console.log('Processed HTML body:', htmlBody.substring(0, 500));
    return htmlBody;
  }, [email.body, email.attachments]);

  // Filter out inline attachments (those with content_id)
  const downloadableAttachments = useMemo(() => {
    if (!email.attachments) return [];
    return email.attachments.filter((attachment: any) => 
      !attachment.content_id && !attachment.contentId
    );
  }, [email.attachments]);

  const handleDownloadAttachment = (attachment: any) => {
    try {
      if (!attachment.data) {
        toast.error('Attachment content not available');
        return;
      }
      
      downloadBase64File(
        attachment.data,
        attachment.filename,
        attachment.mimetype
      );
      
      toast.success(`Downloaded ${attachment.filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download attachment');
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b p-2 sm:p-3 md:p-4">
        <div className="flex gap-1 sm:gap-1.5 md:gap-2">
          <Button variant="outline" size="sm" onClick={onReply}>
            <Reply className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Reply</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onReplyAll}>
            <ReplyAll className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Reply All</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onForward}>
            <Forward className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Forward</span>
          </Button>
        </div>
        <div className="flex gap-1 sm:gap-1.5 md:gap-2">
          <Button variant="ghost" size="icon">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{email.subject}</h1>
            
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="font-semibold text-sm sm:text-base">{email.from}</p>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <p>To: {email.to.join(', ')}</p>
                      {email.cc && email.cc.length > 0 && (
                        <p>Cc: {email.cc.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {format(emailDate, 'PPp')}
                  </span>
                </div>
              </CardHeader>
            </Card>
          </div>

          {downloadableAttachments.length > 0 && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                  <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {downloadableAttachments.length} Attachment{downloadableAttachments.length !== 1 && 's'}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  {downloadableAttachments.map((attachment: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-2 sm:p-3 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{attachment.filename}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processedBody }}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
