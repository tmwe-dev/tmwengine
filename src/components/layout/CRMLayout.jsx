import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Button } from '@/components/ui/button';
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
  UserCog
 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, logout } = useTMWEAuth();

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
    { name: 'Tables', href: '/tables', icon: Database },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div 
      className="min-h-screen"
      style={location.pathname === '/attivita' ? {
        background: 'linear-gradient(135deg, rgba(0, 240, 50, 0.15) 0px, rgba(0, 0, 0, 0.35) 600px, rgb(0, 0, 0) 600px)'
      } : {
        background: 'linear-gradient(135deg, hsla(270, 70%, 60%, 0.35) 0px, hsla(0, 0%, 0%, 0.35) 600px, hsl(0, 0%, 0%) 600px)'
      }}
    >
      {/* Header */}
      <header 
        className={cn(
          "flex items-center justify-between relative",
          location.pathname !== '/attivita' && "border-b border-border",
          isMobile ? "h-14 px-2 py-2" : "h-28 px-4 lg:px-6 py-3"
        )}
      >
        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-4")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn("lg:hidden", isMobile ? "h-8 w-8" : "")}
          >
            {sidebarOpen ? <X className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} /> : <Menu className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />}
          </Button>
          
          {isMobile && (
            (() => {
              const currentNav = navigation.find(nav => isActive(nav.href));
              const Icon = currentNav?.icon || Home;
              return <Icon className="h-4 w-4 text-foreground ml-0.5" />;
            })()
          )}
          
          {!isMobile && (
            <h1 className="font-semibold text-foreground px-3 py-1.5 rounded-lg text-xl">
              {navigation.find(nav => isActive(nav.href))?.name || 'Dashboard'}
            </h1>
          )}
        </div>

        {/* Logo centrato */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img src={findairLogo} alt="FindAir Logo" className={cn("w-auto", isMobile ? "h-6" : "h-11")} />
        </div>

        <div className={cn("flex items-center", isMobile ? "gap-0" : "gap-2")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={cn(isMobile ? "h-8 w-8" : "")}>
                <Search className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cerca in CRM..." 
                  className="pl-10"
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn("flex items-center gap-2", isMobile ? "h-8 px-0.5" : "h-8 px-2")}>
                <div className={cn("rounded-full flex items-center justify-center", isMobile ? "h-6 w-6" : "h-8 w-8")}>
                  <span className={cn("text-white font-medium", isMobile ? "text-xs" : "text-sm")}>
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm text-foreground">
                    {userEmail?.split('@')[0] || 'Utente'}
                  </span>
                </div>
                {!isMobile && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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

      <div className={cn("flex", isMobile ? "h-[calc(100vh-3.5rem)]" : "h-[calc(100vh-7rem)]")}>
        {/* Sidebar */}
        <aside className={`bg-card-transparent border-r border-border transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16'
        } overflow-hidden`}>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden xl:block'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;