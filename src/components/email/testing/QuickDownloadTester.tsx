/**
 * Quick Download Tester - Stub (QuickEmailDownloader rimosso)
 * Reindirizza al nuovo sistema di download email
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TestResult } from '@/lib/email-testing-utils';

interface QuickDownloadTesterProps {
  userEmail: string;
  stressTestMode: boolean;
  onUpdateResult: (updates: Partial<TestResult>) => void;
}

export function QuickDownloadTester({ userEmail, stressTestMode, onUpdateResult }: QuickDownloadTesterProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Quick Download Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Il sistema Quick Download è stato sostituito dal nuovo Download Server-Side.
        </p>
        <Button onClick={() => navigate('/email-download')} size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Vai a Download Email
        </Button>
      </CardContent>
    </Card>
  );
}
