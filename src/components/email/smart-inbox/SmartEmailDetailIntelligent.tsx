import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon } from '@/lib/smart-inbox-utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadView } from './EmailThreadView';

interface SmartEmailDetailIntelligentProps {
  classifiedEmail: ClassifiedEmail | null;
  open: boolean;
  onClose: () => void;
}

export const SmartEmailDetailIntelligent = ({ classifiedEmail, open, onClose }: SmartEmailDetailIntelligentProps) => {
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
      </SheetContent>
    </Sheet>
  );
};
