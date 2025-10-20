import { DistanceInfo } from "@/lib/design-lab/snap-guides";

interface DistanceLabelsProps {
  distances: DistanceInfo[];
}

export const DistanceLabels = ({ distances }: DistanceLabelsProps) => {
  return (
    <>
      {distances.map((dist, index) => (
        <div
          key={`distance-${dist.direction}-${index}`}
          className="absolute bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded pointer-events-none z-50 font-mono animate-in fade-in duration-100"
          style={{
            left: `${dist.x}px`,
            top: `${dist.y}px`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 8px hsl(var(--destructive) / 0.3)',
          }}
        >
          {dist.distance}px
        </div>
      ))}
    </>
  );
};
