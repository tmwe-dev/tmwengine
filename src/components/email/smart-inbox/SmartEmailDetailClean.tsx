import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadTabs } from './EmailThreadTabs';
import { SingleEmailCard } from './SingleEmailCard';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { X, EyeOff } from 'lucide-react';

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

          {/* Content scrollabile */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
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
        </Tabs>
      )}

    </div>
  );
};
