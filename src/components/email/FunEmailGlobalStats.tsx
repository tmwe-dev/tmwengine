import { Card, CardContent } from '@/components/ui/card';
import { Database, Folder } from 'lucide-react';

interface FunEmailGlobalStatsProps {
  totalDB: number;
  folders: { name: string; count: number }[];
}

export const FunEmailGlobalStats = ({ totalDB, folders }: FunEmailGlobalStatsProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Email Totali nel DB */}
        <div className="text-center pb-4 border-b">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Database className="h-5 w-5" />
            <span className="text-sm font-medium">Email nel Database Locale</span>
          </div>
          <p className="text-4xl font-bold text-primary">{totalDB.toLocaleString()}</p>
        </div>

        {/* Breakdown per Cartella */}
        {folders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Folder className="h-4 w-4" />
              <span className="text-xs font-medium">Per Cartella</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {folders.map((folder) => (
                <div key={folder.name} className="flex justify-between items-center text-sm py-1 px-2 hover:bg-muted/50 rounded">
                  <span className="truncate flex-1">{folder.name}</span>
                  <span className="font-medium text-muted-foreground ml-2">{folder.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
