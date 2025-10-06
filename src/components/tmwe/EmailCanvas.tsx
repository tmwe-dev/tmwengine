import { useEffect, useRef } from 'react';

interface EmailCanvasProps {
  subject: string;
  body: string;
  isHeaderCollapsed: boolean;
}

export const EmailCanvas = ({ subject, body, isHeaderCollapsed }: EmailCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Reset canvas completely
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Apply scaling for high DPI
      ctx.scale(dpr, dpr);
      
      // Enable antialiasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      drawContent(rect.width, rect.height);
    };

    const drawContent = (width: number, height: number) => {
      // Clear background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const padding = 24;
      let y = padding;

      // Configure text rendering
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Draw subject
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      
      const subjectText = subject || '(No Subject)';
      const subjectLines = wrapText(ctx, subjectText, width - padding * 2);
      
      subjectLines.forEach(line => {
        ctx.fillText(line, padding, y);
        y += 28;
      });

      y += 16;

      // Draw body
      ctx.fillStyle = '#404040';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = body || 'No content available';
      const bodyText = tempDiv.textContent || tempDiv.innerText || '';

      const bodyLines = wrapText(ctx, bodyText, width - padding * 2);
      bodyLines.forEach(line => {
        if (y < height - padding) {
          ctx.fillText(line, padding, y);
          y += 20;
        }
      });
    };

    const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = context.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [subject, body, isHeaderCollapsed]);

  return (
    <canvas 
      ref={canvasRef}
      className="border-2 border-primary/20 rounded-lg shadow-2xl bg-card w-full h-full"
    />
  );
};
