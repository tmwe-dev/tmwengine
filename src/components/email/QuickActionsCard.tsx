import { useNavigate } from 'react-router-dom';
import { Download, Zap, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActionsCard() {
  const navigate = useNavigate();

  return (
    <Card className="bg-background/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => navigate('/funnemail?tab=fun')}
        >
          <Download className="h-4 w-4" />
          Download Emails
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => navigate('/funnemail?view=quick-download')}
        >
          <Zap className="h-4 w-4" />
          Quick Download
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => navigate('/funnemail?view=integrity')}
        >
          <Settings className="h-4 w-4" />
          Check Integrity
        </Button>
      </CardContent>
    </Card>
  );
}
