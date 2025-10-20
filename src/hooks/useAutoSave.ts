import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (data: any) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useAutoSave = <T,>(
  data: T,
  options: UseAutoSaveOptions
) => {
  const { delay = 2000, onSave, onSuccess, onError } = options;

  // Create debounced save function with useCallback to avoid recreating on every render
  const debouncedSave = useRef(
    debounce(async (dataToSave: T) => {
      try {
        await onSave(dataToSave);
        console.log('✅ Auto-saved at', new Date().toLocaleTimeString());
        onSuccess?.();
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        onError?.(error as Error);
      }
    }, delay)
  ).current;

  // Effect to trigger auto-save when data changes
  useEffect(() => {
    if (data) {
      debouncedSave(data);
    }

    // Cleanup: cancel pending debounced calls on unmount
    return () => {
      debouncedSave.cancel();
    };
  }, [data, debouncedSave]);

  // Manual save function (bypasses debounce)
  const saveNow = useCallback(async () => {
    debouncedSave.cancel();
    try {
      await onSave(data);
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    }
  }, [data, onSave, onSuccess, onError, debouncedSave]);

  return { saveNow };
};
