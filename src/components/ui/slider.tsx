import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    minimal?: boolean;
  }
>(({ className, minimal, ...props }, ref) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  
  const isActive = isDragging || isHovered;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
      {...props}
    >
      <SliderPrimitive.Track 
        className={cn(
          "relative h-px w-full grow overflow-hidden rounded-full transition-opacity duration-200",
          minimal 
            ? (isActive ? "bg-white/40 opacity-100" : "bg-transparent opacity-0")
            : "bg-secondary"
        )}
      >
        <SliderPrimitive.Range 
          className={cn(
            "absolute h-full transition-colors duration-200",
            minimal
              ? (isDragging ? "bg-purple-500" : isActive ? "bg-white/60" : "bg-transparent")
              : "bg-purple-500"
          )}
        />
      </SliderPrimitive.Track>
      
      <SliderPrimitive.Thumb 
        className={cn(
          "block h-4 w-4 rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          minimal
            ? (isDragging ? "border-purple-500" : "border-white")
            : "border-purple-500"
        )}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
