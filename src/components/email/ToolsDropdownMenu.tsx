import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Settings, Bug, Activity, Mail, Database } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function ToolsDropdownMenu() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wrench className="h-4 w-4" />
          Tools
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-sm border-border/50">
        <DropdownMenuLabel>Import Tools</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=quick-download')}>
          <Zap className="mr-2 h-4 w-4" />
          Quick Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=single-mail')}>
          <Mail className="mr-2 h-4 w-4" />
          Single Mail Import
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Diagnostics</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=integrity')}>
          <Settings className="mr-2 h-4 w-4" />
          Integrity Checker
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=diagnostics')}>
          <Activity className="mr-2 h-4 w-4" />
          Email Count Diagnostics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=debugger')}>
          <Bug className="mr-2 h-4 w-4" />
          Backend Debugger
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Admin</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate('/funnemail?view=migration')}>
          <Database className="mr-2 h-4 w-4" />
          TMWE ID Migration
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
