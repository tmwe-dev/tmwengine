import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, CheckCircle2, Clock, AlertCircle, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface EmailQueue {
  id: string;
  destinatario_email: string;
  destinatario_nome: string | null;
  destinatario_azienda: string | null;
  oggetto: string;
  stato: string;
  data_ora_programmata: string;
  data_ora_invio: string | null;
  intervallo_minuti: number;
  campagna_nome: string;
  errore_dettaglio: string | null;
}

interface EmailQueueListProps {
  emails: EmailQueue[];
  onRefresh: () => void;
}

export function EmailQueueList({ emails }: EmailQueueListProps) {
  const getStatusIcon = (stato: string) => {
    switch (stato) {
      case 'inviata':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_invio':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'programmata':
      case 'in_coda':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'errore':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'annullata':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (stato: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'inviata': 'default',
      'in_invio': 'secondary',
      'programmata': 'outline',
      'in_coda': 'outline',
      'errore': 'destructive',
      'annullata': 'secondary'
    };
    return (
      <Badge variant={variants[stato] || 'outline'}>
        {stato.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const groupedByCampaign = emails.reduce((acc, email) => {
    if (!acc[email.campagna_nome]) {
      acc[email.campagna_nome] = [];
    }
    acc[email.campagna_nome].push(email);
    return acc;
  }, {} as Record<string, EmailQueue[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Coda Email ({emails.length} totali)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessuna email in coda</p>
            <p className="text-sm text-muted-foreground mt-2">
              Le email verranno aggiunte automaticamente quando crei una campagna dalla pagina "Template Email"
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedByCampaign).map(([campaignName, campaignEmails]) => (
                <div key={campaignName} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="font-semibold text-sm">📋 {campaignName}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {campaignEmails.length} email
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {campaignEmails.map((email) => (
                      <div
                        key={email.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">
                          {getStatusIcon(email.stato)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">
                              {email.destinatario_nome || email.destinatario_email}
                            </p>
                            {getStatusBadge(email.stato)}
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">
                            {email.destinatario_email}
                            {email.destinatario_azienda && ` - ${email.destinatario_azienda}`}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {email.stato === 'inviata' && email.data_ora_invio ? (
                              <>Inviata: {format(new Date(email.data_ora_invio), "dd MMM HH:mm", { locale: it })}</>
                            ) : (
                              <>Programmata: {format(new Date(email.data_ora_programmata), "dd MMM HH:mm", { locale: it })}</>
                            )}
                          </p>
                          
                          {email.errore_dettaglio && (
                            <p className="text-xs text-destructive mt-1">
                              ⚠️ {email.errore_dettaglio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
