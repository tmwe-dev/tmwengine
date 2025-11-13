import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { AnimatedNavButton } from '@/components/ui/animated-nav-button';
import { AnimatedGroupButton } from '@/components/ui/animated-group-button';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { AIPromptsInspector } from '@/components/ai/AIPromptsInspector';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ProfileDialog } from '@/components/tmwe/ProfileDialog';
import { GlobalCountrySelector } from '@/components/GlobalCountrySelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import { TokenKeyIndicator } from '@/components/ui/token-key-indicator';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';
import { useNavigationGroups } from '@/hooks/useNavigationGroups';
import funEmailLogo from '@/assets/funnemail-logo.png';
import funEmailMascot from '@/assets/funnemail-mascot.png';
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
  Sparkles,
  Globe,
  Bug,
  Download,
  CheckCircle2,
  Brain,
  Zap
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
import { useCRMLayout } from '@/contexts/CRMLayoutContext';

const CRMLayout = ({ children }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { menuOpen, setMenuOpen } = useCRMLayout();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userEmail, logout, userProfile } = useTMWEAuth();
  const { theme, setTheme, themes } = useTheme();
  const [tmweToken, setTmweToken] = useState(null);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');

  // Carica il TMWE access token da localStorage
  useEffect(() => {
    const token = localStorage.getItem('tmwe_access_token');
    setTmweToken(token);
  }, []);

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
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navigationGroups = useNavigationGroups();

  const standaloneItems = [
    { name: 'Gestione Lingue', href: '/language-manager', icon: Globe },
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
          "flex items-center relative",
          location.pathname !== '/attivita' && "border-b border-border",
          isMobile ? "h-24 px-3 py-3" : "h-28 px-4 lg:px-6 py-3"
        )}
        >
        {/* Left side: Menu Button + Page Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            className="shrink-0"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* FunEmail Logo - visible only on /funnemail */}
            {location.pathname === '/funnemail' && (
              <div className="flex items-center gap-0.5 animate-in fade-in-0 slide-in-from-left-3 duration-300">
                <img 
                  src={funEmailMascot} 
                  alt="FunnEmail Mascot" 
                  className="w-auto"
                  style={{ height: '100px', maxHeight: '100px' }}
                />
                <img 
                  src={funEmailLogo} 
                  alt="FunnEmail" 
                  className="h-16 w-auto"
                />
              </div>
            )}

          {/* Page Title */}
          <div className="flex items-center gap-4">
            {isMobile ? (
              <Home className="h-6 w-6 text-foreground" />
            ) : (
              <>
                {location.pathname !== '/funnemail' && (
                  <h1 className="font-semibold text-foreground px-3 py-1.5 rounded-lg text-xl">
                    {getCurrentPageTitle()}
                  </h1>
                )}
                
                {/* FunEmail Tabs - visibili solo su /funnemail */}
                {location.pathname === '/funnemail' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant={searchParams.get('tab') === 'management' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate('/funnemail?tab=management')}
                    >
                      Management
                    </Button>
                    <Button
                      variant={searchParams.get('tab') === 'suggestions' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate('/funnemail?tab=suggestions')}
                      className="gap-1"
                    >
                      <Sparkles className="h-4 w-4" />
                      Suggerimenti AI
                    </Button>
                    <Button
                      variant={searchParams.get('tab') === 'inbox' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate('/funnemail?tab=inbox')}
                      className="gap-1"
                    >
                      <Brain className="h-4 w-4" />
                      Inbox AI
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center: Search Input - Solo in /email-manager */}
        <div className="flex-1 flex justify-center px-4">
          {location.pathname === '/email-manager' && !isMobile && (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca email..."
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('email-search', { 
                      detail: { query: emailSearchQuery } 
                    }));
                  }
                }}
                className="pl-9 h-9 w-full"
              />
            </div>
          )}
        </div>

        {/* Right side elements */}
        <div className="flex items-center gap-3">
          {/* Token + Compose + Debug - Spostati da LEFT a RIGHT */}
          {!isMobile && (
            <div className="flex items-center gap-1">
              <TokenKeyIndicator 
                tokenCount={tmweToken ? 1 : 0}
                variant="total"
                showLabel={false}
              />
              
              {/* Compose Email - Solo /email-manager */}
              {location.pathname === '/email-manager' && (
                <Button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-email-compose'));
                  }}
                  size="icon"
                  title="Compose new email"
                  className="h-8 w-8"
                >
                  <Mail
                    className="h-4 w-4"
                    style={{ 
                      filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 1px rgba(255,255,255,0.3))',
                      transform: 'perspective(100px) rotateX(15deg) rotateY(-10deg)'
                    }} 
                  />
                </Button>
              )}
              
              {/* Debug Monitor - Solo RadioChat in DEV */}
              {import.meta.env.DEV && location.pathname === '/radio-chat' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-debug-popup'));
                  }}
                  className="p-0.5 h-6 w-6"
                  title="Debug Monitor"
                >
                  <Bug className="w-4 h-4" />
                </Button>
              )}
              
              {/* Strumenti Email - Solo FunEmail */}
              {location.pathname === '/funnemail' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0.5 h-6 w-6"
                      title="Strumenti Email"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 bg-popover">
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => navigate('/single-fast')}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Single Fast
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          
          {/* AI Prompts Inspector */}
          <AIPromptsInspector />
          
          {/* Global AI Agent Selector */}
          {!isMobile && <GlobalAIAgentSelector />}
          
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
                onClick={async () => {
                  await logout();
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

      <div className={cn("relative", isMobile ? "h-[calc(100vh-6rem)]" : "h-[calc(100vh-7rem)]")}>
        {/* Backdrop quando menu aperto su mobile */}
        {menuOpen && isMobile && (
          <div 
            className="fixed inset-0 top-28 bg-black/20 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed left-0 top-28 h-[calc(100vh-7rem)] w-64 z-50",
          "bg-card-transparent border-r border-border",
          "transition-transform duration-300 overflow-hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-16"
        )}>
          <nav className="p-4 space-y-2">
            {/* Gruppi collassabili */}
            {navigationGroups.map((group) => {
              const isCollapsed = !menuOpen && !isMobile;
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
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            
            {/* Items standalone */}
            <div className="pt-2 border-t border-border mt-2">
              {standaloneItems.map((item) => {
                const active = isActive(item.href);
                const isCollapsed = !menuOpen && !isMobile;
                
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
              
              {/* Theme Switcher e Regionalizzazione */}
              {menuOpen && (
                <div className="space-y-2">
                  <div className="pt-4 mt-2">
                    <ThemeSwitcher />
                  </div>
                  
                  {/* Separatore */}
                  <div className="border-t border-border pt-2 mt-2" />
                  
                  {/* Language & Country Selectors */}
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t('settings.regionalization')}
                      </p>
                      <div className="space-y-2">
                        <LanguageSelector variant="sidebar" />
                        <GlobalCountrySelector variant="sidebar" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="w-full overflow-auto lg:ml-16">
          <div className={location.pathname === '/chat' && isMobile ? 'mt-[30px]' : location.pathname === '/radio-chat' ? '' : 'p-6 mt-[30px]'}>
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