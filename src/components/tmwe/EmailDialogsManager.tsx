/**
 * Manager for all email-related dialogs
 * Consolidates: ComposeDialog, DetailDialog, SenderAIChatDialog, SyncMonitor, SmartInboxDialog
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComposeDialog } from './ComposeDialog';
import { EmailDetail } from './EmailDetail';
import { SenderAIChatDialog } from '@/components/email/SenderAIChatDialog';

import { SmartInboxDialog } from '@/components/email/smart-inbox/SmartInboxDialog';
import type { QueryClient } from '@tanstack/react-query';

interface EmailDialogsManagerProps {
  // Compose Dialog
  composeOpen: boolean;
  replyTo: { uid: string; to: string; subject: string; originalBody: string; originalFrom: string; originalDate: string; isForward?: boolean } | undefined;
  onComposeClose: () => void;
  
  // Detail Dialog
  detailPopupOpen: boolean;
  setDetailPopupOpen: (open: boolean) => void;
  selectedEmail: any;
  isLoadingDetail: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete: () => void;
  onMarkAsRead: (emailId: string) => void;
  
  // AI Chat Dialog
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  selectedAIChatSender: string;
  
  // Sync Monitor
  syncMonitorOpen: boolean;
  setSyncMonitorOpen: (open: boolean) => void;
  
  // Smart Inbox
  smartInboxOpen: boolean;
  setSmartInboxOpen: (open: boolean) => void;
  
  queryClient: QueryClient;
}

export const EmailDialogsManager = ({
  composeOpen,
  replyTo,
  onComposeClose,
  detailPopupOpen,
  setDetailPopupOpen,
  selectedEmail,
  isLoadingDetail,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onMarkAsRead,
  aiChatOpen,
  setAiChatOpen,
  selectedAIChatSender,
  syncMonitorOpen,
  setSyncMonitorOpen,
  smartInboxOpen,
  setSmartInboxOpen,
  queryClient,
}: EmailDialogsManagerProps) => {
  return (
    <>
      {/* Compose Dialog */}
      <ComposeDialog 
        open={composeOpen} 
        onClose={onComposeClose} 
        replyTo={replyTo}
      />

      {/* Email Detail Dialog (Mobile) */}
      <Dialog open={detailPopupOpen} onOpenChange={setDetailPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {selectedEmail ? (
            <EmailDetail 
              email={selectedEmail}
              onReply={onReply}
              onReplyAll={onReplyAll}
              onForward={onForward}
              onDelete={onDelete}
              onMarkAsRead={onMarkAsRead}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              {isLoadingDetail ? 'Loading email...' : 'No email selected'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sender AI Chat Dialog */}
      <SenderAIChatDialog
        open={aiChatOpen}
        onOpenChange={setAiChatOpen}
        senderEmail={selectedAIChatSender}
      />

      {/* Sync Monitor Dialog */}
      <Dialog open={syncMonitorOpen} onOpenChange={setSyncMonitorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📊 Email Sync Monitor</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Sync monitor è stato sostituito dal nuovo sistema di download. Vai a <a href="/email-download" className="text-primary underline">/email-download</a>.</p>
        </DialogContent>
      </Dialog>

      {/* Smart Inbox Dialog */}
      <SmartInboxDialog 
        open={smartInboxOpen}
        onOpenChange={setSmartInboxOpen}
      />
    </>
  );
};
