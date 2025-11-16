import { Map } from 'lucide-react';
import CRMLayout from '@/components/layout/CRMLayout';
import { siteMapGroups } from '@/data/siteMapData';
import { PageGroupAccordion } from '@/components/site-map/PageGroupAccordion';
import { SiteMapStats } from '@/components/site-map/SiteMapStats';
import { SiteMapSearch } from '@/components/site-map/SiteMapSearch';

export default function SiteMap() {
  return (
    <CRMLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Map className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Mapa del Sitio
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Explorador completo de todas las páginas y funcionalidades del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <SiteMapStats />

        {/* Search */}
        <SiteMapSearch />

        {/* Page Groups */}
        <div className="space-y-6">
          {siteMapGroups.map((group) => (
            <PageGroupAccordion key={group.id} group={group} />
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Tip:</strong> Utiliza el buscador para encontrar rápidamente cualquier página del sistema
          </p>
        </div>
      </div>
    </CRMLayout>
  );
}
