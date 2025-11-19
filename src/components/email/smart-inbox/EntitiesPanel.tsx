import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Calendar, DollarSign, User, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EntityBadgeProps {
  type: string;
  value: string;
  confidence: number;
}

const entityConfig = {
  tracking: { icon: Package, label: 'Tracking', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  invoice: { icon: DollarSign, label: 'Fattura', color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
  order: { icon: Package, label: 'Ordine', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  date: { icon: Calendar, label: 'Data', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  amount: { icon: DollarSign, label: 'Importo', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  person: { icon: User, label: 'Persona', color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300' },
  company: { icon: Building2, label: 'Azienda', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
};

const EntityBadge = ({ type, value, confidence }: EntityBadgeProps) => {
  const config = entityConfig[type as keyof typeof entityConfig] || entityConfig.tracking;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}: {value}
      {confidence < 0.9 && (
        <span className="ml-1 text-xs opacity-60">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </Badge>
  );
};

interface EntitiesPanelProps {
  emailId: string;
}

export const EntitiesPanel = ({ emailId }: EntitiesPanelProps) => {
  const { data: topics, isLoading } = useQuery({
    queryKey: ['email-topics', emailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_messages_topics')
        .select(`
          topic_id,
          email_topics (
            topic_name,
            topic_type,
            reference_number,
            metadata
          )
        `)
        .eq('email_id', emailId);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse flex space-x-2">
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-6 bg-muted rounded w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topics || topics.length === 0) {
    return null;
  }

  // Group entities by type
  const entities = topics
    .map(t => {
      const topic = (t as any).email_topics;
      return {
        type: topic.topic_type,
        value: topic.reference_number || topic.topic_name,
        confidence: topic.metadata?.confidence || 1,
      };
    })
    .filter(e => e.value);

  if (entities.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">📌 Entità Estratte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {entities.map((entity, idx) => (
            <EntityBadge
              key={idx}
              type={entity.type}
              value={entity.value}
              confidence={entity.confidence}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
