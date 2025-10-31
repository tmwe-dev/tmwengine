import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { BulkActionsBar } from './BulkActionsBar';
import { AIProviderSelector } from '@/components/chat-laboratory/AIProviderSelector';
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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shrink-0">
      {/* Header principale */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl lg:text-4xl">🧠</span>
          <span>Inbox Intelligente</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Selettore AI Provider */}
          <div className="min-w-[280px]">
            <AIProviderSelector
              selectedConfigId={selectedAiConfigId}
              onConfigChange={handleAiConfigChange}
            />
          </div>
          
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
  );
};
