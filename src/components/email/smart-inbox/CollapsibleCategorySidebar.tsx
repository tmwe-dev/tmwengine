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
  onLockedChange?: (locked: boolean) => void;
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount,
  onLockedChange,
  onOpenChange
}: CollapsibleCategorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Mouse proximity tracking (40px detection)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isNear = e.clientX < 40;
      
      // Auto-open se vicino al bordo e non locked
      if (isNear && !isLocked && !isOpen) {
        setIsOpen(true);
        onOpenChange?.(true);
      }
      
      // Auto-close se lontano e non locked (280px sidebar + 100px buffer)
      if (e.clientX > 380 && !isLocked && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isLocked, isOpen, onOpenChange]);

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
      {/* Backdrop (quando aperta e non locked) */}
      {isOpen && !isLocked && (
        <div 
          className="fixed inset-0 bg-transparent z-[35]"
          onClick={() => {
            setIsOpen(false);
            onOpenChange?.(false);
          }}
        />
      )}

      {/* Sidebar scorrevole */}
      <aside
        className={cn(
          "h-full w-[280px] backdrop-blur-lg transition-all duration-300 ease-out border-r border-border/50",
          isLocked 
            ? "relative" 
            : "fixed left-0 top-0 z-40",
          isOpen || isLocked ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)'
        }}
      >
        {/* Header con lock button */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Categorie</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const newLocked = !isLocked;
              setIsLocked(newLocked);
              onLockedChange?.(newLocked);
            }}
            className={cn(
              "h-8 w-8",
              isLocked && "text-primary"
            )}
          >
            {isLocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
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
