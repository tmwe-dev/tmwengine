import { EmailSenderGroup } from './email-management';
import { SenderAnalysis } from './email-management';

export interface EmailCategoryCard {
  id: string;
  group: EmailSenderGroup;
  assignedSenders: SenderAnalysis[];
}

export interface EmailCarousel3DProps {
  categories: EmailSenderGroup[];
  assignedSenders: Map<string, SenderAnalysis[]>;
  activeCategoryId: string | null;
  onRotate?: (categoryId: string) => void;
  onDrop?: (categoryId: string, senderId: string) => void;
  zoom?: number;
}
