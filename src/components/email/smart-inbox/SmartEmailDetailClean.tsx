import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadTabs } from './EmailThreadTabs';
import { SingleEmailCard } from './SingleEmailCard';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { X, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

interface SmartEmailDetailCleanProps {
  classifiedEmail: ClassifiedEmail | null;
  onClose: () => void;
  onToggleCleanView: () => void;
}

export const SmartEmailDetailClean: React.FC<SmartEmailDetailCleanProps> = ({
  classifiedEmail,
  onClose,
  onToggleCleanView
}) => {
  const { emails, currentEmailIndex, hasMore, loadMore, isLoading } = useEmailThread({
    emailId: classifiedEmail?.email?.email_id
  });

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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200">
      {/* Header bianco con chiusura */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-black">
            {classifiedEmail.email.subject}
          </h2>
          {emails.length > 1 && (
            <Badge className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold">
              {emails.length} email
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCleanView}
            title="Torna alla vista intelligente"
          >
            <EyeOff className="h-4 w-4 text-black" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 text-black" />
          </Button>
        </div>
      </div>

      {/* 🆕 Content con Tabs (avvolge sia TabsList che TabsContent) */}
      {isLoading ? (
        <div className="text-center py-8 text-black bg-white p-6">Caricamento thread...</div>
      ) : (
        <Tabs value={activeEmailId} onValueChange={setActiveEmailId} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs Navigation Orizzontale */}
          {emails.length > 0 && (
            <EmailThreadTabs
              emails={emails}
              activeEmailId={activeEmailId}
              onTabChange={setActiveEmailId}
              currentEmailIndex={currentEmailIndex}
              cleanMode={true}
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
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-full"
              >
                <ChevronLeft className="h-5 w-5 text-black" />
              </Button>
            )}
            
            {/* Freccia DESTRA */}
            {emails.findIndex(e => e.id === activeEmailId) < emails.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextEmail}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-full"
              >
                <ChevronRight className="h-5 w-5 text-black" />
              </Button>
            )}

            <div className="flex-1 overflow-y-auto p-6 px-16 bg-white">
            {emails.map((email, index) => (
              <TabsContent key={email.id} value={email.id} className="mt-0">
                <SingleEmailCard
                  email={email}
                  cleanMode={true}
                  isCurrent={index === currentEmailIndex}
                  isCollapsible={false}
                />
              </TabsContent>
            ))}
            </div>
          </div>
        </Tabs>
      )}

    </div>
  );
};
