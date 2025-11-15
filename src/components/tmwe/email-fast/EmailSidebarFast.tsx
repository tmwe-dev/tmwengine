import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Archive,
  FolderOpen,
  FolderClosed,
  Mail,
  PenSquare
} from 'lucide-react';
import { useFolderTreeFast, useUnreadCountsFast } from '@/hooks/email/useEmailFast';
import { cn } from '@/lib/utils';

interface EmailSidebarFastProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose?: () => void;
}

const folderIcons: Record<string, React.ReactNode> = {
  INBOX: <Inbox className="h-4 w-4" />,
  Sent: <Send className="h-4 w-4" />,
  Drafts: <FileText className="h-4 w-4" />,
  Starred: <Star className="h-4 w-4" />,
  Trash: <Trash2 className="h-4 w-4" />,
  Archive: <Archive className="h-4 w-4" />
};

const getFolderIcon = (folderName: string, isOpen?: boolean) => {
  // Check exact match first
  if (folderIcons[folderName]) return folderIcons[folderName];
  
  // Check partial matches
  for (const [key, icon] of Object.entries(folderIcons)) {
    if (folderName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  
  // Default folder icon
  return isOpen ? <FolderOpen className="h-4 w-4" /> : <FolderClosed className="h-4 w-4" />;
};

interface FolderNodeProps {
  folder: any;
  selectedFolder: string;
  unreadCounts: Record<string, number>;
  onSelect: (folder: string) => void;
  level?: number;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  selectedFolder,
  unreadCounts,
  onSelect,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const hasChildren = folder.children && folder.children.length > 0;
  const unreadCount = unreadCounts[folder.name] || 0;
  const isSelected = selectedFolder === folder.name;

  return (
    <div>
      <Button
        variant={isSelected ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-2 mb-1',
          level > 0 && 'ml-4'
        )}
        onClick={() => onSelect(folder.name)}
      >
        {hasChildren && (
          <span
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
        {getFolderIcon(folder.name, isExpanded)}
        <span className="flex-1 truncate text-left">
          {folder.display_name || folder.name}
        </span>
        {unreadCount > 0 && (
          <Badge variant="default" className="ml-auto">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {hasChildren && isExpanded && (
        <div className="ml-2">
          {folder.children.map((child: any) => (
            <FolderNode
              key={child.name}
              folder={child}
              selectedFolder={selectedFolder}
              unreadCounts={unreadCounts}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const EmailSidebarFast: React.FC<EmailSidebarFastProps> = ({
  selectedFolder,
  onFolderSelect,
  onCompose
}) => {
  const { data: folderTree, isLoading: isLoadingFolders } = useFolderTreeFast();
  const { data: unreadCounts } = useUnreadCountsFast();

  if (isLoadingFolders) {
    return (
      <div className="w-64 border-r bg-card">
        <LoadingState message="Cargando carpetas..." />
      </div>
    );
  }

  const folders = folderTree?.data?.tree || folderTree?.tree || [];
  const unreadMap: Record<string, number> = unreadCounts?.data || unreadCounts || {};

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          className="w-full gap-2"
          onClick={onCompose}
        >
          <PenSquare className="h-4 w-4" />
          Redactar
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {folders.length > 0 ? (
            folders.map((folder: any) => (
              <FolderNode
                key={folder.name}
                folder={folder}
                selectedFolder={selectedFolder}
                unreadCounts={unreadMap}
                onSelect={onFolderSelect}
              />
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No hay carpetas disponibles
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>Actualizado hace 30s</span>
        </div>
      </div>
    </div>
  );
};
