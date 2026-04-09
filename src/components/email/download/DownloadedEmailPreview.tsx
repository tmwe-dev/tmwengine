import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DownloadedEmailPreviewProps {
  subject: string | null;
  sender: string | null;
  folder: string | null;
  body?: string | null;
  date?: string | null;
}

export function DownloadedEmailPreview({ subject, sender, folder, body, date }: DownloadedEmailPreviewProps) {
  const sanitizedBody = body ? DOMPurify.sanitize(body) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{subject || '(Senza oggetto)'}</CardTitle>
          {folder && <Badge variant="outline" className="text-xs">{folder}</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sender || 'Sconosciuto'}</span>
          {date && <span>• {new Date(date).toLocaleString('it-IT')}</span>}
        </div>
      </CardHeader>
      {sanitizedBody && (
        <CardContent>
          <div
            className="prose prose-sm dark:prose-invert max-w-none max-h-[300px] overflow-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        </CardContent>
      )}
    </Card>
  );
}
