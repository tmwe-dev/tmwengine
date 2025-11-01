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
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shrink-0">
        {/* Header principale */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white/90">
            <span className="text-2xl lg:text-4xl">🧠</span>
            <span>Inbox Intelligente</span>
          </h2>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Folder Selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2">
              <Folder className="h-4 w-4 text-white/60" />
              <Select value={selectedFolder} onValueChange={onFolderChange}>
                <SelectTrigger className="w-[140px] border-none bg-transparent text-white focus:ring-0">
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
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2">
              <Label htmlFor="unread-only" className="flex items-center gap-2 cursor-pointer text-white/80 text-sm">
                {unreadOnly ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                <span className="whitespace-nowrap">Solo Non Lette</span>
              </Label>
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
              className="gap-2 text-white/80 hover:text-white"
            >
              <FileText className="h-4 w-4" />
              Vedi Prompt
            </Button>
            
            {/* Pulsante Classifica Nuove - icona grande */}
            <Button 
              onClick={onClassifyNew}
              variant="outline"
              size="lg"
              disabled={isClassifying}
              className="rounded-2xl bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 hover:scale-105 transition-all flex flex-col items-center gap-1.5 h-auto py-3 px-4 lg:py-4 lg:px-6"
            >
              <Sparkles className="h-6 w-6 lg:h-8 lg:w-8" />
              <span className="text-xs lg:text-sm font-semibold">{isClassifying ? 'Classificazione...' : 'Classifica Nuove'}</span>
            </Button>
          </div>
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
