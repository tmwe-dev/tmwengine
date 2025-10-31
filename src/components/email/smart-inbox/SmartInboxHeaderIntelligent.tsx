import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from 'react';

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
  onBulkClassify
}: SmartInboxHeaderIntelligentProps) => {
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
  
  return (
    <div className="border-b p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          Inbox Intelligente
        </h2>
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
      
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
          <span className="text-sm font-medium">{selectedCount} email selezionate</span>
          <Select value={bulkCategory} onValueChange={setBulkCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Scegli categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            disabled={!bulkCategory}
            onClick={() => {
              onBulkClassify(bulkCategory);
              setBulkCategory('');
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Classifica
          </Button>
        </div>
      )}
      
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
          
          <Badge 
            variant={selectedCategory === 'da-verificare' ? 'default' : 'outline'}
            onClick={() => onCategoryChange('da-verificare')}
            className="cursor-pointer hover:bg-accent transition-colors"
          >
            🔍 Da Verificare ({unverifiedCount})
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
