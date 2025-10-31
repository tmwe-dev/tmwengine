/**
 * Controlli di ordinamento per le card dei mittenti
 * NUOVO COMPONENTE - Non tocca codice esistente
 */

import { ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export type SortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'count-asc' 
  | 'count-desc';

interface SenderSortControlsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SenderSortControls({ currentSort, onSortChange }: SenderSortControlsProps) {
  const sortOptions = [
    { value: 'name-asc' as SortOption, label: '📛 Nome A → Z', icon: SortAsc },
    { value: 'name-desc' as SortOption, label: '📛 Nome Z → A', icon: SortDesc },
    { value: 'count-desc' as SortOption, label: '📧 Email: Più email', icon: SortDesc },
    { value: 'count-asc' as SortOption, label: '📧 Email: Meno email', icon: SortAsc },
  ];

  const currentLabel = sortOptions.find(opt => opt.value === currentSort)?.label || 'Ordina';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Ordina mittenti per</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={currentSort === option.value ? 'bg-accent' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
