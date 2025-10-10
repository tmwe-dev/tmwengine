import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  type: string;
  name: string;
  role_name: string;
  role_description: string;
  system_prompt: string;
  is_active: boolean;
}

interface ParticipantRoleManagerProps {
  participants: Participant[];
  conversationId: string;
  onUpdate: () => void;
}

export const ParticipantRoleManager = ({ participants, conversationId, onUpdate }: ParticipantRoleManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<{
    role_name: string;
    role_description: string;
    system_prompt: string;
  }>({ role_name: '', role_description: '', system_prompt: '' });

  const startEdit = (participant: Participant) => {
    setEditingId(participant.id);
    setEditData({
      role_name: participant.role_name || '',
      role_description: participant.role_description || '',
      system_prompt: participant.system_prompt || ''
    });
  };

  const saveRole = async (participantId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_participants')
        .update({
          role_name: editData.role_name,
          role_description: editData.role_description,
          system_prompt: editData.system_prompt
        })
        .eq('id', participantId);

      if (error) throw error;

      toast.success('Ruolo aggiornato con successo');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Errore salvataggio ruolo:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'chatgpt': return '🤖';
      case 'gemini': return '🔷';
      case 'claude': return '🧠';
      default: return '🎭';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Edit2 className="h-4 w-4" />
        Gestisci Ruoli AI
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestione Ruoli e Prompt AI</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {participants.filter(p => p.type !== 'human').map((participant) => (
              <div key={participant.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getParticipantIcon(participant.type)}</span>
                    <div>
                      <h3 className="font-semibold">{participant.name}</h3>
                      {editingId !== participant.id && (
                        <p className="text-sm text-muted-foreground">{participant.role_name}</p>
                      )}
                    </div>
                  </div>
                  {editingId === participant.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveRole(participant.id)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(participant)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {editingId === participant.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Nome Ruolo</Label>
                      <Input
                        value={editData.role_name}
                        onChange={(e) => setEditData({ ...editData, role_name: e.target.value })}
                        placeholder="es. Analista Strategico"
                      />
                    </div>
                    <div>
                      <Label>Descrizione Ruolo</Label>
                      <Input
                        value={editData.role_description}
                        onChange={(e) => setEditData({ ...editData, role_description: e.target.value })}
                        placeholder="es. Esperto in business strategy e market analysis"
                      />
                    </div>
                    <div>
                      <Label>System Prompt Personalizzato</Label>
                      <Textarea
                        value={editData.system_prompt}
                        onChange={(e) => setEditData({ ...editData, system_prompt: e.target.value })}
                        rows={8}
                        placeholder="Definisci il ruolo, competenze e approccio dell'AI..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{participant.role_description}</p>
                    {participant.system_prompt && (
                      <div className="bg-muted/50 p-3 rounded text-xs whitespace-pre-wrap">
                        {participant.system_prompt}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
