import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageInfo } from '@/data/siteMapData';

interface PageCardProps {
  page: PageInfo;
}

export function PageCard({ page }: PageCardProps) {
  const navigate = useNavigate();
  const Icon = page.icon;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg truncate">{page.title}</CardTitle>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {page.requiresAdmin && (
              <Badge variant="destructive" className="text-xs">Admin</Badge>
            )}
            {page.requiresAuth && !page.requiresAdmin && (
              <Badge variant="secondary" className="text-xs">Auth</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <CardDescription className="text-xs sm:text-sm mb-4 line-clamp-2">
          {page.description}
        </CardDescription>
        <Button 
          onClick={() => navigate(page.path)}
          className="w-full"
          variant="outline"
          size="sm"
        >
          Acceder
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
