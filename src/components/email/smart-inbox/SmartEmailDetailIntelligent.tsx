import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon, formatDate } from '@/lib/smart-inbox-utils';
import { Paperclip, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';

interface SmartEmailDetailIntelligentProps {
  classifiedEmail: ClassifiedEmail | null;
  open: boolean;
  onClose: () => void;
}

export const SmartEmailDetailIntelligent = ({ classifiedEmail, open, onClose }: SmartEmailDetailIntelligentProps) => {
  // ✅ NUOVO: Usa direttamente i dati dal DB (già disponibili nel prop)
  const emailBody = classifiedEmail ? {
    html: classifiedEmail.email.body_text,
    text: classifiedEmail.email.body_text
  } : null;
  const isLoadingBody = false; // Nessun caricamento necessario

  if (!classifiedEmail) return null;

  const { classification, email } = classifiedEmail;
  const categoryColor = getCategoryColor(classification.category);
  const categoryIcon = getCategoryIcon(classification.category);
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);
  const isVerified = classification.is_verified && classification.confidence >= 80;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {classification.sender_logo_url ? (
                <AvatarImage src={classification.sender_logo_url} alt={companyName} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-bold text-lg truncate">{companyName}</div>
              <div className="text-sm text-muted-foreground truncate">
                {classification.sender_email}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {/* Stato classificazione */}
            <div className="flex items-center gap-2">
              <Badge 
                className="flex items-center gap-1"
                style={{ 
                  backgroundColor: categoryColor, 
                  color: 'white',
                  borderColor: categoryColor
                }}
              >
                <span>{categoryIcon}</span>
                {classification.category}
              </Badge>
              {isVerified ? (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                  Verificata
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                  Da Verificare ({Math.round(classification.confidence)}%)
                </Badge>
              )}
            </div>

            {/* Riassunto AI */}
            {classification.ai_summary && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📝 Riassunto AI</h3>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {classification.ai_summary}
                </p>
              </div>
            )}

            {/* Keywords */}
            {classification.keywords && classification.keywords.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">🏷️ Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {classification.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Oggetto email */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Oggetto</h3>
                <span className="text-xs text-muted-foreground">
                  {formatDate(email.date)}
                </span>
              </div>
              <p className="text-sm font-medium">{email.subject || 'Nessun oggetto'}</p>
            </div>

            {/* Corpo email */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Contenuto
                {isLoadingBody && <Loader2 className="h-4 w-4 animate-spin" />}
              </h3>
              
              {isLoadingBody ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Caricamento...</p>
                </div>
              ) : emailBody?.html ? (
                <div 
                  className="prose prose-sm max-w-none bg-muted p-4 rounded-md"
                  dangerouslySetInnerHTML={{ __html: emailBody.html }}
                />
              ) : emailBody?.text ? (
                <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md font-sans">
                  {emailBody.text}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Contenuto non disponibile
                </p>
              )}
            </div>

            {/* Allegati */}
            {email.has_attachments && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Allegati
                </h3>
                <p className="text-sm text-muted-foreground">
                  Questa email contiene allegati
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
