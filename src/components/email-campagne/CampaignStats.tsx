import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Loader2, Mail } from "lucide-react";
import { StatCard } from "@/components/design-system/cards/StatCard";
import { GlassCard } from "@/components/design-system/cards/GlassCard";

interface CampaignStatsProps {
  stats: {
    totale: number;
    inviate: number;
    in_coda: number;
    errori: number;
    in_invio: number;
  };
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  const percentComplete = stats.totale > 0 ? (stats.inviate / stats.totale) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Grid Statistiche - Responsive: 2 cols mobile, 3 tablet, 5 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          icon={Mail}
          label="Totali"
          value={stats.totale}
        />
        <StatCard
          icon={CheckCircle2}
          label="Inviate"
          value={stats.inviate}
          trend={stats.inviate > 0 ? "up" : undefined}
        />
        <StatCard
          icon={Clock}
          label="In Coda"
          value={stats.in_coda}
        />
        <StatCard
          icon={Loader2}
          label="In Invio"
          value={stats.in_invio}
        />
        <StatCard
          icon={AlertCircle}
          label="Errori"
          value={stats.errori}
          trend={stats.errori > 0 ? "down" : undefined}
        />
      </div>

      {/* Progress Bar - Full width */}
      {stats.totale > 0 && (
        <GlassCard gradient>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Progresso Complessivo</span>
              <span className="font-medium text-sm md:text-base">{percentComplete.toFixed(1)}%</span>
            </div>
            <Progress value={percentComplete} className="h-2 md:h-3" />
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              {stats.inviate} di {stats.totale} email inviate con successo
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
