import { useState, useEffect } from 'react';
import { Lock, Unlock, Folder } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryStats } from '@/types/smart-inbox';
import { CategoriesVerticalSidebar } from './CategoriesVerticalSidebar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface CollapsibleCategorySidebarProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  unverifiedCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolder: string;
  unreadOnly: boolean;
  onFolderChange: (folder: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  availableFolders: string[];
}

export function CollapsibleCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount,
  isOpen,
  onOpenChange,
  selectedFolder,
  unreadOnly,
  onFolderChange,
  onUnreadOnlyChange,
  availableFolders
}: CollapsibleCategorySidebarProps) {
  const [isLocked, setIsLocked] = useState(false);

  // Trova categoria selezionata per il badge
  const getSelectedInfo = () => {
    if (selectedCategory === 'all') {
      const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
      return { icon: '📬', name: 'Tutte', count: totalCount, color: '#6366F1' };
    }
    if (selectedCategory === 'da-verificare') {
      return { icon: '🔍', name: 'Da Verificare', count: unverifiedCount, color: '#F97316' };
    }
    const cat = categories.find(c => c.id === selectedCategory);
    return cat || { icon: '📧', name: 'Email', count: 0, color: '#6B7280' };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <>
      {/* Sidebar scorrevole */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[280px] z-40 bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0 border-r border-white/10" : "-translate-x-full"
        )}
      >
        {/* Header con lock button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-sm font-semibold">Categorie</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsLocked(!isLocked)}
            className="h-8 w-8"
          >
            {isLocked ? (
              <Lock className="h-4 w-4 text-primary" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sezione Filtri */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <h4 className="text-xs font-semibold text-white/60 uppercase">Filtri</h4>
          
          {/* Folder Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/70">Cartella</label>
            <Select value={selectedFolder} onValueChange={onFolderChange}>
              <SelectTrigger className="w-full h-9 bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map(folder => (
                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unread Only Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-white/70">Solo non lette</label>
            <Switch checked={unreadOnly} onCheckedChange={onUnreadOnlyChange} />
          </div>
        </div>

        {/* Contenuto sidebar */}
        <div className="h-[calc(100%-18rem)] overflow-y-auto p-4">
          <CategoriesVerticalSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            unverifiedCount={unverifiedCount}
          />
        </div>
      </aside>

      {/* Backdrop (quando aperta e non locked) */}
      {isOpen && !isLocked && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
