import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CodeDiffViewerProps {
  original: string;
  proposed: string;
  language: string;
}

export function CodeDiffViewer({ original, proposed, language }: CodeDiffViewerProps) {
  const diff = useMemo(() => {
    const origLines = original.split('\n');
    const propLines = proposed.split('\n');
    
    const maxLen = Math.max(origLines.length, propLines.length);
    const diffLines: Array<{ type: 'same' | 'removed' | 'added', content: string, lineNum: number }> = [];
    
    for (let i = 0; i < maxLen; i++) {
      if (origLines[i] === propLines[i]) {
        diffLines.push({ type: 'same', content: origLines[i] || '', lineNum: i + 1 });
      } else {
        if (origLines[i] !== undefined) {
          diffLines.push({ type: 'removed', content: origLines[i], lineNum: i + 1 });
        }
        if (propLines[i] !== undefined) {
          diffLines.push({ type: 'added', content: propLines[i], lineNum: i + 1 });
        }
      }
    }
    
    return diffLines;
  }, [original, proposed]);
  
  return (
    <Card className="p-4 bg-gray-950">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-xs">
          {diff.map((line, idx) => (
            <div 
              key={idx} 
              className={`
                px-2 py-0.5
                ${line.type === 'removed' ? 'bg-red-900/30 text-red-400' : ''}
                ${line.type === 'added' ? 'bg-green-900/30 text-green-400' : ''}
                ${line.type === 'same' ? 'text-gray-400' : ''}
              `}
            >
              <span className="inline-block w-12 text-right mr-4 text-gray-600">
                {line.lineNum}
              </span>
              <span className="inline-block w-4 mr-2">
                {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
