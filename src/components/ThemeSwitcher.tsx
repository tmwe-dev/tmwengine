import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  const themeColors: Record<Theme, string> = {
    lilla: 'bg-gradient-to-r from-blue-500 to-purple-600',
    ocean: 'bg-gradient-to-r from-teal-500 to-orange-500',
    sunset: 'bg-gradient-to-r from-orange-500 to-purple-600',
    forest: 'bg-gradient-to-r from-emerald-600 to-amber-600',
    sky: 'bg-gradient-to-r from-sky-500 to-yellow-400'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative w-full justify-start gap-2">
          <Palette className="h-4 w-4" />
          <span className="text-sm">Seleziona Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Seleziona Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(themes).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setTheme(key as Theme)}
            className={cn(
              'cursor-pointer',
              theme === key && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'w-6 h-6 rounded-full',
                themeColors[key as Theme]
              )} />
              <div className="flex-1">
                <div className="font-medium">{value.name}</div>
                <div className="text-xs text-muted-foreground">
                  {value.description}
                </div>
              </div>
              {theme === key && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
