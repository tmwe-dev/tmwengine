import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTMWEAuth } from "@/hooks/useTMWEAuth";
import { User, Mail, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { userProfile, userEmail, refreshProfile } = useTMWEAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      toast({
        title: "Profilo aggiornato",
        description: "I dati del profilo sono stati aggiornati con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il profilo",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilo TMWE
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Mail className="h-5 w-5 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{userProfile?.email || userEmail || 'Non disponibile'}</p>
            </div>
          </div>

          {/* Name */}
          {userProfile?.name && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Nome</p>
                <p className="text-sm text-muted-foreground">{userProfile.name}</p>
              </div>
            </div>
          )}

          {/* Quota */}
          {userProfile?.quota && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Quota Spazio</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilizzato</span>
                    <span className="font-medium">
                      {(userProfile.quota.used / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Totale</span>
                    <span className="font-medium">
                      {(userProfile.quota.total / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min((userProfile.quota.used / userProfile.quota.total) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {((userProfile.quota.used / userProfile.quota.total) * 100).toFixed(1)}% utilizzato
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          {userProfile?.account_info && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Informazioni Account</p>
                <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-40">
                  {JSON.stringify(userProfile.account_info, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aggiorna Profilo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
