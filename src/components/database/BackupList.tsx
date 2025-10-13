import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileArchive, Calendar } from "lucide-react";

interface BackupListProps {
  backups?: Array<{
    name: string;
    date: string;
    description?: string;
  }>;
}

export function BackupList({ backups = [] }: BackupListProps) {
  // Lista statica dei backup noti dalla cartella docs/DATABASE_BACKUPS
  const knownBackups = [
    {
      name: "Pre-Migration Initial Setup",
      date: "2025-01-15",
      description: "Backup iniziale prima delle prime migrazioni"
    }
  ];

  const allBackups = backups.length > 0 ? backups : knownBackups;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileArchive className="h-5 w-5" />
          Backup Pre-Migrazione
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allBackups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessun backup disponibile
          </p>
        ) : (
          <div className="space-y-4">
            {allBackups.map((backup, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <h4 className="font-medium">{backup.name}</h4>
                  <p className="text-sm text-muted-foreground">{backup.date}</p>
                  {backup.description && (
                    <p className="text-sm mt-1">{backup.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            📁 I backup sono salvati in <code className="font-mono text-xs bg-background px-2 py-1 rounded">docs/DATABASE_BACKUPS/</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
