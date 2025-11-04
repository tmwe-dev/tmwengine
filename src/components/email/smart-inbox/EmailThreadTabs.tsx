import React, { useEffect, useRef } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al tab attivo
  useEffect(() => {
    if (scrollRef.current) {
      const activeTab = scrollRef.current.querySelector(`[data-state="active"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeEmailId]);

  const getSenderName = (email: string): string => {
    if (!email) return 'Sconosciuto';
    return email.includes('@') ? email.split('@')[0] : email;
  };

  const formatTabDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getTabStyle = (index: number, isTmwe: boolean) => {
    const isCurrent = index === currentEmailIndex;
    
    if (cleanMode) {
      if (isCurrent) {
        return 'border-2 border-purple-600 bg-purple-100 text-purple-900 data-[state=active]:bg-purple-200';
      }
      if (isTmwe) {
        return 'border border-blue-400 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-100';
      }
      return 'border border-gray-300 bg-gray-50 text-gray-700 data-[state=active]:bg-gray-100';
    }
    
    // Dark mode
    if (isCurrent) {
      return 'border-2 border-purple-500 bg-purple-900/30 text-white data-[state=active]:bg-purple-800/40';
    }
    if (isTmwe) {
      return 'border border-blue-500/50 bg-blue-900/20 text-blue-200 data-[state=active]:bg-blue-800/30';
    }
    return 'border border-white/30 bg-gray-900/40 text-white/80 data-[state=active]:bg-gray-800/50';
  };

  return (
    <div className={`border-b ${cleanMode ? 'bg-gray-50 border-gray-200' : 'bg-muted/50 border-white/10'} shrink-0`}>
      <ScrollArea className="w-full">
        <div ref={scrollRef} className="p-2">
          <TabsList className="inline-flex h-auto gap-2 bg-transparent">
            {emails.map((email, index) => {
              const isTmwe = email.from_email?.toLowerCase().includes('tmwe') || false;
              const senderName = getSenderName(email.from_email);
              const icon = isTmwe ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />;
              
              return (
                <TabsTrigger
                  key={email.id}
                  value={email.id}
                  onClick={() => onTabChange(email.id)}
                  className={`
                    flex flex-col items-start gap-1 px-4 py-2 min-w-[140px] rounded-lg
                    transition-all duration-200 shadow-sm hover:shadow-md
                    ${getTabStyle(index, isTmwe)}
                  `}
                >
                  <div className="flex items-center gap-2 w-full">
                    {icon}
                    <span className="font-semibold text-sm truncate max-w-[100px]">
                      {senderName}
                    </span>
                  </div>
                  <span className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                    {formatTabDate(email.data_ricezione)}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </ScrollArea>
    </div>
  );
};
