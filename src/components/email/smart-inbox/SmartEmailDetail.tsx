import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { getCategoryColor, getCategoryIcon, extractCompanyName, extractInitials, formatDate } from '@/lib/smart-inbox-utils';
import { SmartEmailDetailPanel } from './SmartEmailDetailPanel';
import { ViewMode } from './ViewModeSelector';

interface SmartEmailDetailProps {
  classifiedEmail: ClassifiedEmail | null;
  open: boolean;
  onClose: () => void;
  viewMode?: ViewMode;
}

export const SmartEmailDetail = ({ classifiedEmail, open, onClose, viewMode = 'sequential' }: SmartEmailDetailProps) => {
  const [cleanViewMode, setCleanViewMode] = useState(false);

  if (!classifiedEmail) return null;

  const { classification, email } = classifiedEmail;

  // Se viewMode è 'tabs', usa SmartEmailDetailPanel invece del Sheet
  if (viewMode === 'tabs') {
    return open ? (
      <div className="fixed inset-0 z-50 bg-black/50">
        <div className="fixed inset-4 z-50">
          <SmartEmailDetailPanel
            classifiedEmail={classifiedEmail}
            onClose={onClose}
            cleanViewMode={cleanViewMode}
            onToggleCleanView={() => setCleanViewMode(!cleanViewMode)}
          />
        </div>
      </div>
    ) : null;
  }

  // Altrimenti, usa il Sheet classico (vista sequenziale)
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={classification.sender_logo_url || undefined} />
              <AvatarFallback className="text-2xl">
                {extractInitials(classification.sender_email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-bold">
                {extractCompanyName(classification.sender_email)}
              </h3>
              <p className="text-sm text-muted-foreground">{classification.sender_email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              className="text-white"
              style={{ backgroundColor: getCategoryColor(classification.category) }}
            >
              <span className="mr-1">{getCategoryIcon(classification.category)}</span>
              {classification.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Confidenza: {(classification.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </SheetHeader>
        
        <Card className="my-4 p-4 bg-muted/50">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Riassunto AI
          </h4>
          <p className="text-sm">{classification.ai_summary}</p>
          
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {classification.keywords.map(kw => (
                <Badge key={kw} variant="outline">{kw}</Badge>
              ))}
            </div>
          )}
        </Card>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Oggetto:</label>
            <p className="text-sm mt-1">{email.subject}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium">Data:</label>
            <p className="text-sm mt-1">{formatDate(email.date)}</p>
          </div>
          
          <Separator />
          
          <div>
            <label className="text-sm font-medium mb-2 block">Anteprima:</label>
            <p className="text-sm whitespace-pre-wrap">{email.body_preview || 'Nessun contenuto'}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};