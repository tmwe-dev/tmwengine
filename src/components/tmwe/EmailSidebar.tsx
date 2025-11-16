import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  FolderOpen,
  RefreshCw,
  Settings,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { EmailSyncPreferences } from './EmailSyncPreferences';

interface EmailSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  onSync: () => void;
  totalEmails?: number;
  onClose?: () => void;
}

const folderIcons: Record<string, any> = {
  'INBOX': Inbox,
  'Sent': Send,
  'Drafts': FileText,
  'Trash': Trash2,
  'Junk': Trash2,
  'Archives': Archive,
};

const getFolderIcon = (folderName: string | undefined | null) => {
  // ✅ Validación defensiva
  if (!folderName || typeof folderName !== 'string') {
    console.warn('⚠️ getFolderIcon called with invalid name:', folderName);
    return Folder;
  }
  
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
  totalEmails = 0,
  onClose
}: EmailSidebarProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncPrefsOpen, setIsSyncPrefsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Recupera email utente
  useState(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tmwe_email')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.tmwe_email) {
          setUserEmail(profile.tmwe_email);
        }
      }
    };
    fetchUserEmail();
  });

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      // ✅ LECTURA: Usar /email_search para carpetas (rápido vía RPC)
      const result = await emailSearchApi.getFolders();
      console.log('📁 Folders from /email_search:', result);
      console.log('📁 Full result structure:', JSON.stringify(result, null, 2));
      return result;
    },
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

  // ✅ Detectar automáticamente la estructura de la respuesta
  const folders = (() => {
    if (!foldersData) {
      console.log('📁 No foldersData');
      return [];
    }
    
    // Opción 1: result.folders (actual)
    if (Array.isArray(foldersData.folders)) {
      console.log('📁 Using foldersData.folders:', foldersData.folders.length);
      return foldersData.folders;
    }
    
    // Opción 2: result.data.folders
    if (foldersData.data && Array.isArray(foldersData.data.folders)) {
      console.log('📁 Using foldersData.data.folders:', foldersData.data.folders.length);
      return foldersData.data.folders;
    }
    
    // Opción 3: result.data (array directo)
    if (Array.isArray(foldersData.data)) {
      console.log('📁 Using foldersData.data as array:', foldersData.data.length);
      return foldersData.data;
    }
    
    // Opción 4: result mismo es el array
    if (Array.isArray(foldersData)) {
      console.log('📁 Using foldersData as array:', foldersData.length);
      return foldersData;
    }
    
    console.warn('⚠️ Unknown folder structure:', Object.keys(foldersData));
    return [];
  })();

  console.log('📁 Final folders array:', folders);
  
  // ✅ Filtrar carpetas inválidas primero
  const validFolders = folders.filter((f: any) => {
    if (!f || typeof f !== 'object') {
      console.warn('⚠️ Invalid folder object:', f);
      return false;
    }
    
    // Soportar tanto f.name como f.folder_name
    const folderName = f.name || f.folder_name || f.path;
    
    if (!folderName || typeof folderName !== 'string') {
      console.warn('⚠️ Folder missing name:', f);
      return false;
    }
    
    return true;
  });

  console.log('📁 Valid folders:', validFolders.length, 'of', folders.length);
  
  // Organize folders hierarchically
  interface FolderNode {
    folder: any;
    name: string;
    fullPath: string;
    children: FolderNode[];
    level: number;
  }

  const buildFolderTree = (folders: any[]): FolderNode[] => {
    const tree: FolderNode[] = [];
    const map = new Map<string, FolderNode>();

    folders.forEach((folder: any) => {
      const fullPath = folder.name || folder.folder_name || folder.path;
      const parts = fullPath.split('/');
      
      parts.forEach((part, index) => {
        const currentPath = parts.slice(0, index + 1).join('/');
        
        if (!map.has(currentPath)) {
          const node: FolderNode = {
            folder: index === parts.length - 1 ? folder : null,
            name: part,
            fullPath: currentPath,
            children: [],
            level: index,
          };
          
          map.set(currentPath, node);
          
          if (index === 0) {
            tree.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            const parent = map.get(parentPath);
            if (parent) {
              parent.children.push(node);
            }
          }
        }
      });
    });

    return tree;
  };

  const folderTree = buildFolderTree(validFolders);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const renderFolderNode = (node: FolderNode, isSubfolder = false): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.fullPath);
    const isSelected = selectedFolder === node.fullPath;
    
    // Get folder data if this is a real folder (not just a parent path)
      const folder = node.folder;
      const totalCount = folder ? (folder.total_messages || 0) : 0;
      const unseenCount = folder ? (folder.unread_messages || folder.unseen || 0) : 0;
    
    // Use filled icon for subfolders, outline for main folders
    const Icon = isSubfolder ? FolderOpen : getFolderIcon(node.name);
    
    return (
      <div key={node.fullPath}>
        <div className="flex items-center w-full">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-6 p-0 hover:bg-transparent"
              onClick={() => toggleFolder(node.fullPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant={isSelected ? 'secondary' : 'ghost'}
            className={cn(
              'relative flex-1 group transition-all duration-200 overflow-hidden justify-between',
              isSelected && 'bg-email-selected text-primary-foreground',
              'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left',
              isSelected 
                ? 'after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent'
                : 'after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent',
              'hover:bg-transparent',
              'hover:after:animate-line-bounce',
              !hasChildren && 'ml-6'
            )}
            style={{ paddingLeft: `${12 + node.level * 16}px` }}
            onClick={() => {
              console.log('📁 Folder clicked:', {
                fullPath: node.fullPath,
                hasFolder: !!folder,
                folderData: folder,
                timestamp: new Date().toISOString()
              });
              onFolderSelect(node.fullPath);
            }}
          >
            <div className="flex items-center min-w-0">
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-all duration-200 mr-3",
                "group-hover:scale-105",
                isSelected ? "text-purple-400 scale-110" : "scale-100"
              )} />
              <span className={cn(
                "truncate transition-transform duration-200",
                isSelected ? "text-purple-300 font-semibold" : ""
              )}>
                {node.name}
                {totalCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({totalCount})
                  </span>
                )}
              </span>
            </div>
          </Button>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children.map(child => renderFolderNode(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card-transparent">
      {onClose && (
        <>
          <div className="p-4 flex items-center justify-between border-b">
            <h2 className="text-lg font-semibold">Cartelle Email</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Chiudi sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
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
              {folderTree.map(node => renderFolderNode(node))}
              
              <Separator className="my-2" />
              <div className="px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nueva Carpeta
                </Button>
              </div>
              
              {folders.length === 0 && !isLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No se pudieron cargar las carpetas</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['folders'] })}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-2 space-y-2">
        <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-start">
          <span>Email totali: {totalEmails}</span>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          size="sm"
          onClick={() => setIsSyncPrefsOpen(true)}
        >
          <Settings className="h-4 w-4 mr-3" />
          Impostazioni Sync
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
          <div className="grid gap-4 py-4">
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

      <Dialog open={isSyncPrefsOpen} onOpenChange={setIsSyncPrefsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preferenze Sincronizzazione Email</DialogTitle>
            <DialogDescription>
              Configura quali cartelle scaricare durante la sincronizzazione
            </DialogDescription>
          </DialogHeader>
          {userEmail && (
            <EmailSyncPreferences 
              userEmail={userEmail} 
              onClose={() => setIsSyncPrefsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
