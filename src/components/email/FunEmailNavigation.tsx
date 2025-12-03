import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Zap, Inbox, Lightbulb, Bot, Sparkles } from 'lucide-react';

interface FunEmailNavigationProps {
  currentView: 'fun' | 'management' | 'suggestions' | 'inbox' | 'automations' | 'zero-sync';
}

export const FunEmailNavigation = ({ currentView }: FunEmailNavigationProps) => {
  const navigate = useNavigate();

  const tabs = [
    { value: 'management', label: 'Management', icon: Settings },
    { value: 'fun', label: 'Fun', icon: Zap },
    { value: 'inbox', label: 'Smart Inbox', icon: Inbox },
    { value: 'zero-sync', label: 'Zero-Sync', icon: Sparkles },
    { value: 'suggestions', label: 'Suggestions', icon: Lightbulb },
    { value: 'automations', label: 'Automations', icon: Bot },
  ] as const;

  const handleTabChange = (value: string) => {
    navigate(`/funnemail?tab=${value}`);
  };

  return (
    <Tabs value={currentView} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full justify-start border-b border-border/40 bg-transparent rounded-none h-12 p-0">
        {tabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-2"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
