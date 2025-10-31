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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shrink-0">
      {/* Header principale */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-4xl">🧠</span>
          <span>Inbox Intelligente</span>
        </h2>
        
        {/* Pulsante Classifica Nuove - icona grande */}
        <Button 
          onClick={onClassifyNew}
          variant="outline"
          size="lg"
          disabled={isClassifying}
          className="rounded-2xl bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 hover:scale-105 transition-all flex flex-col items-center gap-2 h-auto py-4 px-6"
        >
          <Sparkles className="h-8 w-8" />
          <span className="font-semibold">{isClassifying ? 'Classificazione...' : 'Classifica Nuove'}</span>
        </Button>
      </div>
      
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
          <span className="text-sm font-semibold">{selectedCount} email selezionate</span>
          <Select value={bulkCategory} onValueChange={setBulkCategory}>
            <SelectTrigger className="w-[200px] rounded-xl bg-white/10 border-white/20">
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
            className="rounded-xl"
          >
            <Check className="h-4 w-4 mr-2" />
            Classifica
          </Button>
        </div>
      )}
      
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
      
      {/* Badge Categorie - icone grandi */}
      <ScrollArea className="w-full max-h-32">
        <div className="flex gap-3 pb-2">
          {/* Badge "Tutte" */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 ${
              selectedCategory === 'all' 
                ? 'bg-primary/20 backdrop-blur-md border-2 border-primary' 
                : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
            }`}
          >
            <span className="text-3xl">📬</span>
            <span className="text-sm font-semibold">Tutte</span>
            <Badge className="rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5">
              {totalCount}
            </Badge>
          </button>
          
          {/* Badge "Da Verificare" */}
          <button
            onClick={() => onCategoryChange('da-verificare')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 ${
              selectedCategory === 'da-verificare' 
                ? 'bg-orange-500/20 backdrop-blur-md border-2 border-orange-500' 
                : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
            }`}
          >
            <span className="text-3xl">🔍</span>
            <span className="text-sm font-semibold">Da Verificare</span>
            <Badge className="rounded-full bg-orange-500/30 backdrop-blur-md px-2 py-0.5">
              {unverifiedCount}
            </Badge>
          </button>
          
          {/* Badge Categorie */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 ${
                selectedCategory === cat.id
                  ? 'backdrop-blur-md border-2'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
              }`}
              style={selectedCategory === cat.id ? { 
                backgroundColor: `${cat.color}30`,
                borderColor: cat.color
              } : undefined}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-semibold text-center leading-tight min-w-[80px]">
                {cat.name}
              </span>
              <Badge 
                className="rounded-full backdrop-blur-md px-2 py-0.5"
                style={{ backgroundColor: `${cat.color}50` }}
              >
                {cat.count}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
