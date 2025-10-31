import { Badge } from '@/components/ui/badge';
import { CategoryStats } from '@/types/smart-inbox';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/design-system/cards/GlassCard';

interface CategoriesVerticalSidebarProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  unverifiedCount: number;
}

export function CategoriesVerticalSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  unverifiedCount
}: CategoriesVerticalSidebarProps) {
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="w-[240px] flex-shrink-0 space-y-2 h-full overflow-y-auto">
      {/* Tutte */}
      <GlassCard
        blur="md"
        glossy={selectedCategory === 'all'}
        onClick={() => onCategoryChange('all')}
        className={cn(
          "cursor-pointer transition-all duration-300 p-3",
          selectedCategory === 'all'
            ? 'bg-primary/30 border-2 border-primary shadow-lg shadow-primary/30'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📬</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm text-white">Tutte</div>
          </div>
          <Badge className="bg-white/30 backdrop-blur-sm border border-white/20 text-white font-bold">
            {totalCount}
          </Badge>
        </div>
      </GlassCard>

      {/* Da Verificare */}
      <GlassCard
        blur="md"
        glossy={selectedCategory === 'da-verificare'}
        onClick={() => onCategoryChange('da-verificare')}
        className={cn(
          "cursor-pointer transition-all duration-300 p-3",
          selectedCategory === 'da-verificare'
            ? 'bg-orange-500/30 border-2 border-orange-500 shadow-lg shadow-orange-500/30'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm text-white">Da Verificare</div>
          </div>
          <Badge className="bg-orange-500/50 backdrop-blur-sm border border-orange-400/30 text-white font-bold">
            {unverifiedCount}
          </Badge>
        </div>
      </GlassCard>

      {/* Separatore */}
      <div className="border-t border-white/20 my-3" />

      {/* Categorie */}
      {categories.map(cat => (
        <GlassCard
          key={cat.id}
          blur="md"
          glossy={selectedCategory === cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            "cursor-pointer transition-all duration-300 p-3",
            selectedCategory === cat.id
              ? 'border-2 shadow-lg'
              : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30'
          )}
          style={selectedCategory === cat.id ? {
            backgroundColor: `${cat.color}30`,
            borderColor: cat.color,
            boxShadow: `0 8px 32px ${cat.color}30`
          } : undefined}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{cat.icon}</span>
            <div className="flex-1 text-left">
              <div className="font-semibold text-xs leading-tight text-white">{cat.name}</div>
            </div>
            <Badge 
              className="backdrop-blur-md border font-bold text-white"
              style={{ 
                backgroundColor: `${cat.color}60`,
                borderColor: `${cat.color}40`
              }}
            >
              {cat.count}
            </Badge>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
