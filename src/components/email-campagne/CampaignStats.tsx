import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Loader2, Mail } from "lucide-react";

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
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totale}</p>
              <p className="text-xs text-muted-foreground">Totali</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.inviate}</p>
              <p className="text-xs text-muted-foreground">Inviate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.in_coda}</p>
              <p className="text-xs text-muted-foreground">In Coda</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.in_invio}</p>
              <p className="text-xs text-muted-foreground">In Invio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.errori}</p>
              <p className="text-xs text-muted-foreground">Errori</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats.totale > 0 && (
        <Card className="md:col-span-5">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso Complessivo</span>
                <span className="font-medium">{percentComplete.toFixed(1)}%</span>
              </div>
              <Progress value={percentComplete} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {stats.inviate} di {stats.totale} email inviate con successo
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
