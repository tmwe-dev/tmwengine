import { useState, useRef, useEffect } from 'react';
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
import { AIActionFeedback } from '../automation/AIActionFeedback';

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
  // 🆕 Priorizar tmwe_email_id para thread (fallback a email_id local)
  const threadEmailId = classifiedEmail?.email?.email_id;
  const { emails, currentEmailIndex, hasMore, loadMore, isLoading } = useEmailThread({
    emailId: threadEmailId
  });

  // 🆕 Recupera logo HD con cache
  const { data: logoData, isLoading: logoLoading } = useCompanyLogo(classifiedEmail?.classification?.sender_email);

  // 🆕 Ref per controllare scroll position
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // 🆕 State per tab attivo
  const [activeEmailId, setActiveEmailId] = useState(
    emails[currentEmailIndex]?.id || classifiedEmail?.email?.email_id
  );

  // 🆕 Sincronizza activeEmailId quando cambia l'email selezionata
  useEffect(() => {
    if (emails.length > 0) {
      const initialEmailId = emails[currentEmailIndex]?.id || emails[0]?.id;
      setActiveEmailId(initialEmailId);
    }
  }, [classifiedEmail?.email?.email_id, emails, currentEmailIndex]);

  // 🆕 Mantieni scroll position quando cambia activeEmailId
  // NON scrollare automaticamente all'inizio
  useEffect(() => {
    if (scrollViewportRef.current && activeEmailId) {
      // Mantieni la posizione di scroll naturale, non resettare
      console.log('📧 Email cambiata, scroll position mantenuta');
    }
  }, [activeEmailId]);

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
      {/* Header Ultra-Compatto: tutto su 1 riga orizzontale */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-md border-b border-white/10 shrink-0">
        
        {/* SINISTRA: Logo + Nome + Email (tutto inline) */}
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          <Avatar className="h-8 w-8 shrink-0">
            {logoData?.logo_url || classification.sender_logo_url ? (
              <AvatarImage 
                src={logoData?.logo_url || classification.sender_logo_url}
                alt={companyName}
                onError={(e) => {
                  e.currentTarget.src = classification.sender_logo_url || '';
                }}
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
              {logoLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-bold text-sm truncate max-w-[200px]">{companyName}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[250px]">
              {classification.sender_email}
            </span>
          </div>
        </div>

        {/* CENTRO: Badge Categoria + Keywords (tutto inline orizzontale) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Badge Categoria Principale */}
          <Badge 
            className="text-xs font-semibold px-3 py-1 shadow-md flex items-center gap-1.5 h-6"
            style={{ 
              backgroundColor: categoryColor, 
              color: 'white'
            }}
          >
            <span className="text-sm">{categoryIcon}</span>
            {classification.category}
          </Badge>
          
          {/* Keywords Intelligenti (inline orizzontale) */}
          {classification.keywords && classification.keywords.length > 0 && (
            <>
              {classification.keywords
                .filter(kw => !isRedundantKeyword(kw, companyName))
                .slice(0, 3)
                .map((keyword, idx) => {
                  const icon = getKeywordIcon(keyword);
                  const isImportant = ['firma urgente', 'scadenza', 'contratto', 'urgente'].some(k => 
                    keyword.toLowerCase().includes(k)
                  );
                  
                  return (
                    <Badge 
                      key={idx} 
                      variant={isImportant ? "default" : "secondary"}
                      className={`
                        flex items-center justify-center h-6 w-6 p-0 rounded-full border-0
                        ${isImportant 
                          ? 'bg-white/10 text-white' 
                          : 'bg-transparent text-white/60'
                        }
                      `}
                    >
                      {icon && <span className="text-base">{icon}</span>}
                    </Badge>
                  );
                })
              }
            </>
          )}
        </div>

        {/* DESTRA: Pulsanti Eye + X */}
        <div className="flex gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCleanView}
            className="h-8 w-8 p-0"
            title="Visualizza versione pulita"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
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

            <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
              <div className="space-y-4 p-4 px-8">
              {emails.map((email, index) => {
                const isCurrentOriginal = email.id === classifiedEmail.email.email_id;
                
                return (
                  <TabsContent key={email.id} value={email.id} className="mt-0">
                    {/* Riassunto AI (solo per email originale corrente) */}
                    {isCurrentOriginal && classification.ai_summary && (
                      <>
                        <div className="border-l-4 border-purple-500 bg-purple-500/10 backdrop-blur-sm rounded-lg pl-4 py-3 mb-4">
                          <h4 className="text-xs font-semibold text-purple-300 mb-2">✨ Riassunto AI</h4>
                          <p className="text-sm text-white/90">
                            {classification.ai_summary}
                          </p>
                        </div>
                        
                        {/* INCREMENTO 10: AI Feedback UI */}
                        {classifiedEmail.email.email_id && (
                          <div className="mb-4 pl-4">
                            <AIActionFeedback
                              emailId={classifiedEmail.email.email_id}
                              aiSuggestion={classification.category}
                              actionType="classification"
                              confidenceScore={classification.confidence / 100}
                              senderEmail={classification.sender_email}
                              emailCategory={classification.category}
                            />
                          </div>
                        )}
                      </>
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
