import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Archive,
  Folder,
  RefreshCw,
  Settings,
  Plus,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface EmailSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  onSync: () => void;
  dbEmailCount?: number;
}

const folderIcons: Record<string, any> = {
  'INBOX': Inbox,
  'Sent': Send,
  'Drafts': FileText,
  'Trash': Trash2,
  'Junk': Trash2,
  'Archives': Archive,
};

const getFolderIcon = (folderName: string) => {
  // Check exact match
  if (folderIcons[folderName]) return folderIcons[folderName];
  
  // Check if it starts with a known folder (for subfolders like Archives/2024)
  for (const [key, icon] of Object.entries(folderIcons)) {
    if (folderName.startsWith(key)) return icon;
  }
  
  return Folder;
};

const folderNameSchema = z.string()
  .trim()
  .min(1, { message: "El nombre de la carpeta no puede estar vacío" })
  .max(50, { message: "El nombre de la carpeta debe tener menos de 50 caracteres" })
  .regex(/^[a-zA-Z0-9_\-\s]+$/, { message: "El nombre solo puede contener letras, números, guiones, guiones bajos y espacios" });

export const EmailSidebar = ({ 
  selectedFolder, 
  onFolderSelect, 
  onCompose,
  onSync,
  dbEmailCount = 0
}: EmailSidebarProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: emailFolderApi.getFolders,
  });

  const createFolderMutation = useMutation({
    mutationFn: (folderName: string) => emailFolderApi.createFolder(folderName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setIsCreateDialogOpen(false);
      setNewFolderName('');
      setFolderError('');
      toast({
        title: "Carpeta creada",
        description: "La carpeta se ha creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear carpeta",
        description: error.message || "No se pudo crear la carpeta",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = () => {
    setFolderError('');
    
    try {
      const validatedName = folderNameSchema.parse(newFolderName);
      createFolderMutation.mutate(validatedName);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFolderError(error.issues[0].message);
      }
    }
  };

  const folders = foldersData?.data || [];
  
  // Separate system folders from custom folders
  const systemFolderNames = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk'];
  const systemFolders = folders.filter((f: any) => 
    systemFolderNames.includes(f.name)
  );
  const customFolders = folders.filter((f: any) => 
    !systemFolderNames.includes(f.name)
  );

  const renderFolder = (folder: any) => {
    const Icon = getFolderIcon(folder.name);
    // Support both API formats: unread_messages (OpenAPI spec) and unseen (current API)
    const unseenCount = folder.unread_messages || folder.unseen || 0;
    const totalMessages = folder.total_messages || folder.messages || 0;
    const indent = folder.name.split('/').length - 1;
    
    return (
      <Button
        key={folder.name}
        variant={selectedFolder === folder.name ? 'secondary' : 'ghost'}
        className={cn(
          'relative w-full group transition-all duration-200 overflow-hidden',
          isCollapsed ? 'justify-center px-2' : 'justify-between',
          selectedFolder === folder.name && 'bg-email-selected text-primary-foreground',
          'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left',
          selectedFolder === folder.name 
            ? 'after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent'
            : 'after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent',
          'hover:bg-transparent',
          'hover:after:animate-line-bounce'
        )}
        style={{ paddingLeft: isCollapsed ? undefined : `${12 + indent * 16}px` }}
        onClick={() => onFolderSelect(folder.name)}
        title={isCollapsed ? `${folder.name} ${unseenCount > 0 ? `(${unseenCount})` : ''}` : undefined}
      >
        <div className={cn("flex items-center", isCollapsed ? "" : "min-w-0")}>
          <Icon className={cn(
            "h-4 w-4 flex-shrink-0 transition-all duration-200",
            "group-hover:scale-105 group-hover:animate-wiggle",
            selectedFolder === folder.name ? "text-purple-400 scale-110" : "scale-100",
            isCollapsed ? "" : "mr-3"
          )} />
          {!isCollapsed && (
            <span className={cn(
              "truncate transition-transform duration-200",
              "group-hover:scale-110",
              selectedFolder === folder.name ? "text-purple-300 font-semibold scale-110" : "scale-100"
            )}>
              {folder.name}
            </span>
          )}
        </div>
        {!isCollapsed && unseenCount > 0 && (
          <Badge variant="secondary" className={cn(
            "ml-2 h-5 min-w-5 px-1.5 flex-shrink-0 bg-transparent border",
            selectedFolder === folder.name 
              ? "text-purple-300 border-purple-300" 
              : "text-white border-white"
          )}>
            {unseenCount}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-card-transparent transition-all duration-300",
      isCollapsed ? "w-12 sm:w-14 md:w-16" : "w-48 sm:w-56 md:w-64 lg:w-72"
    )}>
      <div className="p-2 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <Separator />

      <ScrollArea className="flex-1 px-2">
        <div 
          className="space-y-1 py-2" 
          style={{ boxShadow: '-3px 0 0 0 hsla(0, 60%, 40%, 0.65)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {systemFolders.length > 0 && (
                <>
                  {systemFolders.map(renderFolder)}
                </>
              )}

              {customFolders.length > 0 && (
                <>
                  <Separator className="my-2" />
                  {!isCollapsed && (
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Folders</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {isCollapsed && (
                    <div className="px-2 py-1 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setIsCreateDialogOpen(true)}
                        title="Nuova Carpeta"
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {customFolders.map(renderFolder)}
                </>
              )}
              
              {customFolders.length === 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="px-2 py-1">
                    {isCollapsed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full p-2"
                        onClick={() => setIsCreateDialogOpen(true)}
                        title="Nuova Carpeta"
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Nueva Carpeta
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-2 space-y-2">
        {!isCollapsed && (
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-start">
            <span>Email nel DB: {dbEmailCount}</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          className={cn("w-full", isCollapsed ? "justify-center px-2" : "justify-start")} 
          size="sm"
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className={cn("h-4 w-4", isCollapsed ? "" : "mr-3")} />
          {!isCollapsed && "Settings"}
        </Button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nueva carpeta</DialogTitle>
            <DialogDescription>
              Ingresa el nombre de la nueva carpeta de correo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Nombre de la carpeta</Label>
              <Input
                id="folder-name"
                placeholder="Mi nueva carpeta"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setFolderError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder();
                  }
                }}
                maxLength={50}
              />
              {folderError && (
                <p className="text-sm text-destructive">{folderError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewFolderName('');
                setFolderError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? 'Creando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
