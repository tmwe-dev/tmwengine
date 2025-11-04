import React from 'react';
import { Button } from '@/components/ui/button';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadView } from './EmailThreadView';
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
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              {emails.length} email
            </span>
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

      {/* Content scrollabile bianco */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {isLoading ? (
          <div className="text-center py-8 text-black">Caricamento thread...</div>
        ) : (
          <EmailThreadView
            emails={emails}
            currentEmailIndex={currentEmailIndex}
            hasMore={hasMore}
            onLoadMore={loadMore}
            cleanMode={true}
          />
        )}
      </div>

    </div>
  );
};
