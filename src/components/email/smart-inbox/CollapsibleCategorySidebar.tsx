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
}

export function CollapsibleCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount
}: CollapsibleCategorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Mouse proximity tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Considera offset di 64px per il badge spostato
      const adjustedX = e.clientX - 64;
      const isNear = adjustedX < 100;
      
      // Auto-open se vicino al bordo e non locked
      if (isNear && !isLocked && !isOpen) {
        setIsOpen(true);
      }
      
      // Auto-close se lontano e non locked (280px sidebar + 100px buffer)
      if (e.clientX > 380 && !isLocked && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isLocked, isOpen]);

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
      {/* Badge verticale (sempre visibile) */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed left-16 top-1/2 -translate-y-1/2 z-50 bg-card-transparent backdrop-blur-md border-r border-white/10 rounded-r-xl py-6 px-2 flex flex-col items-center gap-3 hover:bg-card-transparent/80 transition-all group",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
          <span className="text-2xl group-hover:scale-110 transition-transform">
            {selectedInfo.icon}
          </span>
          <div className="flex flex-col items-center gap-1">
            {selectedInfo.name.split(' ').map((word, i) => (
              <span key={i} className="text-[10px] font-semibold leading-tight writing-mode-vertical transform -rotate-180">
                {word}
              </span>
            ))}
          </div>
          <Badge 
            className="text-xs px-1.5 py-0.5 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${selectedInfo.color}50` }}
          >
            {selectedInfo.count}
          </Badge>
      </button>

      {/* Sidebar scorrevole */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[280px] z-40 backdrop-blur-lg transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(to bottom, hsl(220 91% 55% / 0.65) 0%, transparent 100%)'
        }}
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

      {/* Backdrop (quando aperta e non locked) */}
      {isOpen && !isLocked && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
