import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Unlock, Folder, Sparkles, FileText, Eye, EyeOff, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { CategoriesVerticalSidebar } from './CategoriesVerticalSidebar';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';
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

  // 🆕 ZERO-SYNC: Fetch folder statistics from TMWE API
  const { data: folderStats } = useQuery({
    queryKey: ['folder-stats-zerosync', userEmail, selectedFolder],
    queryFn: async () => {
      if (!userEmail || !selectedFolder) return null;

      console.log('📊 [Zero-Sync] Fetching folder stats from API...');
      
      const { emailSearchApi } = await import('@/lib/tmwe-email-search-api');
      const apiStats = await emailSearchApi.getStatistics({ folder: selectedFolder });
      const totalEmails = apiStats?.data?.total || 0;
      
      const { count: totalClassified } = await supabase
        .from('email_ai_classifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('folder_name', selectedFolder);
      
      const classified = totalClassified || 0;
      const percentage = totalEmails > 0 ? Math.round((classified / totalEmails) * 100) : 0;
      
      return {
        totalInDB: totalEmails,
        totalClassified: classified,
        classificationPercentage: percentage
      };
    },
    enabled: !!userEmail && !!selectedFolder,
    staleTime: 30000
  });

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

  // Content-only: no fixed wrapper, no backdrop — rendered inside SidebarPortal
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Smart Inbox</h2>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ borderColor: selectedInfo.color }}
          >
            {selectedInfo.icon} {selectedInfo.count}
          </Badge>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Agent Selector */}
      <div className="p-4 border-b">
        <GlobalAIAgentSelector />
      </div>

      {/* Filtri e Azioni */}
      <div className="p-4 border-b space-y-3">
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/70">Solo non lette</label>
            <Switch checked={unreadOnly} onCheckedChange={onUnreadOnlyChange} />
          </div>
          <div className="flex items-center gap-1">
            <Button 
              onClick={onClassifyNew}
              variant="ghost"
              size="sm"
              disabled={isClassifying}
              className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPromptViewerChange(true)}
              className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
            >
              <FileText className="h-4 w-4" />
            </Button>
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

      {/* Folder Statistics */}
      {folderStats && (
        <div className="px-4 py-2 border-b border-white/10">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-3 space-y-1.5">
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
              <Progress 
                value={folderStats.classificationPercentage} 
                className="h-0.5 bg-white/10"
                style={{ '--progress-color': 'hsl(270, 70%, 65%)' } as React.CSSProperties}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories content */}
      <div className="flex-1 overflow-y-auto p-4">
        <CategoriesVerticalSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          unverifiedCount={unverifiedCount}
        />
      </div>
    </div>
  );
}
