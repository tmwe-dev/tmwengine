import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { AnimatedNavButton } from '@/components/ui/animated-nav-button';
import { AnimatedGroupButton } from '@/components/ui/animated-group-button';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ProfileDialog } from '@/components/tmwe/ProfileDialog';
import { IntranetNavItems } from '@/components/layout/IntranetNavItems';
import { GlobalCountrySelector } from '@/components/GlobalCountrySelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import findairLogo from '@/assets/findair-logo-header.png';
import {
  Users, 
  Calendar, 
  Mail, 
  BarChart3, 
  Settings, 
  Home,
  Menu,
  X,
  Search,
  MessageSquare,
  FileUp,
  Database,
  LogOut,
  Shield,
  ChevronDown,
  FileCheck,
  UserCog,
  Palette,
  Check,
  User,
  Sparkles
 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

const CRMLayout = ({ children }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, logout, userProfile } = useTMWEAuth();
  const { theme, setTheme, themes } = useTheme();

  // Stato gruppi menu
  const [groupStates, setGroupStates] = useState(() => {
    const saved = localStorage.getItem('nav-group-states');
    return saved ? JSON.parse(saved) : {
      'Commerciale': false,
      'Email': false,
      'Chat & AI': false,
      'Import': false
    };
  });

  // Salva stato gruppi
  useEffect(() => {
    localStorage.setItem('nav-group-states', JSON.stringify(groupStates));
  }, [groupStates]);

  const toggleGroup = (groupName) => {
    setGroupStates(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const themeColors = {
    lilla: 'from-blue-500 to-purple-600',
    ocean: 'from-teal-500 to-orange-500',
    sunset: 'from-orange-500 to-purple-600',
    forest: 'from-emerald-600 to-amber-600',
    sky: 'from-sky-500 to-yellow-400',
    pearl: 'from-slate-200 to-slate-300',
    mint: 'from-emerald-200 to-teal-200'
  };

  // Chiudi automaticamente la sidebar quando cambia la rotta
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navigationGroups = [
    {
      name: t('nav.commercial'),
      icon: BarChart3,
      items: [
        { name: t('nav.clients'), href: '/rubrica', icon: Users },
        { name: t('nav.commercial'), href: '/rubrica-avanzata', icon: Database },
        { name: t('nav.activities'), href: '/attivita', icon: Calendar },
        { name: t('nav.campaigns'), href: '/campagne', icon: BarChart3 },
      ]
    },
    {
      name: 'Email',
      icon: Mail,
      items: [
        { name: t('nav.emailManager'), href: '/email-manager', icon: Mail },
        { name: t('nav.emailCampaigns'), href: '/email-campagne', icon: Mail },
        { name: t('nav.senders'), href: '/email-senders', icon: UserCog },
      ]
    },
    {
      name: 'Chat & AI',
      icon: MessageSquare,
      items: [
        { name: t('nav.chat'), href: '/chat', icon: MessageSquare },
        { name: t('nav.laboratory'), href: '/chat-laboratory', icon: Sparkles },
      ],
      customContent: <IntranetNavItems isActive={isActive} sidebarOpen={sidebarOpen} />
    },
    {
      name: t('nav.import'),
      icon: FileUp,
      items: [
        { name: t('nav.manageImport'), href: '/gestisci-import', icon: FileCheck },
        { name: t('nav.importTemplates'), href: '/import-templates', icon: FileUp },
      ]
    }
  ];

  const standaloneItems = [
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  // Trova il nome della pagina corrente
  const getCurrentPageTitle = () => {
    // Cerca in tutti i gruppi
    for (const group of navigationGroups) {
      const found = group.items.find(item => isActive(item.href));
      if (found) return found.name;
    }
    // Controlla items standalone
    const standalone = standaloneItems.find(item => isActive(item.href));
    if (standalone) return standalone.name;
    // Controlla Intranet
    if (isActive('/intranet')) return 'Intranet';
    if (isActive('/intranet-admin')) return 'Admin Intranet';
    return 'Dashboard';
  };

  // Auto-espandi il gruppo che contiene la route attiva
  useEffect(() => {
    for (const group of navigationGroups) {
      const hasActiveItem = group.items.some(item => isActive(item.href));
      if (hasActiveItem && !groupStates[group.name]) {
        setGroupStates(prev => ({
          ...prev,
          [group.name]: true
        }));
      }
    }
    // Auto-espandi Chat & AI se siamo in Intranet
    if ((isActive('/intranet') || isActive('/intranet-admin')) && !groupStates['Chat & AI']) {
      setGroupStates(prev => ({
        ...prev,
        'Chat & AI': true
      }));
    }
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen"
      style={location.pathname === '/attivita' ? {
        background: 'linear-gradient(135deg, rgba(0, 240, 50, 0.15) 0px, rgba(0, 0, 0, 0.35) 600px, rgb(0, 0, 0) 600px)'
      } : {
        background: 'var(--gradient-page)'
      }}
    >
      {/* Header */}
      <header 
        className={cn(
          "flex items-center justify-between relative",
          location.pathname !== '/attivita' && "border-b border-border",
          isMobile ? "h-24 px-3 py-3" : "h-28 px-4 lg:px-6 py-3"
        )}
        >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Titolo allineato al bordo destro della sidebar */}
        <div 
          className="absolute left-0 flex items-center gap-2 transition-all duration-300"
          style={{
            marginLeft: sidebarOpen 
              ? isMobile ? '16rem' : '16rem'
              : isMobile ? '0' : '4rem',
            paddingLeft: '1rem'
          }}
        >
          {isMobile ? (
            // Mobile: mostra solo l'icona
            <Home className="h-6 w-6 text-foreground" />
          ) : (
            // Desktop: mostra il nome
            <h1 className="font-semibold text-foreground px-3 py-1.5 rounded-lg text-xl">
              {getCurrentPageTitle()}
            </h1>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {/* Logo */}
          <button 
            onClick={() => navigate(-1)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src={findairLogo} alt="FindAir Logo" className="h-8 w-auto md:h-11" />
          </button>

          {/* TMWE Profile Button - only show if user has profile */}
          {userProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProfileDialogOpen(true)}
              className="h-8 w-8 shrink-0"
              title="Profilo TMWE"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
          
          {/* Global Country Selector */}
          <GlobalCountrySelector />
          
          {/* Language Selector */}
          <LanguageSelector />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm text-foreground">
                    {userEmail?.split('@')[0] || 'Utente'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userEmail?.split('@')[0] || 'Utente'}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('nav.settings')}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t('settings.appearance')}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover z-50">
                    {Object.entries(themes).map(([key, value]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => setTheme(key)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={cn(
                            'w-5 h-5 rounded-full bg-gradient-to-r',
                            themeColors[key]
                          )} />
                          <span className="flex-1">{value.name}</span>
                          {theme === key && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  logout();
                  navigate('/auth');
                }}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className={cn("flex", isMobile ? "h-[calc(100vh-6rem)]" : "h-[calc(100vh-7rem)]")}>
        {/* Sidebar */}
        <aside className={`bg-card-transparent border-r border-border transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16'
        } overflow-hidden`}>
          <nav className="p-4 space-y-2">
            {/* Gruppi collassabili */}
            {navigationGroups.map((group) => {
              const isCollapsed = !sidebarOpen && !isMobile;
              const isGroupOpen = groupStates[group.name];
              const hasActiveItem = group.items.some(item => isActive(item.href));
              
              return (
                <Collapsible
                  key={group.name}
                  open={isGroupOpen}
                  onOpenChange={() => toggleGroup(group.name)}
                >
                  <AnimatedGroupButton
                    icon={group.icon}
                    label={group.name}
                    isActive={hasActiveItem}
                    isExpanded={isGroupOpen}
                    isCollapsed={isCollapsed}
                    colorScheme="primary"
                    className="w-full"
                  />
                  
                  <CollapsibleContent className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <AnimatedNavButton
                          key={item.name}
                          icon={item.icon}
                          label={item.name}
                          isActive={active}
                          isCollapsed={isCollapsed}
                          onClick={() => navigate(item.href)}
                          colorScheme="primary"
                          className={cn("w-full", !isCollapsed && "ml-6")}
                        />
                      );
                    })}
                    
                    {/* Custom content per Chat & AI (Intranet items) */}
                    {group.customContent && (
                      <div className={cn(!isCollapsed && "ml-6")}>
                        {group.customContent}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            
            {/* Items standalone */}
            <div className="pt-2 border-t border-border mt-2">
              {standaloneItems.map((item) => {
                const active = isActive(item.href);
                const isCollapsed = !sidebarOpen && !isMobile;
                
                return (
                  <AnimatedNavButton
                    key={item.name}
                    icon={item.icon}
                    label={item.name}
                    isActive={active}
                    isCollapsed={isCollapsed}
                    onClick={() => navigate(item.href)}
                    colorScheme="primary"
                    className="w-full"
                  />
                );
              })}
              
              {/* Theme Switcher in fondo */}
              {sidebarOpen && (
                <div className="pt-4 mt-2">
                  <ThemeSwitcher />
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className={location.pathname === '/chat' && isMobile ? '' : 'p-6'}>
            {children}
          </div>
        </main>
      </div>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={isProfileDialogOpen} 
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
};

export default CRMLayout;