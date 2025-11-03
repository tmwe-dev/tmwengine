import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon } from '@/lib/smart-inbox-utils';
import { CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadView } from './EmailThreadView';

interface SmartEmailDetailIntelligentProps {
  classifiedEmail: ClassifiedEmail | null;
  onClose: () => void;
  onToggleCleanView: () => void;
}

export const SmartEmailDetailIntelligent = ({ classifiedEmail, onClose, onToggleCleanView }: SmartEmailDetailIntelligentProps) => {
  const { emails, currentEmailIndex, hasMore, loadMore, isLoading } = useEmailThread({
    emailId: classifiedEmail?.email?.email_id
  });

  if (!classifiedEmail) return null;

  const { classification, email } = classifiedEmail;
  const categoryColor = getCategoryColor(classification.category);
  const categoryIcon = getCategoryIcon(classification.category);
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);
  const isVerified = classification.is_verified && classification.confidence >= 80;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-white/10">
      {/* Header con chiusura */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
        <Avatar className="h-12 w-12">
          {classification.sender_logo_url ? (
            <AvatarImage src={classification.sender_logo_url} alt={companyName} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-lg truncate">{companyName}</div>
            <div className="flex flex-col items-end gap-2">
              <Badge 
                className="flex items-center gap-1 shrink-0"
                style={{ 
                  backgroundColor: categoryColor, 
                  color: 'white',
                  borderColor: categoryColor
                }}
              >
                <span>{categoryIcon}</span>
                {classification.category}
              </Badge>
              {/* Keywords */}
              {classification.keywords && classification.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end">
                  {classification.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {classification.sender_email}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content scrollabile */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-6">
          {/* Stato verificazione */}
          {isVerified && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Verificata
              </Badge>
            </div>
          )}

          {/* Riassunto AI con stile email body */}
          {classification.ai_summary && (
            <div className="border-l-4 border-purple-500 bg-purple-500/10 backdrop-blur-sm rounded-lg pl-4 py-3">
              <p className="text-sm text-white/90">
                {classification.ai_summary}
              </p>
            </div>
          )}

          {/* Thread Email */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">📧 Conversazione</h3>
            {isLoading ? (
              <div className="text-center py-8">Caricamento thread...</div>
            ) : (
              <EmailThreadView
                emails={emails}
                currentEmailIndex={currentEmailIndex}
                hasMore={hasMore}
                onLoadMore={loadMore}
                cleanMode={false}
              />
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer con toggle Vista Pulita */}
      <div className="shrink-0 p-4 border-t border-white/10">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onToggleCleanView}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Vista Pulita
        </Button>
      </div>
    </div>
  );
};
