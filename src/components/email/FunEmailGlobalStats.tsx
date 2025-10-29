import { Card, CardContent } from '@/components/ui/card';
import { Database, Server, Download } from 'lucide-react';

interface FunEmailGlobalStatsProps {
  totalServer: number;
  totalDB: number;
}

export const FunEmailGlobalStats = ({ totalServer, totalDB }: FunEmailGlobalStatsProps) => {
  const remaining = Math.max(0, totalServer - totalDB);
  const percentage = totalServer > 0 ? Math.round((totalDB / totalServer) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Totale Server */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Server className="h-4 w-4" />
              <span className="text-xs">Sul Server</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalServer.toLocaleString()}</p>
          </div>

          {/* Totale DB */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Nel DB</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalDB.toLocaleString()}</p>
          </div>

          {/* Da Scaricare */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Download className="h-4 w-4" />
              <span className="text-xs">Da Scaricare</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{remaining.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso Sincronizzazione</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
