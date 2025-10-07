import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AliasPreview {
  id: string;
  name: string;
  company_name: string;
  current_alias: string | null;
  current_company_alias: string | null;
  new_alias: string | null;
  new_company_alias: string | null;
  error: string | null;
}

interface AliasPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: AliasPreview[];
  isGenerating: boolean;
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AliasPreviewDialog({
  open,
  onOpenChange,
  previews,
  isGenerating,
  totalCount,
  onConfirm,
  onCancel
}: AliasPreviewDialogProps) {
  const progress = totalCount > 0 ? (previews.length / totalCount) * 100 : 0;
  const successCount = previews.filter(p => p.new_alias && !p.error).length;
  const errorCount = previews.filter(p => p.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin text-purple-500" />}
            Generazione Alias AI
          </DialogTitle>
          <DialogDescription>
            {isGenerating 
              ? `Elaborazione in corso... ${previews.length}/${totalCount} completati`
              : `Elaborazione completata: ${successCount} riusciti, ${errorCount} errori`
            }
          </DialogDescription>
        </DialogHeader>

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            {previews.map((preview) => (
              <div
                key={preview.id}
                className="border rounded-lg p-3 space-y-2 animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{preview.name}</p>
                    <p className="text-xs text-muted-foreground">{preview.company_name}</p>
                  </div>
                  {preview.error ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Errore
                    </Badge>
                  ) : preview.new_alias ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Generato
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      In corso
                    </Badge>
                  )}
                </div>

                {preview.error ? (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {preview.error}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Alias Persona:</p>
                      <div className="space-y-1">
                        {preview.current_alias && (
                          <p className="text-red-600 line-through">{preview.current_alias}</p>
                        )}
                        {preview.new_alias && (
                          <p className="text-green-600 font-medium">{preview.new_alias}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Alias Azienda:</p>
                      <div className="space-y-1">
                        {preview.current_company_alias && (
                          <p className="text-red-600 line-through">{preview.current_company_alias}</p>
                        )}
                        {preview.new_company_alias && (
                          <p className="text-green-600 font-medium">{preview.new_company_alias}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {!isGenerating && (
          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{successCount} riusciti</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{errorCount} errori</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Annulla
              </Button>
              <Button 
                onClick={onConfirm} 
                disabled={successCount === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Applica Modifiche ({successCount})
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
