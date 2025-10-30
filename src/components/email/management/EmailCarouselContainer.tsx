/**
 * Container Carousel 3D - Wrapper per visualizzazione carousel
 */

import { EmailCarousel3D } from './EmailCarousel3D';
import type { EmailSenderGroup, SenderAnalysis } from '@/types/email-management';

interface EmailCarouselContainerProps {
  categories: EmailSenderGroup[];
  assignedSenders: Map<string, SenderAnalysis[]>;
  activeCategoryId: string | null;
  zoom: number;
}

export function EmailCarouselContainer({
  categories,
  assignedSenders,
  activeCategoryId,
  zoom,
}: EmailCarouselContainerProps) {
  return (
    <div 
      className="fixed z-5 overflow-visible" 
      style={{ 
        left: '400px',
        top: '140px',
        right: '24px',
        bottom: '24px',
        minHeight: '600px'
      }}
    >
      <EmailCarousel3D
        categories={categories}
        assignedSenders={assignedSenders}
        activeCategoryId={activeCategoryId}
        zoom={zoom}
      />
    </div>
  );
}
