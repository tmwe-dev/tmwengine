import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FolderLock {
  folder_name: string;
  user_email: string;
  is_locked: boolean;
  locked_at: string;
}

export function useFolderLocks(userEmail: string | null) {
  const [locks, setLocks] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load locks on mount
  useEffect(() => {
    if (!userEmail) return;
    loadLocks();
  }, [userEmail]);

  const loadLocks = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_folder_locks' as any)
        .select('folder_name, is_locked')
        .eq('user_email', userEmail);

      if (error) throw error;

      const lockMap = new Map<string, boolean>();
      const lockData = (data || []) as unknown as FolderLock[];
      lockData.forEach((lock) => {
        lockMap.set(lock.folder_name, lock.is_locked);
      });
      
      setLocks(lockMap);
    } catch (error) {
      console.error('❌ Error loading folder locks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLock = async (folderName: string) => {
    if (!userEmail) {
      toast({
        title: '❌ Errore',
        description: 'Email utente non disponibile',
        variant: 'destructive',
      });
      return;
    }

    const currentLockState = locks.get(folderName) || false;
    const newLockState = !currentLockState;

    try {
      const { error } = await supabase
        .from('email_folder_locks' as any)
        .upsert({
          folder_name: folderName,
          user_email: userEmail,
          is_locked: newLockState,
          locked_at: new Date().toISOString(),
        }, {
          onConflict: 'folder_name,user_email'
        });

      if (error) throw error;

      // Update local state
      setLocks(prev => {
        const newMap = new Map(prev);
        newMap.set(folderName, newLockState);
        return newMap;
      });

      toast({
        title: newLockState ? '🔒 Cartella bloccata' : '🔓 Cartella sbloccata',
        description: `${folderName}`,
      });
    } catch (error) {
      console.error('❌ Error toggling lock:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile modificare il blocco',
        variant: 'destructive',
      });
    }
  };

  const isLocked = (folderName: string): boolean => {
    return locks.get(folderName) || false;
  };

  const getLockedFolders = (): string[] => {
    return Array.from(locks.entries())
      .filter(([_, isLocked]) => isLocked)
      .map(([folderName]) => folderName);
  };

  return {
    locks,
    isLoading,
    toggleLock,
    isLocked,
    getLockedFolders,
    refreshLocks: loadLocks,
  };
}
