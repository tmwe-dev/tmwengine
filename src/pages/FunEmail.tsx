import { PageLayout } from '@/components/design-system';
import { StatCard } from '@/components/design-system/cards/StatCard';
import { Mail, Loader2 } from 'lucide-react';
import { useGlobalEmailCount } from '@/hooks/useGlobalEmailCount';

const FunEmail = () => {
  const { totalCount, isLoading, error } = useGlobalEmailCount();

  return (
    <PageLayout
      title="Fun Email"
      description="Pagina sperimentale per funzionalità email divertenti"
      gradient={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-1 flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="col-span-1 p-6 rounded-lg border border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-400">Errore nel caricamento dei dati</p>
          </div>
        ) : (
          <StatCard
            icon={Mail}
            label="Totale Email"
            value={totalCount.toLocaleString('it-IT')}
            className="col-span-1"
          />
        )}
      </div>
    </PageLayout>
  );
};

export default FunEmail;
