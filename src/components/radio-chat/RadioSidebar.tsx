import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RadioSidebar({ isOpen, onClose }: RadioSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-black/90 backdrop-blur-sm z-50",
        "border-r border-white/10",
        "transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <h2 className="text-white text-xl font-semibold mb-6 mt-2">
            Radio Chat
          </h2>
          
          {/* Placeholder per comandi futuri */}
          <div className="text-white/40 text-sm">
            Comandi disponibili a breve...
          </div>
        </div>
      </div>
    </>
  );
}
