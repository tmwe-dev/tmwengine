import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactDeletionOptions {
  contactId: string;
  source: 'rubrica' | 'imported_contacts';
  deleteActivities: boolean;
  archiveReason?: string;
}

export function useContactDeletion() {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteContact = async ({
    contactId,
    source,
    deleteActivities,
    archiveReason
  }: ContactDeletionOptions) => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // 1. Recupera le attività associate
      const { data: activities, error: activitiesError } = await supabase
        .from('attivita')
        .select('*')
        .eq('rubrica_id', contactId);

      if (activitiesError) throw activitiesError;

      // 2. Recupera il contatto
      const { data: contact, error: contactError } = await supabase
        .from(source)
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;

      if (deleteActivities) {
        // Elimina le attività
        if (activities && activities.length > 0) {
          const { error: deleteActivitiesError } = await supabase
            .from('attivita')
            .delete()
            .eq('rubrica_id', contactId);

          if (deleteActivitiesError) throw deleteActivitiesError;
        }

        // Elimina il contatto
        const { error: deleteContactError } = await supabase
          .from(source)
          .delete()
          .eq('id', contactId);

        if (deleteContactError) throw deleteContactError;

        toast({
          title: "Eliminazione completata",
          description: `Cliente e ${activities?.length || 0} attività eliminate definitivamente.`,
        });
      } else {
        // Archivia le attività
        if (activities && activities.length > 0) {
          const activitiesToArchive = activities.map(activity => ({
            attivita_id_originale: activity.id,
            rubrica_id: activity.rubrica_id,
            tipo: activity.tipo,
            descrizione: activity.descrizione,
            stato: activity.stato,
            scadenza: activity.scadenza,
            priorita: activity.priorita,
            note: activity.note,
            creato_da: activity.creato_da,
            assegnato_a: activity.assegnato_a,
            data_creazione: activity.data_creazione,
            ora_creazione: activity.ora_creazione,
            data_ultima_modifica: activity.data_ultima_modifica,
            modifiche_log: activity.modifiche_log,
            motivo_archiviazione: archiveReason || 'Cliente archiviato',
            archiviato_da: userId
          }));

          const { error: archiveActivitiesError } = await supabase
            .from('attivita_archiviate')
            .insert(activitiesToArchive);

          if (archiveActivitiesError) throw archiveActivitiesError;

          // Elimina le attività originali
          const { error: deleteActivitiesError } = await supabase
            .from('attivita')
            .delete()
            .eq('rubrica_id', contactId);

          if (deleteActivitiesError) throw deleteActivitiesError;
        }

        // Archivia il contatto
        if (source === 'rubrica') {
          const { error: archiveContactError } = await supabase
            .from('rubrica_archiviata')
            .insert({
              rubrica_id_originale: (contact as any).id,
              nome: (contact as any).nome,
              azienda: (contact as any).azienda,
              responsabile: (contact as any).responsabile,
              email: (contact as any).email,
              telefono: (contact as any).telefono,
              cellulare: (contact as any).cellulare,
              indirizzo: (contact as any).indirizzo,
              citta: (contact as any).citta,
              paese: (contact as any).paese,
              zip_code: (contact as any).zip_code,
              state: (contact as any).state,
              note: (contact as any).note,
              origine: (contact as any).origine,
              client_code: (contact as any).client_code,
              position: (contact as any).position,
              title: (contact as any).title,
              alias: (contact as any).alias,
              company_alias: (contact as any).company_alias,
              stato: (contact as any).stato,
              tags: (contact as any).tags,
              meta_client: (contact as any).meta_client,
              meta_express: (contact as any).meta_express,
              meta_sea_freight: (contact as any).meta_sea_freight,
              meta_air_freight: (contact as any).meta_air_freight,
              meta_interested: (contact as any).meta_interested,
              meta_reception_required_email: (contact as any).meta_reception_required_email,
              meta_contact_required_email: (contact as any).meta_contact_required_email,
              meta_presentation: (contact as any).meta_presentation,
              meta_exworks: (contact as any).meta_exworks,
              meta_hight_value_customer: (contact as any).meta_hight_value_customer,
              meta_tutorial: (contact as any).meta_tutorial,
              meta_rejected: (contact as any).meta_rejected,
              meta_wca: (contact as any).meta_wca,
              meta_exclient: (contact as any).meta_exclient,
              archiviata: (contact as any).archiviata,
              completed: (contact as any).completed,
              has_actions: (contact as any).has_actions,
              last_contact: (contact as any).last_contact,
              scheduled_contact: (contact as any).scheduled_contact,
              next_contact_date: (contact as any).next_contact_date,
              created_by: (contact as any).created_by,
              motivo_archiviazione: archiveReason || 'Archiviazione cliente',
              archiviato_da: userId
            });

          if (archiveContactError) throw archiveContactError;
        } else {
          const { error: archiveContactError } = await supabase
            .from('imported_contacts_archiviati')
            .insert({
              imported_contact_id_originale: (contact as any).id,
              import_log_id: (contact as any).import_log_id,
              row_number: (contact as any).row_number,
              original_id: (contact as any).original_id,
              name: (contact as any).name,
              company_name: (contact as any).company_name,
              title: (contact as any).title,
              position: (contact as any).position,
              alias: (contact as any).alias,
              company_alias: (contact as any).company_alias,
              email: (contact as any).email,
              phone: (contact as any).phone,
              cell: (contact as any).cell,
              address: (contact as any).address,
              city: (contact as any).city,
              state: (contact as any).state,
              zip_code: (contact as any).zip_code,
              country: (contact as any).country,
              note: (contact as any).note,
              origin: (contact as any).origin,
              client_code: (contact as any).client_code,
              agent_id: (contact as any).agent_id,
              created_by: (contact as any).created_by,
              stato: (contact as any).stato,
              commercial_anagrafiche_id: (contact as any).commercial_anagrafiche_id,
              meta_client: (contact as any).meta_client,
              meta_express: (contact as any).meta_express,
              meta_sea_freight: (contact as any).meta_sea_freight,
              meta_air_freight: (contact as any).meta_air_freight,
              meta_interested: (contact as any).meta_interested,
              meta_reception_required_email: (contact as any).meta_reception_required_email,
              meta_contact_required_email: (contact as any).meta_contact_required_email,
              meta_presentation: (contact as any).meta_presentation,
              meta_exworks: (contact as any).meta_exworks,
              meta_hight_value_customer: (contact as any).meta_hight_value_customer,
              meta_tutorial: (contact as any).meta_tutorial,
              meta_rejected: (contact as any).meta_rejected,
              meta_wca: (contact as any).meta_wca,
              meta_exclient: (contact as any).meta_exclient,
              archiviata: (contact as any).archiviata,
              completed: (contact as any).completed,
              has_actions: (contact as any).has_actions,
              last_contact: (contact as any).last_contact,
              scheduled_contact: (contact as any).scheduled_contact,
              next_contact_date: (contact as any).next_contact_date,
              is_imported_to_rubrica: (contact as any).is_imported_to_rubrica,
              motivo_archiviazione: archiveReason || 'Archiviazione contatto importato',
              archiviato_da: userId
            });

          if (archiveContactError) throw archiveContactError;
        }

        // Elimina il contatto originale
        const { error: deleteContactError } = await supabase
          .from(source)
          .delete()
          .eq('id', contactId);

        if (deleteContactError) throw deleteContactError;

        toast({
          title: "Archiviazione completata",
          description: `Cliente e ${activities?.length || 0} attività archiviate con successo.`,
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Errore durante l\'eliminazione/archiviazione:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'operazione.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteContact,
    isDeleting
  };
}
