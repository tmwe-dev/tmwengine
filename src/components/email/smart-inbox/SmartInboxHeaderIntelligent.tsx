import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Folder, Mail, MailOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { BulkActionsBar } from './BulkActionsBar';
import { AIPromptViewer } from './AIPromptViewer';
import { AIAgentSelector } from './AIAgentSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SmartInboxHeaderIntelligentProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onClassifyNew: () => void;
  isClassifying: boolean;
  classificationProgress?: {
    current: number;
    total: number;
    currentEmail: string;
  };
  unverifiedCount: number;
  selectedCount: number;
  onBulkClassify: (category: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onMove: (categoryId: string) => void;
  selectedFolder: string;
  unreadOnly: boolean;
  onFolderChange: (folder: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  userEmail?: string;
}

export const SmartInboxHeaderIntelligent = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onClassifyNew,
  isClassifying,
  classificationProgress,
  unverifiedCount,
  selectedCount,
  onBulkClassify,
  onArchive,
  onDelete,
  onMove,
  selectedFolder,
  unreadOnly,
  onFolderChange,
  onUnreadOnlyChange,
  userEmail
}: SmartInboxHeaderIntelligentProps) => {
  const [promptViewerOpen, setPromptViewerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('gemini');

  // Fetch available folders
  const { data: availableFolders = [] } = useQuery({
    queryKey: ['available-folders', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      
      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', userEmail)
        .not('cartella', 'is', null);
      
      if (error) {
        console.error('Error fetching folders:', error);
        return [];
      }
      
      // Get unique folders
      const uniqueFolders = Array.from(new Set(data.map(d => d.cartella)));
      return uniqueFolders.sort();
    },
    enabled: !!userEmail
  });
  
  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-4 shrink-0">
        {/* Header principale */}
        <div className="flex items-center justify-start gap-2 flex-wrap lg:flex-nowrap">
          <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white/90">
            <span className="text-2xl lg:text-4xl">🧠</span>
            <span>Inbox Intelligente</span>
          </h2>
          
          {/* Folder Selector */}
          <div className="flex items-center gap-1">
            <Folder className="h-4 w-4 text-white/60" />
            <Select value={selectedFolder} onValueChange={onFolderChange}>
              <SelectTrigger className="w-[120px] border-none bg-transparent text-white focus:ring-0 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map(folder => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unread Only Toggle */}
          <div className="flex items-center gap-1.5">
            {unreadOnly ? <MailOpen className="h-4 w-4 text-white/60" /> : <Mail className="h-4 w-4 text-white/60" />}
            <Switch 
              id="unread-only"
              checked={unreadOnly} 
              onCheckedChange={onUnreadOnlyChange}
            />
          </div>

          {/* Selettore Agente AI */}
          <AIAgentSelector 
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
          />

          {/* Pulsante Vedi Prompt */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPromptViewerOpen(true)}
            className="gap-1 text-white/80 hover:text-white h-8 px-2"
          >
            <FileText className="h-4 w-4" />
          </Button>
          
          {/* Pulsante Classifica Nuove */}
          <Button 
            onClick={onClassifyNew}
            variant="outline"
            size="sm"
            disabled={isClassifying}
            className="border-0 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105 transition-all gap-1.5 h-8 px-3"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold">{isClassifying ? 'Classificazione...' : 'Classifica'}</span>
          </Button>
        </div>
      
      {/* Classification Progress Bar */}
      {isClassifying && classificationProgress && (
        <div className="space-y-2 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              {classificationProgress.current} / {classificationProgress.total}
            </span>
            <span className="text-muted-foreground truncate max-w-[300px]">
              {classificationProgress.currentEmail}
            </span>
          </div>
          <Progress 
            value={(classificationProgress.current / classificationProgress.total) * 100} 
            className="h-2 bg-white/20"
          />
        </div>
      )}

        {/* 🆕 Barra Azioni Unificata sotto i badge */}
        <BulkActionsBar
          selectedCount={selectedCount}
          categories={categories}
          onArchive={onArchive}
          onDelete={onDelete}
          onMove={onMove}
          onBulkClassify={onBulkClassify}
        />
      </div>

      {/* Dialog Prompt Viewer */}
      <AIPromptViewer 
        open={promptViewerOpen}
        onOpenChange={setPromptViewerOpen}
      />
    </>
  );
};
