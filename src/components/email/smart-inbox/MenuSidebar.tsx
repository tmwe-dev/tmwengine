import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';

interface MenuSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onSync: () => void;
  dbEmailCount?: number;
}

export function MenuSidebar({
  isOpen,
  onClose,
  selectedFolder,
  onFolderSelect,
  onSync,
  dbEmailCount = 0
}: MenuSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-[280px] z-40 backdrop-blur-lg transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "border-r border-border/50"
      )}
      style={{
        background: 'linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)'
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold">Menu</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="h-[calc(100%-4rem)]">
        <EmailSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={(folder) => {
            onFolderSelect(folder);
            onClose();
          }}
          onCompose={() => {}}
          onSync={onSync}
          dbEmailCount={dbEmailCount}
        />
      </div>
    </aside>
  );
}
