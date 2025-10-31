import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SmartInboxTabIntelligent } from './SmartInboxTabIntelligent';

interface SmartInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SmartInboxDialog = ({ open, onOpenChange }: SmartInboxDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>✨ Inbox Intelligente</DialogTitle>
        </DialogHeader>
        {/* ✅ LAZY MOUNT: renderizza solo quando aperto */}
        {open && <SmartInboxTabIntelligent />}
      </DialogContent>
    </Dialog>
  );
};
