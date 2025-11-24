/**
 * Mobile-specific email detail view
 * Renders when user selects an email on mobile devices
 */
import { EmailDetail } from './EmailDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface EmailMobileViewProps {
  isMobile: boolean;
  showEmailList: boolean;
  selectedEmail: any;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onMarkAsRead: (emailId: string) => void;
  onBack: () => void;
  emailIds?: string[];
  currentEmailIndex?: number;
  currentFolder?: string;
}

export const EmailMobileView = ({
  isMobile,
  showEmailList,
  selectedEmail,
  onReply,
  onReplyAll,
  onForward,
  onMarkAsRead,
  onBack,
  emailIds = [],
  currentEmailIndex = 0,
  currentFolder = 'INBOX'
}: EmailMobileViewProps) => {
  if (!isMobile || showEmailList || !selectedEmail) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to list
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EmailDetail 
          email={selectedEmail}
          onReply={onReply}
          onReplyAll={onReplyAll}
          onForward={onForward}
          onMarkAsRead={onMarkAsRead}
          emailIds={emailIds}
          currentEmailIndex={currentEmailIndex}
          currentFolder={currentFolder}
        />
      </div>
    </div>
  );
};
