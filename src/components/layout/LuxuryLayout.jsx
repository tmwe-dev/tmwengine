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
  User,
  Sparkles,
  Crown
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

const LuxuryLayout = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, logout, userProfile } = useTMWEAuth();
  const { theme, setTheme, themes } = useTheme();

  const luxuryThemes = {
    gold: 'from-amber-400 via-yellow-500 to-amber-600',
    platinum: 'from-slate-300 via-slate-100 to-slate-300',
    emerald: 'from-emerald-400 via-teal-500 to-emerald-600',
    royal: 'from-purple-600 via-indigo-500 to-purple-700',
    sapphire: 'from-blue-500 via-cyan-400 to-blue-600',
    ruby: 'from-rose-500 via-pink-400 to-rose-600',
    onyx: 'from-gray-800 via-slate-700 to-gray-900'
  };

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
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(251, 191, 36, 0.1) 0%, transparent 50%), linear-gradient(to bottom, #0a0a0a, #1a1a1a)'
      }}
    >
      {/* Luxury animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Luxury Sidebar Desktop */}
        <aside className={cn(
          "hidden lg:flex flex-col w-72 border-r border-amber-500/20 backdrop-blur-xl",
          "bg-gradient-to-b from-black/40 via-purple-950/20 to-black/40",
          "shadow-2xl shadow-amber-500/10"
        )}>
          {/* Logo Section with Premium Badge */}
          <div className="p-6 border-b border-amber-500/20">
            <div className="flex items-center gap-3 mb-2">
              <img src={findairLogo} alt="FindAir" className="h-10 w-auto drop-shadow-2xl" />
              <Crown className="h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <div className="text-xs text-amber-400/80 font-light tracking-widest uppercase">
              Luxury Edition
            </div>
          </div>

          {/* Theme & Profile Controls */}
          <div className="p-4 border-b border-amber-500/20">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20">
              <ThemeSwitcher />
              <ProfileDialog 
                isOpen={isProfileDialogOpen} 
                onOpenChange={setIsProfileDialogOpen}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-amber-500/20 transition-all duration-300"
                >
                  <User className="h-4 w-4 text-amber-400" />
                </Button>
              </ProfileDialog>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                    "hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-purple-500/20",
                    "hover:shadow-lg hover:shadow-amber-500/20",
                    "border border-transparent hover:border-amber-500/30",
                    active && "bg-gradient-to-r from-amber-500/30 to-purple-500/30 border-amber-500/40 shadow-xl shadow-amber-500/30"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-amber-400" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "font-medium transition-colors",
                    active ? "text-amber-100" : "text-muted-foreground"
                  )}>
                    {item.name}
                  </span>
                  {active && <Sparkles className="h-4 w-4 ml-auto text-amber-400 animate-pulse" />}
                </Link>
              );
            })}
          </nav>

          {/* Intranet Navigation */}
          <div className="p-4 border-t border-amber-500/20">
            <IntranetNavItems isActive={isActive} />
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-100 truncate">
                  {userProfile?.nome || userEmail}
                </p>
                <p className="text-xs text-amber-400/70 truncate">Premium Member</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-black/95 via-purple-950/30 to-black/95 border-r border-amber-500/20 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
              {/* Mobile Logo & Close */}
              <div className="p-6 border-b border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={findairLogo} alt="FindAir" className="h-8 w-auto" />
                  <Crown className="h-4 w-4 text-amber-400 animate-pulse" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="hover:bg-amber-500/20"
                >
                  <X className="h-5 w-5 text-amber-400" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <nav className="p-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                        "hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-purple-500/20",
                        active && "bg-gradient-to-r from-amber-500/30 to-purple-500/30 border border-amber-500/40"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-amber-400" : "text-muted-foreground")} />
                      <span className={cn("font-medium", active ? "text-amber-100" : "text-muted-foreground")}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Luxury Header */}
          <header className="h-16 border-b border-amber-500/20 backdrop-blur-xl bg-black/30 shadow-lg shadow-amber-500/10">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-amber-500/20"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5 text-amber-400" />
                </Button>

                {/* Search Bar with Luxury Style */}
                <div className="hidden md:flex items-center gap-2 w-96">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400/50" />
                    <Input
                      placeholder="Cerca in tutto il CRM..."
                      className="pl-10 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border-amber-500/30 focus:border-amber-500/50 text-foreground placeholder:text-amber-400/50 backdrop-blur-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AIGuideDialog />
                
                {/* Mobile Profile Button */}
                <div className="lg:hidden">
                  <ProfileDialog 
                    isOpen={isProfileDialogOpen} 
                    onOpenChange={setIsProfileDialogOpen}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-amber-500/20"
                    >
                      <User className="h-4 w-4 text-amber-400" />
                    </Button>
                  </ProfileDialog>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LuxuryLayout;
