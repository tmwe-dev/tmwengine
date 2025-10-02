import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
  FileCheck
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

const CRMLayout = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  console.log('🟢 CRMLayout render:', {
    pathname: location.pathname,
    hasOpenRecordsDialog: !!location.state?.openRecordsDialog,
    shouldShowBlackScreen: location.state?.openRecordsDialog && location.pathname === '/import-templates'
  });

  // Chiudi automaticamente la sidebar quando cambia la rotta
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);
  
  // Se stiamo navigando con openRecordsDialog, nascondi tutto e mostra schermo nero
  if (location.state?.openRecordsDialog && location.pathname === '/import-templates') {
    console.log('🟢 CRMLayout: Showing BLACK SCREEN');
    return <div className="fixed inset-0 bg-black z-50"></div>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Rubrica', href: '/rubrica', icon: Users },
    { name: 'Rubrica Avanzata', href: '/rubrica-avanzata', icon: Database },
    { name: 'Attività', href: '/attivita', icon: Calendar },
    { name: 'Campagne', href: '/campagne', icon: BarChart3 },
    { name: 'Email', href: '/email', icon: Mail },
    { name: 'Chat AI', href: '/chat', icon: MessageSquare },
    { name: 'Import Templates', href: '/import-templates', icon: FileUp },
    { name: 'Gestisci Import', href: '/gestisci-import', icon: FileCheck },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={cn(
        "bg-card border-b border-border flex items-center justify-between",
        isMobile ? "h-14 px-3" : "h-16 px-4 lg:px-6"
      )}>
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
            <h1 className={cn("font-semibold text-foreground px-3 py-1.5 rounded-lg", isMobile ? "text-lg" : "text-xl")}>
              {navigation.find(nav => isActive(nav.href))?.name || 'Dashboard'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cerca in CRM..." 
                className="pl-10 w-64"
              />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-secondary-foreground text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm text-foreground">
                    {user?.email?.split('@')[0] || 'Utente'}
                  </span>
                  {isAdmin && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email?.split('@')[0] || 'Utente'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {isAdmin && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Amministratore
                    </p>
                  )}
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
                onClick={signOut}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className={cn("flex", isMobile ? "h-[calc(100vh-3.5rem)]" : "h-[calc(100vh-4rem)]")}>
        {/* Sidebar */}
        <aside className={`bg-card border-r border-border transition-all duration-300 ${
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
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;