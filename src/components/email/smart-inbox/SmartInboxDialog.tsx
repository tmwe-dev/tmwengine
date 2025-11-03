import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SmartInboxTabIntelligent } from './SmartInboxTabIntelligent';
import { SmartInboxSyncGuard } from './SmartInboxSyncGuard';

interface SmartInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SmartInboxDialog = ({ open, onOpenChange }: SmartInboxDialogProps) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Get current user email
  const { data: userEmail } = useQuery({
    queryKey: ['current-user-email'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.email || null;
    },
    enabled: open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>✨ Inbox Intelligente</DialogTitle>
        </DialogHeader>
        
        {/* ✅ LAZY MOUNT + SYNC GUARD */}
        {open && userEmail && (
          <SmartInboxSyncGuard 
            userEmail={userEmail}
            selectedFolder={selectedFolder}
            unreadOnly={unreadOnly}
          >
            <SmartInboxTabIntelligent />
          </SmartInboxSyncGuard>
        )}
      </DialogContent>
    </Dialog>
  );
};
