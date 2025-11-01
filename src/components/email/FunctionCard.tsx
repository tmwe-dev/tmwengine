import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FunctionCardProps {
  name: string;
  description: string;
  endpoint: string;
  method?: string;
  exampleCode: string;
  exampleResponse: string;
}

export const FunctionCard = ({ 
  name, 
  description, 
  endpoint,
  method = 'POST',
  exampleCode, 
  exampleResponse 
}: FunctionCardProps) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const copyToClipboard = (text: string, type: 'code' | 'response') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code className="w-5 h-5 text-primary" />
              {name}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline">{method}</Badge>
            <Badge variant="secondary" className="text-xs font-mono">{endpoint}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">📝 Example Request</h4>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => copyToClipboard(exampleCode, 'code')}
            >
              {copiedCode ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedCode ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
            {exampleCode}
          </pre>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">✅ Example Response</h4>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => copyToClipboard(exampleResponse, 'response')}
            >
              {copiedResponse ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedResponse ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-slate-950 text-blue-400 p-4 rounded-lg overflow-x-auto text-xs">
            {exampleResponse}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
