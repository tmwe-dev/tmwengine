import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SmartInboxTabIntelligent } from './SmartInboxTabIntelligent';

interface SmartInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SmartInboxDialog = ({ open, onOpenChange }: SmartInboxDialogProps) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>✨ Inbox Intelligente</DialogTitle>
        </DialogHeader>
        {/* ✅ LAZY MOUNT: renderizza solo quando aperto */}
        {open && (
          <SmartInboxTabIntelligent 
            categoriesOpen={categoriesOpen}
            onCategoriesOpenChange={setCategoriesOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
