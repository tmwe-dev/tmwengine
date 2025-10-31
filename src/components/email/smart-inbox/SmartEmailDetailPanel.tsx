import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon, formatDate } from '@/lib/smart-inbox-utils';
import { Paperclip, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';

interface SmartEmailDetailPanelProps {
  classifiedEmail: ClassifiedEmail;
  onClose: () => void;
}

export const SmartEmailDetailPanel = ({ classifiedEmail, onClose }: SmartEmailDetailPanelProps) => {
  const [emailBody, setEmailBody] = useState<{ html?: string; text?: string } | null>(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);

  useEffect(() => {
    if (!classifiedEmail) {
      setEmailBody(null);
      return;
    }

    const fetchEmailBody = async () => {
      // Usa body_preview se disponibile
      if (classifiedEmail.email.body_preview) {
        setEmailBody({
          text: classifiedEmail.email.body_preview
        });
      }

      // Tenta recupero body completo se email_id disponibile
      if (!classifiedEmail.email.email_id) {
        console.warn('⚠️ email_id non disponibile - mostro solo body_preview');
        return;
      }

      setIsLoadingBody(true);
      try {
        const detailData = await emailSearchApi.getEmailDetail({
          email_id: classifiedEmail.email.email_id,
          include_body: true
        });

        if (detailData) {
          setEmailBody({
            html: detailData.body_html,
            text: detailData.body_text
          });
        }
      } catch (error: any) {
        console.error('❌ Error fetching email body:', error);
        toast.error('Errore caricamento corpo email');
      } finally {
        setIsLoadingBody(false);
      }
    };

    fetchEmailBody();
  }, [classifiedEmail]);

  const { classification, email } = classifiedEmail;
  const categoryColor = getCategoryColor(classification.category);
  const categoryIcon = getCategoryIcon(classification.category);
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);
  const isVerified = classification.is_verified && classification.confidence >= 80;

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 animate-fade-in">
      {/* Header con chiudi */}
      <div className="shrink-0 px-6 py-3 border-b border-white/10 flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-white/20">
          {classification.sender_logo_url ? (
            <AvatarImage src={classification.sender_logo_url} alt={companyName} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{companyName}</div>
          <div className="text-sm text-muted-foreground truncate">
            {classification.sender_email}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Contenuto scrollabile */}
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-3 py-3">
          {/* Stato classificazione */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ 
                backgroundColor: categoryColor, 
                color: 'white',
                borderColor: categoryColor
              }}
            >
              <span className="text-base">{categoryIcon}</span>
              <span className="font-semibold">{classification.category}</span>
            </Badge>
            {isVerified ? (
              <Badge variant="outline" className="rounded-full">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Verificata
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full">
                <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                Da Verificare ({Math.round(classification.confidence)}%)
              </Badge>
            )}
          </div>

          {/* Riassunto AI */}
          {classification.ai_summary && (
            <details className="space-y-2" open>
              <summary className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                <span className="text-lg">📝</span>
                Riassunto AI
              </summary>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl mt-2">
                <p className="text-sm">{classification.ai_summary}</p>
              </div>
            </details>
          )}

          {/* Keywords */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {classification.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="rounded-full">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Oggetto email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Oggetto</h3>
              <span className="text-xs text-muted-foreground">
                {formatDate(email.date)}
              </span>
            </div>
            <p className="text-sm font-medium bg-white/5 p-3 rounded-lg border border-white/10">
              {email.subject || 'Nessun oggetto'}
            </p>
          </div>

          {/* Corpo email */}
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Contenuto
              {isLoadingBody && <Loader2 className="h-4 w-4 animate-spin" />}
            </h3>
            
            {isLoadingBody ? (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Caricamento...</p>
              </div>
            ) : emailBody?.html ? (
              <div 
                className="prose prose-sm max-w-none bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10"
                dangerouslySetInnerHTML={{ __html: emailBody.html }}
              />
            ) : emailBody?.text ? (
              <pre className="text-sm whitespace-pre-wrap bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 font-sans">
                {emailBody.text}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-white/5 p-4 rounded-xl border border-white/10">
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
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <p className="text-sm text-muted-foreground">
                  Questa email contiene allegati
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
