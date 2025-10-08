import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { AnimatedNavButton } from '@/components/ui/animated-nav-button';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ProfileDialog } from '@/components/tmwe/ProfileDialog';
import { IntranetNavItems } from '@/components/layout/IntranetNavItems';
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
  User
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

const CRMLayout = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, logout, userProfile } = useTMWEAuth();
  const { theme, setTheme, themes } = useTheme();

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

  const navigation = [
    { name: 'Clienti', href: '/rubrica', icon: Users },
    { name: 'Commerciale', href: '/rubrica-avanzata', icon: Database },
    { name: 'Attività', href: '/attivita', icon: Calendar },
    { name: 'Campagne', href: '/campagne', icon: BarChart3 },
    { name: 'Email Manager', href: '/email-manager', icon: Mail },
    { name: 'Gestione Mittenti', href: '/email-senders', icon: UserCog },
    { name: 'Chat AI', href: '/chat', icon: MessageSquare },
    { name: 'Import Templates', href: '/import-templates', icon: FileUp },
    { name: 'Gestisci Import', href: '/gestisci-import', icon: FileCheck },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

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
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex items-center gap-2">
            {isMobile ? (
              // Mobile: mostra solo l'icona
              (() => {
                const currentNav = navigation.find(nav => isActive(nav.href));
                const Icon = currentNav?.icon || Home;
                return <Icon className="h-6 w-6 text-foreground" />;
              })()
            ) : (
              // Desktop: mostra il nome
              <h1 className="font-semibold text-foreground px-3 py-1.5 rounded-lg text-xl">
                {navigation.find(nav => isActive(nav.href))?.name || 'Dashboard'}
              </h1>
            )}
          </div>
        </div>

        {/* Logo centrato */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src={findairLogo} alt="FindAir Logo" className="h-8 w-auto md:h-11" />
        </button>

        <div className="flex items-center gap-0.5">
          <AIGuideDialog />
          
          {/* TMWE Profile Button - only show if user has profile */}
          {userProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProfileDialogOpen(true)}
              className="h-8 w-8"
              title="Profilo TMWE"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
          
          <ThemeSwitcher />
          
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
                  Impostazioni
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cambia Tema
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
                Esci
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
            {navigation.map((item) => {
              const active = isActive(item.href);
              const isCollapsed = !sidebarOpen;
              
              return (
                <AnimatedNavButton
                  key={item.name}
                  icon={item.icon}
                  label={item.name}
                  isActive={active}
                  isCollapsed={isCollapsed && !isMobile}
                  onClick={() => navigate(item.href)}
                  colorScheme="primary"
                  className="w-full"
                />
              );
            })}
            
            {/* Intranet Navigation Items with Admin check */}
            <div className="pt-2 border-t border-border mt-2">
              <IntranetNavItems isActive={isActive} />
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