import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        return `border-2 ${isActive ? 'border-blue-600 bg-blue-100' : 'border-blue-400 bg-blue-50'} text-blue-700`;
      }
      return `border-2 ${isActive ? 'border-gray-600 bg-gray-100' : 'border-gray-400 bg-gray-50'} text-gray-700`;
    }
    
    // Dark Mode: Blu per TMWE, Viola per altri
    if (isTmwe) {
      return `border-2 ${isActive ? 'border-blue-400 bg-blue-900/40' : 'border-blue-500/50 bg-blue-900/20'} text-blue-200`;
    }
    return `border-2 ${isActive ? 'border-purple-400 bg-purple-900/40' : 'border-purple-500/50 bg-purple-900/20'} text-purple-200`;
  };

  return (
    <div className={`border-b relative ${cleanMode ? 'bg-gray-50 border-gray-200' : 'bg-muted/50 border-white/10'} shrink-0 px-16`}>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
          containScroll: "trimSnaps"
        }}
        className="w-full"
      >
        {/* Freccia SINISTRA */}
        <CarouselPrevious 
          className={`absolute left-2 top-1/2 -translate-y-1/2 ${cleanMode ? 'bg-white border-gray-300' : 'bg-gray-800/80 border-white/20'}`}
        />
        
        <CarouselContent className="-ml-2 py-2">
          <TabsList className="inline-flex h-auto gap-2 bg-transparent">
            {emails.map((email) => {
              const isTmwe = email.from_email?.toLowerCase().includes('tmwe') || false;
              const firstName = extractFirstName(email.from_email);
              const time = formatTime(email.data_ricezione);
              const icon = isTmwe ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />;
              const isActive = email.id === activeEmailId;
              
              return (
                <CarouselItem key={email.id} className="basis-auto pl-2">
                  <TabsTrigger
                    value={email.id}
                    onClick={() => onTabChange(email.id)}
                    className={`
                      flex flex-col items-start gap-1 px-4 py-2 min-w-[120px] rounded-lg
                      transition-all duration-200 shadow-sm hover:shadow-md
                      ${getSimplifiedTabStyle(isTmwe, isActive, cleanMode)}
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {icon}
                      <span className="font-semibold text-sm truncate max-w-[80px]">
                        {firstName}
                      </span>
                    </div>
                    <span className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                      {time}
                    </span>
                  </TabsTrigger>
                </CarouselItem>
              );
            })}
          </TabsList>
        </CarouselContent>
        
        {/* Freccia DESTRA */}
        <CarouselNext 
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${cleanMode ? 'bg-white border-gray-300' : 'bg-gray-800/80 border-white/20'}`}
        />
      </Carousel>
    </div>
  );
};
