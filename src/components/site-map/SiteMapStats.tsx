import { getTotalPages, getTotalGroups } from '@/data/siteMapData';
import { LayoutDashboard, Layers, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SiteMapStats() {
  const totalPages = getTotalPages();
  const totalGroups = getTotalGroups();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPages}</p>
            <p className="text-xs text-muted-foreground">Totale Pagine</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10">
            <Layers className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalGroups}</p>
            <p className="text-xs text-muted-foreground">Categorie</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">100%</p>
            <p className="text-xs text-muted-foreground">Protette</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
