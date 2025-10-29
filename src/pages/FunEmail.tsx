import { PageLayout } from '@/components/design-system';
import { EmptyState } from '@/components/design-system/data-display/EmptyState';
import { Sparkles } from 'lucide-react';

const FunEmail = () => {
  return (
    <PageLayout
      title="Fun Email"
      description="Pagina sperimentale per funzionalità email divertenti"
      gradient={true}
    >
      <EmptyState
        icon={Sparkles}
        title="Pagina in costruzione"
        description="Questa è una pagina vuota pronta per essere personalizzata"
      />
    </PageLayout>
  );
};

export default FunEmail;
