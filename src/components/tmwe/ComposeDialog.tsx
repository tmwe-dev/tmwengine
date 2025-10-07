import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';
import { Send, X, Paperclip, FileIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/tmwe-fileUtils';

interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    uid: string;
    to: string;
    subject: string;
    originalBody: string;
    originalFrom: string;
    originalDate: string;
    isForward?: boolean;
  };
}

interface Attachment {
  filename: string;
  content: string;
  content_type: string;
  size: number;
}

export const ComposeDialog = ({ open, onClose, onSent, replyTo }: ComposeDialogProps) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update fields when replyTo changes
  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.isForward ? '' : replyTo.to);
      setCc('');
      setSubject(replyTo.subject);
      setBody(`\n\n\n--- ${replyTo.isForward ? 'Forwarded' : 'Original'} Message ---\nFrom: ${replyTo.originalFrom}\nDate: ${replyTo.originalDate}\n\n${replyTo.originalBody}`);
    } else {
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
    }
    setAttachments([]);
  }, [replyTo, open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        // Convert file to Base64
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          filename: file.name,
          content: base64Content,
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        });
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(`Failed to read file ${file.name}`);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      // Prepare attachments for API (remove size field, keep only required fields)
      const apiAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.content_type,
      }));

      if (replyTo) {
        if (replyTo.isForward) {
          // Strip HTML for plain text body, keep original for body_html
          const plainBody = body.replace(/<[^>]*>/g, '');
          await emailMessageApi.forwardMessage({
            uid: replyTo.uid,
            to: to.split(',').map(e => e.trim()).filter(Boolean),
            body: plainBody,
            body_html: body,
            cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
            bcc: [],
            attachments: apiAttachments
          });
        } else {
          await emailMessageApi.replyMessage({
            uid: replyTo.uid,
            body: body,
            body_type: 'html',
            attachments: apiAttachments,
          });
        }
      } else {
        await emailMessageApi.sendMessage({
          to: to.split(',').map(e => e.trim()),
          cc: cc ? cc.split(',').map(e => e.trim()) : [],
          subject,
          body,
          body_type: 'html',
          attachments: apiAttachments,
        });
      }
      
      toast.success('Email sent successfully!');
      onSent?.();
      onClose();
      
      // Reset form
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
      setAttachments([]);
    } catch (error) {
      toast.error('Failed to send email');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {replyTo ? (replyTo.isForward ? 'Forward Email' : 'Reply to Email') : 'Compose New Email'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              placeholder="recipient@example.com, another@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={!!replyTo && !replyTo.isForward}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">Cc</Label>
            <Input
              id="cc"
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!!replyTo && !replyTo.isForward}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="resize-none"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Add Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="*/*"
              />
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
