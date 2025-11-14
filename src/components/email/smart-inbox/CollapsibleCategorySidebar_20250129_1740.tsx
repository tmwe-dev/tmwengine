import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Unlock, Folder, Sparkles, FileText, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { CategoriesVerticalSidebar } from './CategoriesVerticalSidebar';
import { AIAgentSelector } from './AIAgentSelector';
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
  selectedAgent: string;
  onAgentChange: (agent: string) => void;
  cleanViewMode?: boolean;
  onToggleCleanView?: () => void;
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
  onPromptViewerChange,
  selectedAgent,
  onAgentChange,
  cleanViewMode = false,
  onToggleCleanView
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
        {/* Header con AI Agent Selector centrato */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex-1 flex justify-center">
            <AIAgentSelector 
              selectedAgent={selectedAgent}
              onAgentChange={onAgentChange}
            />
          </div>
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

        {/* Filtri e Azioni su una riga */}
        <div className="p-4 border-b border-white/10 space-y-3">
          {/* Folder Selector */}
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

          {/* Riga unica: Toggle + Icone */}
          <div className="flex items-center justify-between gap-2">
            {/* Toggle Solo non lette */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/70">Solo non lette</label>
              <Switch checked={unreadOnly} onCheckedChange={onUnreadOnlyChange} />
            </div>

            {/* Icone Azioni */}
            <div className="flex items-center gap-1">
              {/* Icona Classifica */}
              <Button 
                onClick={onClassifyNew}
                variant="ghost"
                size="sm"
                disabled={isClassifying}
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
              >
                <Sparkles className="h-4 w-4" />
              </Button>

              {/* Icona Vedi Prompt */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPromptViewerChange(true)}
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
              >
                <FileText className="h-4 w-4" />
              </Button>

              {/* 🆕 Toggle Vista Pulita */}
              {onToggleCleanView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCleanView}
                  className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
                  title={cleanViewMode ? "Vista Intelligente" : "Vista Pulita"}
                >
                  {cleanViewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* FASE 2: Folder Statistics */}
        {folderStats && (
          <div className="px-4 py-2 border-b border-white/10">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3 space-y-1.5">
                {/* Numeri con icone su una riga */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>📧</span>
                    <span className="font-semibold">{folderStats.totalInDB}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>✅</span>
                    <span className="font-semibold text-green-400">{folderStats.totalClassified}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{folderStats.classificationPercentage}%</span>
                  </div>
                </div>
                {/* Barra progresso sottilissima lilla */}
                <Progress 
                  value={folderStats.classificationPercentage} 
                  className="h-0.5 bg-white/10"
                  style={{ '--progress-color': 'hsl(270, 70%, 65%)' } as React.CSSProperties}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenuto sidebar */}
        <div className="h-[calc(100%-22rem)] overflow-y-auto p-4">
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
