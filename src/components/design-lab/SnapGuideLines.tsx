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
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <div
              key={`guide-v-${index}`}
              className="absolute top-0 w-[2px] bg-destructive pointer-events-none animate-in fade-in duration-100 z-50"
              style={{
                left: `${guide.position}px`,
                height: '100%',
                boxShadow: '0 0 4px hsl(var(--destructive))',
              }}
            />
          );
        } else {
          return (
            <div
              key={`guide-h-${index}`}
              className="absolute left-0 h-[2px] bg-destructive pointer-events-none animate-in fade-in duration-100 z-50"
              style={{
                top: `${guide.position}px`,
                width: '100%',
                boxShadow: '0 0 4px hsl(var(--destructive))',
              }}
            />
          );
        }
      })}
    </>
  );
};
