/**
 * AI Action Confirmation Dialog - Dialog evoluto con checkbox e edit parametri
 */

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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2 } from 'lucide-react';
import type { AIActionProposal } from '@/types/email-automation';

interface AIActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: AIActionProposal | null;
  onConfirm: (selectedActions: number[], editedActions?: any[]) => void;
  onCancel: () => void;
}

export function AIActionConfirmationDialog({
  open,
  onOpenChange,
  proposal,
  onConfirm,
  onCancel,
}: AIActionConfirmationDialogProps) {
  const [selectedActions, setSelectedActions] = useState<number[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedParams, setEditedParams] = useState<any>({});

  // Reset selections when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && proposal) {
      // Select all actions by default
      setSelectedActions(proposal.actions.map((_, i) => i));
    } else {
      setSelectedActions([]);
      setEditingIndex(null);
      setEditedParams({});
    }
    onOpenChange(newOpen);
  };

  const toggleAction = (index: number) => {
    setSelectedActions(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const openEditDialog = (index: number) => {
    if (!proposal) return;
    setEditingIndex(index);
    setEditedParams(proposal.actions[index].params || {});
    setEditDialogOpen(true);
  };

  const saveEditedAction = () => {
    // Save changes (in real implementation, update proposal.actions[editingIndex])
    setEditDialogOpen(false);
    setEditingIndex(null);
  };

  const handleConfirm = () => {
    onConfirm(selectedActions);
    handleOpenChange(false);
  };

  if (!proposal) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferma Azioni AI</DialogTitle>
            <DialogDescription>
              L'AI ha proposto {proposal.actions.length} azioni. Seleziona quali eseguire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {proposal.actions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedActions.includes(idx)}
                  onCheckedChange={() => toggleAction(idx)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={action.type === 'archive' ? 'default' : 'secondary'}>
                      {action.type}
                    </Badge>
                    {action.params?.priority && (
                      <Badge variant="outline">{action.params.priority}</Badge>
                    )}
                  </div>
                  <p className="text-sm mb-2">{action.description}</p>
                  {action.params && Object.keys(action.params).length > 0 && (
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(action.params, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditDialog(idx)}
                  className="shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedActions.length === 0}
            >
              Esegui {selectedActions.length} {selectedActions.length === 1 ? 'azione' : 'azioni'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Parametri */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Parametri Azione</DialogTitle>
            <DialogDescription>
              {editingIndex !== null && proposal.actions[editingIndex] && (
                <>Tipo: {proposal.actions[editingIndex].type}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {editingIndex !== null && proposal.actions[editingIndex]?.type === 'forward' && (
              <div>
                <Label>Destinatari (separati da virgola)</Label>
                <Input
                  value={editedParams.recipients?.join(', ') || ''}
                  onChange={(e) =>
                    setEditedParams({
                      ...editedParams,
                      recipients: e.target.value.split(',').map(s => s.trim()),
                    })
                  }
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            )}

            {editingIndex !== null && proposal.actions[editingIndex]?.type === 'move_to_folder' && (
              <div>
                <Label>Cartella di destinazione</Label>
                <Input
                  value={editedParams.folder_name || ''}
                  onChange={(e) =>
                    setEditedParams({
                      ...editedParams,
                      folder_name: e.target.value,
                    })
                  }
                  placeholder="INBOX/Sottocartella"
                />
              </div>
            )}

            {editingIndex !== null && proposal.actions[editingIndex]?.type === 'reply' && (
              <div>
                <Label>Messaggio di risposta</Label>
                <Textarea
                  value={editedParams.message || ''}
                  onChange={(e) =>
                    setEditedParams({
                      ...editedParams,
                      message: e.target.value,
                    })
                  }
                  placeholder="Inserisci il testo della risposta..."
                  rows={5}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={saveEditedAction}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
