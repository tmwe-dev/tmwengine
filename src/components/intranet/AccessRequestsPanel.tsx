import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, Users, Mail } from "lucide-react";
import { useRoomAccessRequests } from "@/hooks/useRoomAccessRequests";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const AccessRequestsPanel = () => {
  const { requests, isLoading, approveRequest, rejectRequest } = useRoomAccessRequests();
  

  const pendingRequests = requests.filter(r => r.status === 'pending' && !r.is_invite);

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold px-2 mb-2">
          Richieste
        </h3>
        <div>
          <p className="text-xs text-muted-foreground px-2">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold px-2 mb-2">
          Richieste
        </h3>
        <div>
          <p className="text-xs text-muted-foreground px-2">Nessuna richiesta</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <h3 className="text-sm font-semibold px-2 mb-2">
          Richieste
        </h3>

        <div>
          <ScrollArea className="h-[300px]">
              <div className="space-y-2 px-2 pr-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium truncate">
                              {request.user_display_name || 'Utente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="text-xs truncate">{request.room_name}</span>
                          </div>
                        </div>
                      </div>

                      {request.message && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 line-clamp-2">
                          "{request.message}"
                        </p>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          onClick={() => approveRequest(request.id)}
                          className="flex-1 h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectRequest(request.id)}
                          className="flex-1 h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Rifiuta
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
};
