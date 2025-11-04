import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';

interface SmartInboxHeaderProps {
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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const SmartInboxHeader = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onClassifyNew,
  isClassifying,
  classificationProgress,
  viewMode,
  onViewModeChange
}: SmartInboxHeaderProps) => {
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
  
  return (
    <div className="border-b p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">📬</span>
          Inbox Intelligente
        </h2>
        <div className="flex items-center gap-2">
          <ViewModeSelector value={viewMode} onChange={onViewModeChange} />
          <Button 
            onClick={onClassifyNew}
            variant="outline"
            size="sm"
            disabled={isClassifying}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isClassifying ? 'Classificazione...' : 'Classifica Nuove'}
          </Button>
        </div>
      </div>
      
      {isClassifying && classificationProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {classificationProgress.current} / {classificationProgress.total}
            </span>
            <span className="text-muted-foreground truncate max-w-[200px]">
              {classificationProgress.currentEmail}
            </span>
          </div>
          <Progress 
            value={(classificationProgress.current / classificationProgress.total) * 100} 
          />
        </div>
      )}
      
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Badge 
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => onCategoryChange('all')}
            className="cursor-pointer hover:bg-accent transition-colors"
          >
            Tutte ({totalCount})
          </Badge>
          
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent transition-colors whitespace-nowrap"
              style={selectedCategory === cat.id ? { 
                backgroundColor: cat.color,
                color: 'white',
                borderColor: cat.color
              } : undefined}
              onClick={() => onCategoryChange(cat.id)}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name} ({cat.count})
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};