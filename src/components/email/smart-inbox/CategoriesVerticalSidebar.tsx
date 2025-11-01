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
    <div className="w-full flex-shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-2 h-full overflow-y-auto">
      {/* Tutte */}
      <button
        onClick={() => onCategoryChange('all')}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
          selectedCategory === 'all'
            ? 'bg-primary/20 border-2 border-primary'
            : 'bg-white/5 border border-white/20 hover:bg-white/10'
        )}
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
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
          selectedCategory === 'da-verificare'
            ? 'bg-orange-500/20 border-2 border-orange-500'
            : 'bg-white/5 border border-white/20 hover:bg-white/10'
        )}
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
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
              isSelected
                ? 'border-2'
                : 'bg-white/5 border border-white/20 hover:bg-white/10'
            )}
            style={{
              borderColor: isSelected ? cat.color : undefined,
              backgroundColor: isSelected ? `${cat.color}20` : undefined
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
