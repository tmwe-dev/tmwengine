import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * SearchInput - Input di ricerca con icona e clear button
 * 
 * @example
 * ```tsx
 * <SearchInput
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 *   placeholder="Cerca..."
 *   onClear={() => setSearch('')}
 * />
 * ```
 */

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onClear,
  containerClassName,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        className={cn('pl-9 pr-9', className)}
        {...props}
      />
      {value && onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
