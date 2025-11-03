import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useEmailThread } from '@/hooks/useEmailThread';
import { EmailThreadView } from './EmailThreadView';
import { ClassifiedEmail } from '@/types/smart-inbox';

interface SmartEmailDetailCleanProps {
  classifiedEmail: ClassifiedEmail | null;
  open: boolean;
  onClose: () => void;
}

export const SmartEmailDetailClean: React.FC<SmartEmailDetailCleanProps> = ({
  classifiedEmail,
  open,
  onClose
}) => {
  const { emails, currentEmailIndex, hasMore, loadMore, isLoading } = useEmailThread({
    emailId: classifiedEmail?.email?.email_id
  });

  if (!classifiedEmail) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl bg-white text-black overflow-y-auto"
      >
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="text-black">
            {classifiedEmail.email.subject}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6">
          {isLoading ? (
            <div className="text-center py-8">Caricamento thread...</div>
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
      </SheetContent>
    </Sheet>
  );
};
