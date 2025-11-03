import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { BulkActionsBar } from './BulkActionsBar';
import { EmailClassifierPromptEditor } from './EmailClassifierPromptEditor';
import { AIAgentSelector } from './AIAgentSelector';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';

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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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
  viewMode,
  onViewModeChange
}: SmartInboxHeaderIntelligentProps) => {
  const [promptViewerOpen, setPromptViewerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('gemini');
  
  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-4 shrink-0">
        {/* Header principale */}
        <div className="flex items-center justify-between gap-4 flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-3">
            <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white/90">
              <span className="text-2xl lg:text-4xl">🧠</span>
              <span>Inbox Intelligente</span>
            </h2>
            
            {/* Selettore Vista */}
            <ViewModeSelector value={viewMode} onChange={onViewModeChange} />
          </div>
          
          {/* Controlli destra con spaziatura */}
          <div className="flex items-center gap-4">
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

      {/* Dialog Prompt Editor */}
      <EmailClassifierPromptEditor 
        open={promptViewerOpen}
        onOpenChange={setPromptViewerOpen}
      />
    </>
  );
};
