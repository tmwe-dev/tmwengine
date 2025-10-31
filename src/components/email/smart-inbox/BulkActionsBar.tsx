import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Trash, FolderInput, Check } from 'lucide-react';
import { CategoryStats } from '@/types/smart-inbox';

interface BulkActionsBarProps {
  selectedCount: number;
  categories: CategoryStats[];
  onArchive: () => void;
  onDelete: () => void;
  onMove: (categoryId: string) => void;
  onBulkClassify: (categoryId: string) => void;
}

export function BulkActionsBar({
  selectedCount,
  categories,
  onArchive,
  onDelete,
  onMove,
  onBulkClassify
}: BulkActionsBarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  if (selectedCount === 0) return null;

  const handleApplyCategory = () => {
    if (!selectedCategory) return;
    onBulkClassify(selectedCategory);
    setSelectedCategory('');
  };

  const handleMove = () => {
    if (!selectedCategory) return;
    onMove(selectedCategory);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white/10 backdrop-blur-md rounded-2xl border-none">
      {/* Select email selezionate + categoria */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-[220px] rounded-xl bg-white/10 border-white/20">
          <SelectValue placeholder={`📧 ${selectedCount} email selezionate`} />
        </SelectTrigger>
        <SelectContent>
          {categories.map(cat => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bottoni azioni orizzontali */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onArchive}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archivia
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10"
        >
          <Trash className="h-4 w-4 mr-2" />
          Elimina
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMove}
          disabled={!selectedCategory}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10"
        >
          <FolderInput className="h-4 w-4 mr-2" />
          Sposta
        </Button>
      </div>

      {/* Bottone Conferma/Applica */}
      <Button 
        size="sm" 
        onClick={handleApplyCategory}
        disabled={!selectedCategory}
        className="rounded-xl ml-auto"
      >
        <Check className="h-4 w-4 mr-2" />
        Applica Categoria
      </Button>
    </div>
  );
}
