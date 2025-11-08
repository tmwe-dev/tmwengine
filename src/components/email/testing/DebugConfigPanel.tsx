/**
 * Debug Config Panel - Pannello configurazione debug
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, User } from 'lucide-react';

interface DebugConfigPanelProps {
  userEmail: string;
  onOpenPreferences: () => void;
}

export function DebugConfigPanel({ userEmail, onOpenPreferences }: DebugConfigPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurazione Test
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">User Email</p>
            <p className="text-sm text-muted-foreground">
              {userEmail || 'Non configurato'}
            </p>
          </div>
          {userEmail && (
            <Badge variant="outline" className="ml-2">
              ✓ Autenticato
            </Badge>
          )}
        </div>

        <Button onClick={onOpenPreferences} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configura Cartelle
        </Button>
      </CardContent>
    </Card>
  );
}
