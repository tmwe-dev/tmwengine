import { Button } from '@/components/ui/button';
import { Sparkles, Archive, Trash, FolderInput, Check, ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CategoryStats } from '@/types/smart-inbox';
import { SmartAIParticipantSelector } from './SmartAIParticipantSelector';
import { useState, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<string>('');

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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span>Inbox Intelligente</span>
        </h2>
        
        <div className="flex gap-2 items-center">
          {/* Dropdown Azioni Bulk (visibile solo se selectedCount > 0) */}
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-10">
                  <span className="text-xs font-semibold">{selectedCount} selezionate</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-card z-50">
                {/* Select Categoria */}
                <div className="p-2">
                  <Select value={selectedCategoryForActions} onValueChange={setSelectedCategoryForActions}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Scegli categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <DropdownMenuSeparator />
                
                {/* Azioni */}
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archivia
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={onDelete}>
                  <Trash className="h-4 w-4 mr-2" />
                  Elimina
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => selectedCategoryForActions && onMove(selectedCategoryForActions)}
                  disabled={!selectedCategoryForActions}
                >
                  <FolderInput className="h-4 w-4 mr-2" />
                  Sposta in categoria
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => {
                    if (selectedCategoryForActions) {
                      onBulkClassify(selectedCategoryForActions);
                      setSelectedCategoryForActions('');
                    }
                  }}
                  disabled={!selectedCategoryForActions}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Applica Categoria
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
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
    </div>
  );
};
