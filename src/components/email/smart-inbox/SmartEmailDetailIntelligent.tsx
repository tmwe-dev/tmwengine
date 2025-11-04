import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon } from '@/lib/smart-inbox-utils';
import { X, Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEmailThread } from '@/hooks/useEmailThread';
import { useCompanyLogo } from '@/hooks/email/useCompanyLogo';
import { EmailThreadTabs } from './EmailThreadTabs';
import { SingleEmailCard } from './SingleEmailCard';

interface SmartEmailDetailIntelligentProps {
  classifiedEmail: ClassifiedEmail | null;
  onClose: () => void;
  onToggleCleanView: () => void;
}

// Helper: Ottieni icona per keyword
const getKeywordIcon = (keyword: string) => {
  const kw = keyword.toLowerCase();
  if (kw.includes('contratto') || kw.includes('commerciale')) return '📄';
  if (kw.includes('firma') || kw.includes('firmare')) return '✍️';
  if (kw.includes('scadenza') || kw.includes('ottobre') || kw.includes('deadline')) return '📅';
  if (kw.includes('urgente') || kw.includes('priority')) return '⚡';
  if (kw.includes('account') || kw.includes('manager')) return '👤';
  return null;
};

// Helper: Verifica se keyword è ridondante
const isRedundantKeyword = (keyword: string, companyName: string) => {
  const kw = keyword.toLowerCase();
  const company = companyName.toLowerCase();
  
  // Rimuovi keyword che ripetono nome azienda
  if (kw === company || kw.includes(company)) return true;
  
  // Rimuovi ruoli generici
  if (['account manager', 'manager', 'sales'].includes(kw)) return true;
  
  return false;
};

export const SmartEmailDetailIntelligent = ({ classifiedEmail, onClose, onToggleCleanView }: SmartEmailDetailIntelligentProps) => {
  const { emails, currentEmailIndex, hasMore, loadMore, isLoading } = useEmailThread({
    emailId: classifiedEmail?.email?.email_id
  });

  // 🆕 Recupera logo HD con cache
  const { data: logoData, isLoading: logoLoading } = useCompanyLogo(classifiedEmail?.classification?.sender_email);

  // 🆕 State per tab attivo
  const [activeEmailId, setActiveEmailId] = useState(
    emails[currentEmailIndex]?.id || classifiedEmail?.email?.email_id
  );

  const handlePrevEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === activeEmailId);
    if (currentIndex > 0) {
      setActiveEmailId(emails[currentIndex - 1].id);
    }
  };

  const handleNextEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === activeEmailId);
    if (currentIndex < emails.length - 1) {
      setActiveEmailId(emails[currentIndex + 1].id);
    }
  };

  if (!classifiedEmail) return null;

  const { classification, email } = classifiedEmail;
  const categoryColor = getCategoryColor(classification.category);
  const categoryIcon = getCategoryIcon(classification.category);
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);
  const isVerified = classification.is_verified && classification.confidence >= 80;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-purple-500/[0.02] to-blue-500/[0.02] backdrop-blur-sm rounded-2xl border border-white/10">
      {/* Header con layout a 3 colonne */}
      <div className="flex items-start gap-4 p-4 border-b border-white/10 shrink-0">
        {/* COLONNA 1: Logo + Nome Azienda (Sinistra) */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage 
              src={logoData?.logo_url || classification.sender_logo_url}
              alt={companyName}
              onError={(e) => {
                e.currentTarget.src = classification.sender_logo_url || '';
              }}
            />
            <AvatarFallback className="text-sm font-semibold">
              {logoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{companyName}</div>
            <div className="text-sm text-muted-foreground truncate">
              {classification.sender_email}
            </div>
          </div>
        </div>

        {/* COLONNA 2: Badge Categoria Principale (Centro) */}
        <div className="flex items-center justify-center flex-shrink-0">
          <Badge 
            className="text-sm font-semibold px-4 py-2 shadow-lg flex items-center gap-2"
            style={{ 
              backgroundColor: categoryColor, 
              color: 'white'
            }}
          >
            <span className="text-base">{categoryIcon}</span>
            {classification.category}
          </Badge>
        </div>

        {/* COLONNA 3: Keywords Intelligenti + Actions (Destra) */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Keywords con icone */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
              {classification.keywords
                .filter(kw => !isRedundantKeyword(kw, companyName))
                .map((keyword, idx) => {
                  const icon = getKeywordIcon(keyword);
                  const isImportant = ['firma urgente', 'scadenza', 'contratto', 'urgente'].some(k => 
                    keyword.toLowerCase().includes(k)
                  );
                  
                  return (
                    <Badge 
                      key={idx} 
                      variant={isImportant ? "default" : "outline"}
                      className={`
                        text-xs flex items-center gap-1
                        ${isImportant 
                          ? 'bg-white/10 text-white border-white/20' 
                          : 'bg-transparent border-0 text-white/70'
                        }
                      `}
                    >
                      {icon && <span className="text-sm">{icon}</span>}
                      {keyword}
                    </Badge>
                  );
                })
              }
            </div>
          )}
          
          {/* Pulsanti Eye e X */}
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleCleanView}
              className="shrink-0"
              title="Visualizza versione pulita"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 🆕 Content con Tabs (avvolge sia TabsList che TabsContent) */}
      {isLoading ? (
        <div className="text-center py-8">Caricamento thread...</div>
      ) : (
        <Tabs value={activeEmailId} onValueChange={setActiveEmailId} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs Navigation Orizzontale */}
          {emails.length > 0 && (
            <EmailThreadTabs
              emails={emails}
              activeEmailId={activeEmailId}
              onTabChange={setActiveEmailId}
              currentEmailIndex={currentEmailIndex}
              cleanMode={false}
            />
          )}

          {/* Content scrollabile con frecce laterali */}
          <div className="relative flex-1 flex flex-col overflow-hidden">
            {/* Freccia SINISTRA */}
            {emails.findIndex(e => e.id === activeEmailId) > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevEmail}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-purple-900/80 hover:bg-purple-800/90 border border-white/20 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            
            {/* Freccia DESTRA */}
            {emails.findIndex(e => e.id === activeEmailId) < emails.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextEmail}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-purple-900/80 hover:bg-purple-800/90 border border-white/20 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-4 p-6 px-16">
              {emails.map((email, index) => {
                const isCurrentOriginal = email.id === classifiedEmail.email.email_id;
                
                return (
                  <TabsContent key={email.id} value={email.id} className="mt-0">
                    {/* Riassunto AI (solo per email originale corrente) */}
                    {isCurrentOriginal && classification.ai_summary && (
                      <div className="border-l-4 border-purple-500 bg-purple-500/10 backdrop-blur-sm rounded-lg pl-4 py-3 mb-4">
                        <h4 className="text-xs font-semibold text-purple-300 mb-2">✨ Riassunto AI</h4>
                        <p className="text-sm text-white/90">
                          {classification.ai_summary}
                        </p>
                      </div>
                    )}
                    
                    {/* Single Email Card */}
                    <SingleEmailCard
                      email={email}
                      cleanMode={false}
                      isCurrent={index === currentEmailIndex}
                      isCollapsible={false}
                    />
                  </TabsContent>
                );
              })}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      )}

    </div>
  );
};
