import React from 'react';
import { Button } from '@/components/ui/button';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadView } from './EmailThreadView';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { X, Eye } from 'lucide-react';

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
        <h2 className="text-xl font-semibold text-black">
          {classifiedEmail.email.subject}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 text-black" />
        </Button>
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

      {/* Footer con toggle Vista Intelligente */}
      <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onToggleCleanView}
          className="w-full text-black border-gray-300 hover:bg-gray-50"
        >
          <Eye className="h-4 w-4 mr-2" />
          Vista Intelligente
        </Button>
      </div>
    </div>
  );
};
