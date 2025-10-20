import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SaveVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (variantName: string) => Promise<void>;
  originalComponentName: string;
  isLoading?: boolean;
}

export const SaveVariantDialog = ({
  open,
  onOpenChange,
  onSave,
  originalComponentName,
  isLoading = false,
}: SaveVariantDialogProps) => {
  const [variantName, setVariantName] = useState(`${originalComponentName}_Custom`);

  const handleSave = async () => {
    if (!variantName.trim()) {
      return;
    }
    await onSave(variantName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Salva come Variante</DialogTitle>
          <DialogDescription>
            Crea una nuova variante personalizzata di questo componente.
            La variante sarà salvata nella libreria con le tue modifiche.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="variant-name">Nome Variante</Label>
            <Input
              id="variant-name"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder={`${originalComponentName}_Custom`}
              disabled={isLoading}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Componente originale: <strong>{originalComponentName}</strong></p>
            <p className="mt-1">Una nuova miniatura verrà generata automaticamente.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !variantName.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salva Variante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
