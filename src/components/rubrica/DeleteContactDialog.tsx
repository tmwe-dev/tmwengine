import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';

interface DeleteContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteActivities: boolean, archiveReason?: string) => void;
  contactName: string;
  activityCount: number;
}

export function DeleteContactDialog({
  isOpen,
  onClose,
  onConfirm,
  contactName,
  activityCount
}: DeleteContactDialogProps) {
  const [action, setAction] = useState<'delete' | 'archive'>('archive');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(action === 'delete', action === 'archive' ? reason : undefined);
    setIsProcessing(false);
    setReason('');
    setAction('archive');
  };

  const handleClose = () => {
    if (!isProcessing) {
      setReason('');
      setAction('archive');
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Conferma Eliminazione Cliente
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4 pt-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                Stai per eliminare il cliente: <span className="font-bold">{contactName}</span>
              </p>
              <p className="text-orange-800 dark:text-orange-200 mt-2">
                Questo cliente ha <span className="font-bold">{activityCount}</span> attività associate.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                Cosa vuoi fare con le attività associate?
              </p>
              
              <RadioGroup value={action} onValueChange={(value) => setAction(value as 'delete' | 'archive')}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="archive" id="archive" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="archive" className="cursor-pointer">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Archive className="h-4 w-4 text-blue-600" />
                        Archivia cliente e attività
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Il cliente e le sue attività verranno spostati nelle tabelle archiviate.
                        Potrai recuperarli in futuro se necessario.
                      </p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="delete" id="delete" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="delete" className="cursor-pointer">
                      <div className="flex items-center gap-2 font-semibold text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Elimina tutto definitivamente
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Il cliente e tutte le sue attività verranno eliminati permanentemente.
                        <span className="font-semibold text-destructive"> Questa azione non può essere annullata.</span>
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {action === 'archive' && (
                <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="reason" className="text-sm font-medium">
                    Motivo dell'archiviazione (opzionale)
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Es: Cliente inattivo, duplicato, ecc..."
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Annulla
          </Button>
          <Button
            variant={action === 'delete' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>Elaborazione...</>
            ) : action === 'delete' ? (
              <>
                <Trash2 className="h-4 w-4" />
                Elimina Definitivamente
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archivia
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
