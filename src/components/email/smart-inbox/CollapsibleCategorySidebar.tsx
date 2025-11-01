import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryStats } from '@/types/smart-inbox';
import { CategoriesVerticalSidebar } from './CategoriesVerticalSidebar';
import { cn } from '@/lib/utils';

interface CollapsibleCategorySidebarProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  unverifiedCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLockedChange?: (locked: boolean) => void;
}

export function CollapsibleCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount,
  isOpen,
  onOpenChange,
  onLockedChange
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
          "h-full w-[280px] backdrop-blur-lg transition-all duration-300 ease-out",
          isLocked 
            ? "relative" 
            : "fixed left-0 top-0 z-40",
          isOpen || isLocked ? "translate-x-0" : "-translate-x-full",
          "border-r border-border/50"
        )}
        style={{
          background: 'linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)'
        }}
      >
        {/* Header con lock button */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">Categorie Email</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newLocked = !isLocked;
              setIsLocked(newLocked);
              if (!newLocked) onOpenChange(false);
            }}
            className={cn(
              "h-8 w-8",
              isLocked ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            )}
            title={isLocked ? "Sblocca sidebar" : "Blocca sidebar aperta"}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        </div>

        {/* Contenuto sidebar */}
        <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">
          <CategoriesVerticalSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            unverifiedCount={unverifiedCount}
          />
        </div>
      </aside>

    </>
  );
}
