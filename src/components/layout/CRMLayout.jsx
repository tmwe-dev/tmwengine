import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const CRMLayout = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Chiudi automaticamente la sidebar su mobile quando cambia la rotta
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Rubrica', href: '/rubrica', icon: Users },
    { name: 'Rubrica Avanzata', href: '/rubrica-avanzata', icon: Database },
    { name: 'Attività', href: '/attivita', icon: Calendar },
    { name: 'Campagne', href: '/campagne', icon: BarChart3 },
    { name: 'Email', href: '/email', icon: Mail },
    { name: 'Chat AI', href: '/chat', icon: MessageSquare },
    { name: 'Import Templates', href: '/import-templates', icon: FileUp },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
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
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CRM</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Sistema CRM</h1>
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
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-secondary-foreground text-sm font-medium">U</span>
            </div>
            <span className="hidden sm:block text-sm text-foreground">Utente</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
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