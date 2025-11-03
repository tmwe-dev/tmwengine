import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Unlock, Folder, Sparkles, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { CategoriesVerticalSidebar } from './CategoriesVerticalSidebar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface CollapsibleCategorySidebarProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  unverifiedCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolder: string;
  unreadOnly: boolean;
  onFolderChange: (folder: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  availableFolders: string[];
  onClassifyNew: () => void;
  isClassifying: boolean;
  onPromptViewerChange: (open: boolean) => void;
}

export function CollapsibleCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount,
  isOpen,
  onOpenChange,
  selectedFolder,
  unreadOnly,
  onFolderChange,
  onUnreadOnlyChange,
  availableFolders,
  onClassifyNew,
  isClassifying,
  onPromptViewerChange
}: CollapsibleCategorySidebarProps) {
  const [isLocked, setIsLocked] = useState(false);

  // FASE 2: Fetch user email
  const { data: userEmail } = useQuery({
    queryKey: ['user-email'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || '';
    },
  });

  // FASE 2: Fetch folder statistics
  const { data: folderStats } = useQuery({
    queryKey: ['folder-stats', userEmail, selectedFolder],
    queryFn: async () => {
      if (!userEmail || !selectedFolder) return null;

      // Count total emails in DB for folder
      const { count: totalInDB } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('cartella', selectedFolder);
      
      // Count classified emails
      const { count: totalClassified } = await supabase
        .from('email_ai_classifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('folder_name', selectedFolder);
      
      const total = totalInDB || 0;
      const classified = totalClassified || 0;
      
      return {
        totalInDB: total,
        totalClassified: classified,
        classificationPercentage: total > 0 ? Math.round((classified / total) * 100) : 0
      };
    },
    enabled: !!userEmail && !!selectedFolder
  });

  // Trova categoria selezionata per il badge
  const getSelectedInfo = () => {
    if (selectedCategory === 'all') {
      const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
      return { icon: '📬', name: 'Tutte', count: totalCount, color: '#6366F1' };
    }
    if (selectedCategory === 'da-verificare') {
      return { icon: '🔍', name: 'Da Verificare', count: unverifiedCount, color: '#F97316' };
    }
    const cat = categories.find(c => c.id === selectedCategory);
    return cat || { icon: '📧', name: 'Email', count: 0, color: '#6B7280' };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <>
      {/* Sidebar scorrevole */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[280px] z-40 bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0 border-r border-white/10" : "-translate-x-full"
        )}
      >
        {/* Header con lock button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-sm font-semibold">Categorie</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsLocked(!isLocked)}
            className="h-8 w-8"
          >
            {isLocked ? (
              <Lock className="h-4 w-4 text-primary" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sezione Filtri */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <h4 className="text-xs font-semibold text-white/60 uppercase">Filtri</h4>
          
          {/* Folder Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/70">Cartella</label>
            <Select value={selectedFolder} onValueChange={onFolderChange}>
              <SelectTrigger className="w-full h-9 bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map(folder => (
                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unread Only Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-white/70">Solo non lette</label>
            <Switch checked={unreadOnly} onCheckedChange={onUnreadOnlyChange} />
          </div>
        </div>

        {/* Sezione Azioni AI */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <h4 className="text-xs font-semibold text-white/60 uppercase">Azioni AI</h4>
          
          <div className="flex items-center gap-2">
            {/* Pulsante Classifica */}
            <Button 
              onClick={onClassifyNew}
              variant="outline"
              size="sm"
              disabled={isClassifying}
              className="flex-1 border-0 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105 transition-all gap-1.5 h-9"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold">{isClassifying ? 'Classificazione...' : 'Classifica'}</span>
            </Button>

            {/* Pulsante Vedi Prompt */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPromptViewerChange(true)}
              className="gap-1 text-white/80 hover:text-white h-9 px-3"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* FASE 2: Folder Statistics */}
        {folderStats && (
          <div className="px-4 pt-3 pb-2 border-b border-white/10">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email nel DB:</span>
                  <span className="font-semibold">{folderStats.totalInDB}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Classificate:</span>
                  <span className="font-semibold text-green-400">
                    {folderStats.totalClassified}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progresso:</span>
                    <span className="font-semibold">{folderStats.classificationPercentage}%</span>
                  </div>
                  <Progress value={folderStats.classificationPercentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenuto sidebar */}
        <div className="h-[calc(100%-18rem)] overflow-y-auto p-4">
          <CategoriesVerticalSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            unverifiedCount={unverifiedCount}
          />
        </div>
      </aside>

      {/* Backdrop (quando aperta e non locked) */}
      {isOpen && !isLocked && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
