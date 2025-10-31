import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { BulkActionsBar } from './BulkActionsBar';
import { SmartAIParticipantSelector } from './SmartAIParticipantSelector';
import { useState, useEffect } from 'react';

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
  onMove
}: SmartInboxHeaderIntelligentProps) => {
  const [selectedAiConfigId, setSelectedAiConfigId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('funnemail_ai_config');
    if (saved) setSelectedAiConfigId(saved);
  }, []);

  const handleAiConfigChange = (configId: string) => {
    setSelectedAiConfigId(configId);
    localStorage.setItem('funnemail_ai_config', configId);
  };
  
  return (
    <div className="space-y-2 shrink-0">
      {/* Header compatto */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span>Inbox Intelligente</span>
        </h2>
        
        <div className="flex gap-3 items-center">
          {/* 3 Icone AI */}
          <SmartAIParticipantSelector
            selectedConfigId={selectedAiConfigId}
            onConfigChange={handleAiConfigChange}
          />
          
          {/* Pulsante Classifica - più compatto */}
          <Button 
            onClick={onClassifyNew}
            variant="outline"
            size="sm"
            disabled={isClassifying}
            className="rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 h-10 px-4"
          >
            <Sparkles className="h-4 w-4" />
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
  );
};
