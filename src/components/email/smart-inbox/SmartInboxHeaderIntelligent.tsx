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
import { useState, useRef, useEffect } from 'react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Blocco back gesture durante scroll laterale
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const startX = e.touches[0].clientX;
      (e.target as any)._startX = startX;
      (e.target as any)._scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!(e.target as any)._startX) return;
      
      const x = e.touches[0].clientX;
      const startX = (e.target as any)._startX;
      const startScrollLeft = (e.target as any)._scrollLeft;
      const walk = (startX - x) * 2;
      const newScrollLeft = startScrollLeft + walk;
      
      // Calcola limiti
      const maxScroll = container.scrollWidth - container.clientWidth;
      const isAtStart = startScrollLeft === 0;
      const isAtEnd = startScrollLeft >= maxScroll - 1;
      
      // Blocca browser navigation se stiamo scrollando dentro i limiti
      // o se stiamo scrollando verso l'interno (non verso i bordi esterni)
      const scrollingInward = 
        (isAtStart && walk > 0) || // All'inizio, scrollo verso destra
        (isAtEnd && walk < 0);     // Alla fine, scrollo verso sinistra
      
      const withinBounds = newScrollLeft >= 0 && newScrollLeft <= maxScroll;
      
      if (withinBounds || scrollingInward) {
        e.preventDefault();
        e.stopPropagation();
        
        // Applica scroll con clamp ai limiti
        container.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
      }
    };

    const handleTouchEnd = () => {
      delete (container as any)._startX;
      delete (container as any)._scrollLeft;
      container.style.cursor = 'grab';
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shrink-0">
      {/* Header principale */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl lg:text-4xl">🧠</span>
          <span>Inbox Intelligente</span>
        </h2>
        
        {/* Pulsante Classifica Nuove - icona grande */}
        <Button 
          onClick={onClassifyNew}
          variant="outline"
          size="lg"
          disabled={isClassifying}
          className="rounded-2xl bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 hover:scale-105 transition-all flex flex-col items-center gap-1.5 h-auto py-3 px-4 lg:py-4 lg:px-6"
        >
          <Sparkles className="h-6 w-6 lg:h-8 lg:w-8" />
          <span className="text-xs lg:text-sm font-semibold">{isClassifying ? 'Classificazione...' : 'Classifica Nuove'}</span>
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
      <div 
        ref={scrollContainerRef}
        className="w-full overflow-x-auto smart-inbox-categories-scroll"
        style={{
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex gap-3 pb-2 min-w-max">
          {/* Badge "Tutte" */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all hover:scale-105 ${
              selectedCategory === 'all' 
                ? 'bg-primary/20 backdrop-blur-md border-2 border-primary' 
                : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
            }`}
          >
            <span className="text-2xl">📬</span>
            <span className="text-xs font-semibold">Tutte</span>
            <Badge className="rounded-full bg-white/20 backdrop-blur-md px-1.5 py-0.5 text-xs">
              {totalCount}
            </Badge>
          </button>
          
          {/* Badge "Da Verificare" */}
          <button
            onClick={() => onCategoryChange('da-verificare')}
            className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all hover:scale-105 overflow-hidden ${
              selectedCategory === 'da-verificare' 
                ? 'border-2' 
                : 'border hover:bg-white/20'
            }`}
            style={{
              borderColor: selectedCategory === 'da-verificare' 
                ? 'rgba(255, 154, 0, 0.6)' 
                : 'rgba(255, 255, 255, 0.4)',
              background: selectedCategory === 'da-verificare' 
                ? 'linear-gradient(135deg, rgba(255,154,0,0.25) 0%, rgba(255,154,0,0.15) 50%, rgba(255,154,0,0.20) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.15) 100%)',
              backdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: selectedCategory === 'da-verificare'
                ? '0 8px 32px rgba(255,154,0,0.3), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.2)'
                : '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)',
            }}
          >
            {/* Glossy shine overlay */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.1) 100%)',
                mixBlendMode: 'overlay',
              }}
            />
            <span className="text-2xl relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">🔍</span>
            <span className="text-xs font-bold relative z-10 text-gray-900 dark:text-white">Da Verificare</span>
            <Badge className="rounded-full bg-orange-500/30 backdrop-blur-md px-1.5 py-0.5 text-xs relative z-10">
              {unverifiedCount}
            </Badge>
          </button>
          
          {/* Badge Categorie */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all hover:scale-105 ${
                selectedCategory === cat.id
                  ? 'backdrop-blur-md border-2'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
              }`}
              style={selectedCategory === cat.id ? { 
                backgroundColor: `${cat.color}30`,
                borderColor: cat.color
              } : undefined}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-semibold text-center leading-tight min-w-[70px]">
                {cat.name}
              </span>
              <Badge 
                className="rounded-full backdrop-blur-md px-1.5 py-0.5 text-xs"
                style={{ backgroundColor: `${cat.color}50` }}
              >
                {cat.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
