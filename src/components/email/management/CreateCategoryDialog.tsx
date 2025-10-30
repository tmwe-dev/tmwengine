/**
 * Dialog per creazione nuova categoria email custom
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { z } from 'zod';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { nome_gruppo: string; descrizione?: string; colore: string; icon: string }) => Promise<void>;
  existingNames: string[];
}

const categorySchema = z.object({
  nome_gruppo: z.string()
    .min(1, 'Nome obbligatorio')
    .max(50, 'Max 50 caratteri'),
  descrizione: z.string()
    .max(200, 'Max 200 caratteri')
    .optional(),
  colore: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato colore non valido (#RRGGBB)'),
  icon: z.string()
    .min(1, 'Icona obbligatoria'),
});

const COLOR_PRESETS = [
  { label: 'Blu', value: '#3B82F6' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Ciano', value: '#06B6D4' },
  { label: 'Viola', value: '#A855F7' },
  { label: 'Arancione', value: '#F97316' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Giallo', value: '#EAB308' },
  { label: 'Rosso', value: '#EF4444' },
];

const ICON_PRESETS = [
  '⚙️', '💼', '📊', '🛃', '💻', '🚫', '🎁', '📄', 
  '💰', '🔧', '📈', '🏢', '🚀', '🎯', '🔥', '⚡',
  '📱', '🌐', '🔒', '📧', '📅', '✨', '🏆', '💡',
  '📌', '🎨', '🎵', '🎬', '📷', '🎮', '⚠️', '🚨',
];

export function CreateCategoryDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  existingNames 
}: CreateCategoryDialogProps) {
  const [formData, setFormData] = useState({
    nome_gruppo: '',
    descrizione: '',
    colore: '#3B82F6',
    icon: '🔧',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validazione nome univoco
      if (existingNames.includes(formData.nome_gruppo.trim())) {
        setErrors({ nome_gruppo: 'Questo nome è già in uso' });
        return;
      }

      // Validazione schema
      const validated = categorySchema.parse(formData);
      
      setIsSubmitting(true);
      await onSubmit(validated);
      
      // Reset form
      setFormData({
        nome_gruppo: '',
        descrizione: '',
        colore: '#3B82F6',
        icon: '🔧',
      });
      setErrors({});
      onOpenChange(false);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuova Categoria Email</DialogTitle>
          <DialogDescription>
            Crea una categoria personalizzata per organizzare i tuoi mittenti
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome Categoria */}
          <div className="space-y-2">
            <Label htmlFor="nome_gruppo">Nome Categoria *</Label>
            <Input
              id="nome_gruppo"
              value={formData.nome_gruppo}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, nome_gruppo: e.target.value }));
                setErrors(prev => ({ ...prev, nome_gruppo: '' }));
              }}
              placeholder="es. Progetti Urgenti"
              maxLength={50}
            />
            {errors.nome_gruppo && (
              <p className="text-sm text-destructive">{errors.nome_gruppo}</p>
            )}
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione (opzionale)</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, descrizione: e.target.value }));
                setErrors(prev => ({ ...prev, descrizione: '' }));
              }}
              placeholder="Breve descrizione della categoria..."
              maxLength={200}
              rows={3}
            />
            {errors.descrizione && (
              <p className="text-sm text-destructive">{errors.descrizione}</p>
            )}
          </div>

          {/* Colore */}
          <div className="space-y-2">
            <Label>Colore *</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.colore}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, colore: e.target.value }));
                  setErrors(prev => ({ ...prev, colore: '' }));
                }}
                className="h-10 w-20 cursor-pointer rounded border"
              />
              <div className="flex gap-1 flex-wrap flex-1">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, colore: color.value }))}
                    className="h-8 w-8 rounded border-2 hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: color.value,
                      borderColor: formData.colore === color.value ? '#000' : 'transparent'
                    }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            {errors.colore && (
              <p className="text-sm text-destructive">{errors.colore}</p>
            )}
          </div>

          {/* Icona */}
          <div className="space-y-2">
            <Label>Icona *</Label>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{formData.icon}</div>
              <div className="grid grid-cols-8 gap-1 flex-1">
                {ICON_PRESETS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className="h-10 w-10 text-2xl hover:scale-125 transition-transform rounded border-2"
                    style={{
                      borderColor: formData.icon === icon ? '#3B82F6' : 'transparent'
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            {errors.icon && (
              <p className="text-sm text-destructive">{errors.icon}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creazione...' : 'Crea Categoria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
