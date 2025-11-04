import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutList, LayoutGrid, FileText } from 'lucide-react';

export type ViewMode = 'sequential' | 'tabs' | 'list' | 'split' | 'detail';

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSelector = ({ value, onChange }: ViewModeSelectorProps) => {
  // Supporta sia i nuovi valori (sequential/tabs) che i vecchi (list/split/detail)
  const isNewMode = value === 'sequential' || value === 'tabs';
  
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(val) => val && onChange(val as ViewMode)}
      className="bg-white/10 border border-white/15 rounded-lg p-0.5 h-8"
    >
      {isNewMode ? (
        <>
          <ToggleGroupItem 
            value="sequential" 
            aria-label="Vista Sequenziale"
            className="h-7 px-2 text-xs data-[state=on]:bg-white/25 data-[state=on]:text-white"
            title="Vista Sequenziale"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="tabs" 
            aria-label="Vista Tab"
            className="h-7 px-2 text-xs data-[state=on]:bg-white/25 data-[state=on]:text-white"
            title="Vista Tab"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </>
      ) : (
        <>
          <ToggleGroupItem 
            value="list" 
            aria-label="Vista Lista"
            className="h-7 px-2 text-xs data-[state=on]:bg-white/25 data-[state=on]:text-white"
            title="Solo Lista"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="split" 
            aria-label="Vista Divisa"
            className="h-7 px-2 text-xs data-[state=on]:bg-white/25 data-[state=on]:text-white"
            title="Vista Divisa"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="detail" 
            aria-label="Vista Dettaglio"
            className="h-7 px-2 text-xs data-[state=on]:bg-white/25 data-[state=on]:text-white"
            title="Solo Dettaglio"
          >
            <FileText className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </>
      )}
    </ToggleGroup>
  );
};
