import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FolderLock {
  id: string;
  user_email: string;
  folder_name: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useFolderLocks(userEmail: string | null | undefined) {
  const queryClient = useQueryClient();

  // Fetch locks from DB
  const { data: locks = [], isLoading } = useQuery({
    queryKey: ['folder-locks', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];

      const { data, error } = await supabase
        .from('email_folder_locks')
        .select('*')
        .eq('user_email', userEmail);

      if (error) {
        console.error('❌ [useFolderLocks] Error fetching locks:', error);
        throw error;
      }

      console.log('🔒 [useFolderLocks] Loaded locks:', data);
      return data as FolderLock[];
    },
    enabled: !!userEmail,
  });

  // Toggle lock mutation
  const toggleLockMutation = useMutation({
    mutationFn: async (folderName: string) => {
      if (!userEmail) throw new Error('User email not available');

      const currentLock = locks.find(l => l.folder_name === folderName);
      const newLockedState = !currentLock?.is_locked;

      console.log(`🔒 [useFolderLocks] Toggling lock for "${folderName}": ${newLockedState ? 'LOCK' : 'UNLOCK'}`);

      if (currentLock) {
        // Update existing lock
        const { data, error } = await supabase
          .from('email_folder_locks')
          .update({
            is_locked: newLockedState,
            locked_at: newLockedState ? new Date().toISOString() : null,
          })
          .eq('id', currentLock.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new lock
        const { data, error } = await supabase
          .from('email_folder_locks')
          .insert({
            user_email: userEmail,
            folder_name: folderName,
            is_locked: newLockedState,
            locked_at: newLockedState ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folder-locks', userEmail] });
      toast.success(data.is_locked ? `🔒 Cartella bloccata` : `🔓 Cartella sbloccata`, {
        description: `"${data.folder_name}" ${data.is_locked ? 'non verrà scaricata automaticamente' : 'può essere scaricata automaticamente'}`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ [useFolderLocks] Toggle error:', error);
      toast.error('Errore aggiornamento lucchetto', {
        description: error.message,
      });
    },
  });

  // Helper: Check if folder is locked
  const isLocked = (folderName: string): boolean => {
    const lock = locks.find(l => l.folder_name === folderName);
    return lock?.is_locked ?? false;
  };

  // Helper: Get all locked folders
  const getLockedFolders = (): string[] => {
    return locks.filter(l => l.is_locked).map(l => l.folder_name);
  };

  return {
    locks,
    isLoading,
    toggleLock: toggleLockMutation.mutate,
    isTogglingLock: toggleLockMutation.isPending,
    isLocked,
    getLockedFolders,
  };
}
