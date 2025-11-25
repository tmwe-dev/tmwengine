/**
 * Hook for email actions (delete, reply, forward, mark as read, bulk operations)
 * Consolidates all mutation logic and event handlers
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';

interface UseEmailActionsParams {
  selectedEmailId: string | null;
  selectedEmail: any;
  selectedFolder: string;
  setComposeOpen: (open: boolean) => void;
  setReplyTo: (replyTo: any) => void;
  setSelectedEmailId: (id: string | null) => void;
}

export const useEmailActions = ({
  selectedEmailId,
  selectedEmail,
  selectedFolder,
  setComposeOpen,
  setReplyTo,
  setSelectedEmailId,
}: UseEmailActionsParams) => {
  const queryClient = useQueryClient();

  const handleMarkAsRead = async (emailId: string) => {
    try {
      const result = await emailSearchApi.markAsRead(parseInt(emailId));
      
      // Handle structured error response
      if (result?.success === false) {
        console.warn('📧 Mark as read failed (IMAP):', result.error);
        // Don't show error toast for mark-as-read - it's not critical
        // The UI state can be updated locally even if IMAP fails
        return;
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    } catch (error) {
      console.error('Error marking email as read:', error);
      // Silent fail for mark-as-read - not critical
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (messageIds: string[]) => emailMessageApi.deleteMessages(messageIds),
    onSuccess: () => {
      toast.success('Email deleted');
      setSelectedEmailId(null);
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    },
    onError: () => {
      toast.error('Failed to delete email');
    },
  });

  const handleDelete = () => {
    if (!selectedEmailId) return;
    deleteMutation.mutate([selectedEmailId]);
  };

  const handleBulkDelete = async (emailIds: string[]) => {
    try {
      await emailMessageApi.deleteMessages(emailIds);
      toast.success(`Deleted ${emailIds.length} emails`);
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast.error('Failed to delete emails');
    }
  };

  const handleBulkArchive = async (emailIds: string[]) => {
    try {
      await emailMessageApi.moveMessages(emailIds, 'Archives');
      toast.success(`Archived ${emailIds.length} emails`);
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    } catch (error) {
      console.error('Error archiving emails:', error);
      toast.error('Failed to archive emails');
    }
  };

  const handleBulkForward = (emailIds: string[]) => {
    toast.info(`Forward ${emailIds.length} emails - feature coming soon`);
  };

  const handleBulkMarkAsRead = async (emailIds: string[]) => {
    try {
      const result = await emailMessageApi.markMessages(emailIds, 'read');
      
      // Handle structured error response from improved API
      if (result?.success === false) {
        if (result.error_type === 'connection_refused' || result.error_type === 'server_down') {
          toast.warning('Servidor de correo no disponible. Inténtalo más tarde.');
        } else {
          toast.error(result.error || 'Error al marcar emails como leídos');
        }
        return;
      }
      
      toast.success(`Marcados ${emailIds.length} emails como leídos`);
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    } catch (error) {
      console.error('Error marking emails as read:', error);
      toast.error('Error de conexión con el servidor de correo');
    }
  };

  const handleBulkMoveToFolder = async (emailIds: string[], destinationFolder: string) => {
    try {
      await emailMessageApi.moveMessages(emailIds, destinationFolder);
      toast.success(`Moved ${emailIds.length} emails to ${destinationFolder}`);
      queryClient.invalidateQueries({ 
        queryKey: ['messages', selectedFolder],
        exact: false
      });
    } catch (error) {
      console.error('Error moving emails:', error);
      toast.error('Failed to move emails');
    }
  };

  const handleSync = async () => {
    toast.info('Use Sync Monitor to start email synchronization');
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleReply = () => {
    if (!selectedEmail) {
      toast.error('No email selected');
      return;
    }
    setReplyTo({
      uid: selectedEmail.id,
      to: selectedEmail.from,
      subject: selectedEmail.subject.startsWith('Re: ') 
        ? selectedEmail.subject 
        : `Re: ${selectedEmail.subject}`,
      originalBody: selectedEmail.body,
      originalFrom: selectedEmail.from,
      originalDate: selectedEmail.date,
    });
    setComposeOpen(true);
  };

  const handleReplyAll = () => {
    if (!selectedEmail) {
      toast.error('No email selected');
      return;
    }
    const allRecipients = [selectedEmail.from, ...selectedEmail.to, ...selectedEmail.cc]
      .filter(Boolean)
      .join(', ');
    setReplyTo({
      uid: selectedEmail.id,
      to: allRecipients,
      subject: selectedEmail.subject.startsWith('Re: ') 
        ? selectedEmail.subject 
        : `Re: ${selectedEmail.subject}`,
      originalBody: selectedEmail.body,
      originalFrom: selectedEmail.from,
      originalDate: selectedEmail.date,
    });
    setComposeOpen(true);
  };

  const handleForward = () => {
    if (!selectedEmail) {
      toast.error('No email selected');
      return;
    }
    setReplyTo({
      uid: selectedEmail.id,
      to: '',
      subject: selectedEmail.subject.startsWith('Fwd: ') 
        ? selectedEmail.subject 
        : `Fwd: ${selectedEmail.subject}`,
      originalBody: selectedEmail.body,
      originalFrom: selectedEmail.from,
      originalDate: selectedEmail.date,
      isForward: true,
    });
    setComposeOpen(true);
  };

  return {
    handleSync,
    handleDelete,
    handleBulkDelete,
    handleBulkArchive,
    handleBulkForward,
    handleBulkMarkAsRead,
    handleBulkMoveToFolder,
    handleReply,
    handleReplyAll,
    handleForward,
    handleMarkAsRead,
  };
};
