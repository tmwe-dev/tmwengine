import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { BulkActionsBar } from './BulkActionsBar';
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
  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-4 shrink-0">
        {/* Header principale */}
        <div className="flex items-center justify-between gap-4 flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-3">
            {/* Selettore Vista */}
            <ViewModeSelector value={viewMode} onChange={onViewModeChange} />
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
    </>
  );
};
