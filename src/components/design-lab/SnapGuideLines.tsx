import { GuideLine } from "@/lib/design-lab/snap-guides";

interface SnapGuideLinesProps {
  guides: GuideLine[];
  canvasScrollLeft?: number;
  canvasScrollTop?: number;
}

export const SnapGuideLines = ({ 
  guides, 
  canvasScrollLeft = 0, 
  canvasScrollTop = 0 
}: SnapGuideLinesProps) => {
  return (
    <>
      {guides.map((guide) => {
        // Crea una key univoca basata su tipo + posizione + source
        const uniqueKey = `${guide.type}-${guide.position}-${guide.source}`;
        
        if (guide.type === 'vertical') {
          return (
            <div
              key={uniqueKey}
              className="absolute w-[1px] pointer-events-none z-50 overflow-hidden"
              style={{
                left: `${guide.position}px`,
                top: '35%',
                height: '30%',
              }}
            >
              <div className="absolute w-full h-full bg-gradient-to-b from-transparent via-destructive via-40% to-transparent animate-line-bounce" />
            </div>
          );
        } else {
          return (
            <div
              key={uniqueKey}
              className="absolute h-[1px] pointer-events-none z-50 overflow-hidden"
              style={{
                top: `${guide.position}px`,
                left: '35%',
                width: '30%',
              }}
            >
              <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-destructive via-40% to-transparent animate-line-bounce" />
            </div>
          );
        }
      })}
    </>
  );
};
