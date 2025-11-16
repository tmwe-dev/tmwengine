/**
 * ⚠️ DEPRECATED: This component is no longer needed
 * We no longer monitor local DB insertions since we use email_search API directly
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface RealtimeEmailInsertionMonitorProps {
  userEmail: string;
  isActive: boolean;
}

export function RealtimeEmailInsertionMonitor({ userEmail, isActive }: RealtimeEmailInsertionMonitorProps) {
  return (
    <Card className="border-blue-500/30 bg-blue-50/5 dark:bg-blue-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Monitor Deprecato
          </CardTitle>
          <Badge variant="outline" className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
            ℹ️ Info
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="text-sm space-y-2 text-muted-foreground">
          <p>
            Questo monitor è stato deprecato nella migrazione a <strong>email_search API</strong>.
          </p>
          <p className="text-xs">
            Le email sono ora recuperate direttamente dall'API TMWE (MySQL + Elasticsearch),
            eliminando la necessità di sincronizzazione locale.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
