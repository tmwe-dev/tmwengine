import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, Users, Mail } from "lucide-react";
import { useRoomAccessRequests } from "@/hooks/useRoomAccessRequests";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const AccessRequestsPanel = () => {
  const { requests, isLoading, approveRequest, rejectRequest } = useRoomAccessRequests();

  const pendingRequests = requests.filter(r => r.status === 'pending' && !r.is_invite);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">Richieste di Accesso</h3>
        </div>
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">Richieste di Accesso</h3>
        </div>
        <p className="text-sm text-muted-foreground">Nessuna richiesta pendente</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5" />
        <h3 className="font-semibold">Richieste di Accesso</h3>
        <Badge variant="secondary">{pendingRequests.length}</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.user_display_name || 'Utente'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{request.room_name}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(request.requested_at), "dd MMM yyyy", { locale: it })}
                  </Badge>
                </div>

                {request.message && (
                  <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                    "{request.message}"
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveRequest(request.id)}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approva
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectRequest(request.id)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rifiuta
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
