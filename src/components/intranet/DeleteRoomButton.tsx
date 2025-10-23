import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/design-system/buttons/IconButton';
import { DynamicModal } from '@/components/design-system/feedback/DynamicModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
  isCreatorOrAdmin: boolean;
  onDeleteSuccess?: () => void;
  iconOnly?: boolean;
}

export const DeleteRoomButton = ({
  roomId,
  roomName,
  isCreatorOrAdmin,
  onDeleteSuccess,
  iconOnly = false
}: DeleteRoomButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!isCreatorOrAdmin) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('intranet_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: 'Chat eliminata',
        description: `La chat "${roomName}" è stata eliminata con successo.`
      });

      setIsDialogOpen(false);
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigate('/intranet');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la chat. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <IconButton
        icon={Trash2}
        tooltip="Elimina chat"
        variant="ghost"
        size="icon"
        onClick={() => setIsDialogOpen(true)}
      />

      <DynamicModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Elimina chat"
        description={`Sei sicuro di voler eliminare "${roomName}"? Questa azione è irreversibile e cancellerà tutti i messaggi.`}
        variant="destructive"
        primaryAction={{
          label: 'Elimina',
          onClick: handleDelete,
          loading: isDeleting,
          disabled: isDeleting
        }}
        secondaryAction={{
          label: 'Annulla',
          onClick: () => setIsDialogOpen(false),
          disabled: isDeleting
        }}
      />
    </>
  );
};
