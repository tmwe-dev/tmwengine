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
  verticalOffset?: number;
  onPrevious: () => void;
  onNext: () => void;
  hoveredGroupId?: string | null;
}

export function EmailCarouselContainer({
  categories,
  assignedSenders,
  activeCategoryId,
  zoom,
  verticalOffset = 0,
  onPrevious,
  onNext,
  hoveredGroupId,
}: EmailCarouselContainerProps) {
  return (
    <div 
      className="flex-1 overflow-visible relative min-h-[600px]"
    >
      <EmailCarousel3D
        categories={categories}
        assignedSenders={assignedSenders}
        activeCategoryId={activeCategoryId}
        zoom={zoom}
        verticalOffset={verticalOffset}
      />
      
      {/* Aree cliccabili invisibili (clone Radio Chat) */}
      {categories.length > 1 && (
        <>
          {/* Area sinistra - vai indietro */}
          <button
            onClick={onPrevious}
            className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer group"
            aria-label="Categoria precedente"
          />
          
          {/* Area destra - vai avanti */}
          <button
            onClick={onNext}
            className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer group"
            aria-label="Categoria successiva"
          />
        </>
      )}
    </div>
  );
}
