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

    // Set canvas size to match container
    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawEmailContent();
    };

    const drawEmailContent = () => {
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const padding = 20;
      let yPosition = padding;

      // Draw subject
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 24px Arial';
      const subjectText = subject || '(No Subject)';
      
      // Word wrap for subject
      const subjectLines = wrapText(ctx, subjectText, canvas.width - padding * 2);
      subjectLines.forEach(line => {
        ctx.fillText(line, padding, yPosition);
        yPosition += 32;
      });

      yPosition += 20; // Space between subject and body

      // Draw body
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      
      // Strip HTML tags and decode entities
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = body || 'No content available';
      const bodyText = tempDiv.textContent || tempDiv.innerText || '';

      // Word wrap for body
      const bodyLines = wrapText(ctx, bodyText, canvas.width - padding * 2);
      bodyLines.forEach(line => {
        if (yPosition < canvas.height - padding) {
          ctx.fillText(line, padding, yPosition);
          yPosition += 24;
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
