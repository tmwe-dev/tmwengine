import { Badge } from '@/components/ui/badge';
import { CategoryStats } from '@/types/smart-inbox';
import { cn } from '@/lib/utils';

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
    <div 
      className="w-full flex-shrink-0 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-2 h-full overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, hsl(220 91% 55% / 0.15) 0%, hsl(220 91% 55% / 0.05) 50%, transparent 100%)'
      }}
    >
      {/* Tutte */}
      <button
        onClick={() => onCategoryChange('all')}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden group",
          selectedCategory === 'all'
            ? 'border-2 border-primary'
            : 'border border-white/20 hover:border-white/40'
        )}
        style={{
          background: selectedCategory === 'all' 
            ? 'linear-gradient(135deg, hsl(220 91% 55% / 0.25) 0%, hsl(220 91% 55% / 0.10) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
        }}
      >
        <span className="text-2xl">📬</span>
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm">Tutte</div>
        </div>
        <Badge className="bg-white/20">{totalCount}</Badge>
      </button>

      {/* Da Verificare */}
      <button
        onClick={() => onCategoryChange('da-verificare')}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden group",
          selectedCategory === 'da-verificare'
            ? 'border-2 border-orange-500'
            : 'border border-white/20 hover:border-white/40'
        )}
        style={{
          background: selectedCategory === 'da-verificare' 
            ? 'linear-gradient(135deg, hsl(24 95% 53% / 0.25) 0%, hsl(24 95% 53% / 0.10) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
        }}
      >
        <span className="text-2xl">🔍</span>
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm">Da Verificare</div>
        </div>
        <Badge className="bg-orange-500/30">{unverifiedCount}</Badge>
      </button>

      {/* Separatore */}
      <div className="border-t border-white/10 my-2" />

      {/* Categorie */}
      {categories.map(cat => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden group",
              isSelected
                ? 'border-2'
                : 'border border-white/20 hover:border-white/40'
            )}
            style={{
              background: isSelected
                ? `linear-gradient(135deg, ${cat.color}40 0%, ${cat.color}15 100%)`
                : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              borderColor: isSelected ? cat.color : undefined
            }}
          >
          <span className="text-xl">{cat.icon}</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-xs leading-tight">{cat.name}</div>
          </div>
          <Badge style={{ backgroundColor: `${cat.color}50` }}>
            {cat.count}
          </Badge>
        </button>
      );
      })}
    </div>
  );
}
