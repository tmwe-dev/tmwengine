/**
 * TMWE API Modules - Main Export
 * 
 * Provides organized access to all TMWE API operations
 */

export { EmailApi } from './EmailApi';
export { FolderApi } from './FolderApi';
export { ClassificationApi } from './ClassificationApi';
export { SenderApi } from './SenderApi';

// Re-export types
export type { 
  TMWEClassification, 
  CreateClassificationParams 
} from './ClassificationApi';

export type { 
  TMWESenderProfile, 
  CreateSenderProfileParams 
} from './SenderApi';
