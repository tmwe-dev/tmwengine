import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutList, LayoutGrid, FileText } from 'lucide-react';

export type ViewMode = 'list' | 'split' | 'detail';

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSelector = ({ value, onChange }: ViewModeSelectorProps) => {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(val) => val && onChange(val as ViewMode)}
      className="bg-white/5 border border-white/10 rounded-lg p-1"
    >
      <ToggleGroupItem 
        value="list" 
        aria-label="Vista Lista"
        className="data-[state=on]:bg-white/20"
      >
        <LayoutList className="h-4 w-4 mr-2" />
        Solo Lista
      </ToggleGroupItem>
      
      <ToggleGroupItem 
        value="split" 
        aria-label="Vista Divisa"
        className="data-[state=on]:bg-white/20"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Ibrida
      </ToggleGroupItem>
      
      <ToggleGroupItem 
        value="detail" 
        aria-label="Vista Dettaglio"
        className="data-[state=on]:bg-white/20"
      >
        <FileText className="h-4 w-4 mr-2" />
        Solo Dettaglio
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
