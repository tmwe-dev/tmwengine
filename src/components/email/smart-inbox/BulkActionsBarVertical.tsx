import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Trash, FolderInput, Check } from 'lucide-react';
import { CategoryStats } from '@/types/smart-inbox';

interface BulkActionsBarVerticalProps {
  selectedCount: number;
  categories: CategoryStats[];
  onArchive: () => void;
  onDelete: () => void;
  onMove: (categoryId: string) => void;
  onBulkClassify: (categoryId: string) => void;
}

export function BulkActionsBarVertical({
  selectedCount,
  categories,
  onArchive,
  onDelete,
  onMove,
  onBulkClassify
}: BulkActionsBarVerticalProps) {
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
    <div className="flex flex-col gap-3 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
      {/* Select categoria */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-full rounded-xl bg-white/10 border-white/20">
          <SelectValue placeholder={`📧 ${selectedCount}`} />
        </SelectTrigger>
        <SelectContent>
          {categories.map(cat => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bottoni azioni verticali */}
      <div className="flex flex-col gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onArchive}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 justify-start"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archivia
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 justify-start"
        >
          <Trash className="h-4 w-4 mr-2" />
          Elimina
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMove}
          disabled={!selectedCategory}
          className="rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 justify-start"
        >
          <FolderInput className="h-4 w-4 mr-2" />
          Sposta
        </Button>

        <Button 
          size="sm" 
          onClick={handleApplyCategory}
          disabled={!selectedCategory}
          className="rounded-xl"
        >
          <Check className="h-4 w-4 mr-2" />
          Applica
        </Button>
      </div>
    </div>
  );
}
