import { useContext } from 'react';
import { useGlobalAICanvas as useGlobalAICanvasContext } from '@/contexts/GlobalAICanvasContext';

/**
 * Hook per aprire AI Canvas da qualsiasi componente
 * 
 * Usage examples:
 * 
 * // Da EmailManagementTab - context sender
 * const { openAICanvas } = useGlobalAICanvas();
 * openAICanvas({
 *   type: 'sender',
 *   senderEmail: 'example@mail.com'
 * });
 * 
 * // Da SmartInbox - context email specifica
 * openAICanvas({
 *   type: 'email',
 *   senderEmail: 'sender@mail.com',
 *   emailUid: '12345',
 *   emailSubject: 'Meeting tomorrow',
 *   emailBody: 'Full email body...'
 * });
 * 
 * // General AI assistant
 * openAICanvas({ type: 'general' });
 */
export const useGlobalAICanvas = () => {
  const context = useGlobalAICanvasContext();

  /**
   * Open AI Canvas with specific email context
   */
  const openAICanvasForEmail = (params: {
    senderEmail: string;
    emailUid?: string;
    emailSubject?: string;
    emailBody?: string;
  }) => {
    context.openCanvas({
      type: 'email',
      ...params,
    });
  };

  /**
   * Open AI Canvas with sender context (for creating automations)
   */
  const openAICanvasForSender = (senderEmail: string) => {
    context.openCanvas({
      type: 'sender',
      senderEmail,
    });
  };

  /**
   * Open AI Canvas in general mode (no specific context)
   */
  const openAICanvasGeneral = () => {
    context.openCanvas({
      type: 'general',
    });
  };

  return {
    ...context,
    openAICanvasForEmail,
    openAICanvasForSender,
    openAICanvasGeneral,
  };
};
