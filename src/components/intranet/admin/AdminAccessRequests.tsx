import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { useRoomAccessRequests } from "@/hooks/useRoomAccessRequests";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const AdminAccessRequests = () => {
  const { requests, isLoading, approveRequest, rejectRequest } = useRoomAccessRequests();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" />
          In attesa
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="w-3 h-3 mr-1" />
          Approvata
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <X className="w-3 h-3 mr-1" />
          Rifiutata
        </Badge>;
      default:
        return null;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Richieste Pendenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Richieste Pendenti
            {pendingRequests.length > 0 && (
              <Badge variant="default">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Richieste di accesso alle stanze in attesa di approvazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessuna richiesta in attesa
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.user_display_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm text-muted-foreground">{request.room_name}</span>
                      </div>
                      {request.message && (
                        <p className="text-sm text-muted-foreground italic">
                          "{request.message}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Richiesta il {format(new Date(request.requested_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectRequest(request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rifiuta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Storico Richieste */}
      <Card>
        <CardHeader>
          <CardTitle>Storico Richieste</CardTitle>
          <CardDescription>
            Richieste già processate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessuna richiesta processata
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {processedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{request.user_display_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm text-muted-foreground">{request.room_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {request.reviewed_at && format(new Date(request.reviewed_at), "d MMM yyyy", { locale: it })}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
