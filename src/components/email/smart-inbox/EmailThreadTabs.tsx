import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { User, Building2 } from 'lucide-react';

interface EmailThreadTabsProps {
  emails: any[];
  activeEmailId: string;
  onTabChange: (emailId: string) => void;
  currentEmailIndex: number;
  cleanMode?: boolean;
}

export const EmailThreadTabs: React.FC<EmailThreadTabsProps> = ({
  emails,
  activeEmailId,
  onTabChange,
  currentEmailIndex,
  cleanMode = false
}) => {
  const extractFirstName = (email: string): string => {
    if (!email) return 'Unknown';
    
    // Estrai parte prima della @
    const localPart = email.includes('@') ? email.split('@')[0] : email;
    
    // Gestisci formati: "carla.falcone" → "Carla", "cfalcone" → "Cfalcone"
    const namePart = localPart.split('.')[0]; // Prendi solo prima parte se c'è punto
    
    // Capitalizza prima lettera
    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  };

  interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className: string;
  }

  const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children, className }) => (
    <button
      onClick={onClick}
      className={className}
      role="tab"
      aria-selected={isActive}
      type="button"
    >
      {children}
    </button>
  );

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSimplifiedTabStyle = (isTmwe: boolean, isActive: boolean, cleanMode: boolean): string => {
    if (cleanMode) {
      // Clean Mode: Blu per TMWE, Grigio per altri
      if (isTmwe) {
        return isActive 
          ? 'border-2 border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/50'
          : 'border-2 border-blue-400 bg-blue-50 text-blue-700';
      }
      return isActive
        ? 'border-2 border-gray-600 bg-gray-600 text-white shadow-lg shadow-gray-500/50'
        : 'border-2 border-gray-400 bg-gray-50 text-gray-700';
    }
    
    // Dark Mode: Blu per TMWE, Viola per altri
    if (isTmwe) {
      return isActive
        ? 'border-2 border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/50'
        : 'border-2 border-blue-500/50 bg-blue-900/20 text-blue-200';
    }
    return isActive
      ? 'border-2 border-purple-300 bg-purple-500 text-white shadow-lg shadow-purple-500/50'
      : 'border-2 border-purple-500/50 bg-purple-900/20 text-purple-200';
  };

  return (
    <div className={`border-b ${cleanMode ? 'bg-gray-50 border-gray-200' : 'bg-muted/50 border-white/10'} shrink-0`}>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
          containScroll: "trimSnaps",
          axis: "x"
        }}
        className="w-full cursor-grab active:cursor-grabbing"
      >
        <CarouselContent className="-ml-2 py-1">
          {emails.map((email) => {
            const isTmwe = email.from_email?.toLowerCase().includes('tmwe') || false;
            const firstName = extractFirstName(email.from_email);
            const time = formatTime(email.data_ricezione);
            const icon = isTmwe ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />;
            const isActive = email.id === activeEmailId;
            
            return (
              <CarouselItem key={email.id} className="basis-auto pl-2">
                <TabButton
                  isActive={isActive}
                  onClick={() => onTabChange(email.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg
                    transition-all duration-200 shadow-sm hover:shadow-md
                    ${getSimplifiedTabStyle(isTmwe, isActive, cleanMode)}
                  `}
                >
                  {icon}
                  <span className="font-semibold text-xs whitespace-nowrap">
                    {firstName}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${isActive ? 'opacity-90' : 'opacity-60'}`}>
                    {time}
                  </span>
                </TabButton>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
