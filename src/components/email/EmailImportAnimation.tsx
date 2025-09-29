import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Folder, Mail, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailImportAnimationProps {
  isImporting: boolean;
  totalEmails: number;
  importedEmails: number;
  sourceFolder: string;
  destinationFolder: string;
  onStartImport: () => void;
  onCancelImport: () => void;
  estimatedTimeMs?: number;
  startTime?: Date;
}

interface FlyingEmail {
  id: string;
  subject: string;
  x: number;
  y: number;
  progress: number;
  isVisible: boolean;
}

export const EmailImportAnimation: React.FC<EmailImportAnimationProps> = ({
  isImporting,
  totalEmails,
  importedEmails,
  sourceFolder,
  destinationFolder,
  onStartImport,
  onCancelImport,
  estimatedTimeMs = 0,
  startTime
}) => {
  const [flyingEmails, setFlyingEmails] = useState<FlyingEmail[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  const percentage = totalEmails > 0 ? Math.round((importedEmails / totalEmails) * 100) : 0;
  const remainingEmails = totalEmails - importedEmails;

  // Timer per aggiornare il tempo trascorso
  useEffect(() => {
    if (!isImporting || !startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - startTime.getTime();
      setElapsedTime(elapsed);

      // Calcola tempo rimanente basato sulla velocità corrente
      if (importedEmails > 0) {
        const avgTimePerEmail = elapsed / importedEmails;
        const estimated = avgTimePerEmail * remainingEmails;
        setRemainingTime(estimated);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isImporting, startTime, importedEmails, remainingEmails]);

  // Gestisce l'animazione delle email che volano
  useEffect(() => {
    if (!isImporting) {
      setFlyingEmails([]);
      return;
    }

    const interval = setInterval(() => {
      setFlyingEmails(prev => {
        // Rimuovi email completate
        const active = prev.filter(email => email.progress < 100);
        
        // Aggiungi nuova email se necessario (max 3 contemporaneamente)
        if (active.length < 3 && Math.random() > 0.7) {
          const newEmail: FlyingEmail = {
            id: `email-${Date.now()}-${Math.random()}`,
            subject: generateRandomSubject(),
            x: 0,
            y: Math.random() * 100 + 50, // Posizione Y casuale
            progress: 0,
            isVisible: true
          };
          active.push(newEmail);
        }

        // Aggiorna posizione delle email esistenti
        return active.map(email => ({
          ...email,
          progress: email.progress + 2, // Velocità animazione
          x: email.progress * 4 // Movimento orizzontale
        }));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isImporting]);

  const generateRandomSubject = () => {
    const subjects = [
      'Meeting Request',
      'Project Update',
      'Invoice #12345',
      'Weekly Report',
      'System Alert',
      'New Message',
      'Confirmation',
      'Newsletter'
    ];
    return subjects[Math.floor(Math.random() * subjects.length)];
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Email Import Manager
          {isImporting && (
            <Badge variant="secondary" className="animate-pulse">
              <Clock className="h-3 w-3 mr-1" />
              In Progress
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalEmails}</div>
            <div className="text-sm text-muted-foreground">Total Emails</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{importedEmails}</div>
            <div className="text-sm text-muted-foreground">Imported</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{remainingEmails}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{percentage}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Time Information */}
        {isImporting && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span>Remaining: {formatTime(remainingTime)}</span>
            </div>
          </div>
        )}

        {/* Windows 95 Style Animation Area */}
        <div className="relative h-48 rounded-lg overflow-hidden">
          {/* Source Folder */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
            <div className="relative">
              <Folder className="h-16 w-16 text-yellow-600" />
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 min-w-[24px] h-6 text-xs"
              >
                {remainingEmails}
              </Badge>
            </div>
            <div className="text-xs mt-2 text-center font-mono">
              {sourceFolder}
            </div>
          </div>

          {/* Destination Folder */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
            <div className="relative">
              <Folder className="h-16 w-16 text-blue-600" />
              <Badge 
                variant="default" 
                className="absolute -top-2 -right-2 min-w-[24px] h-6 text-xs bg-green-600"
              >
                {importedEmails}
              </Badge>
            </div>
            <div className="text-xs mt-2 text-center font-mono">
              {destinationFolder}
            </div>
          </div>

          {/* Flying Emails Animation */}
          {flyingEmails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "absolute transition-all duration-100 ease-linear",
                email.isVisible ? "opacity-100" : "opacity-0"
              )}
              style={{
                left: `${email.x + 80}px`,
                top: `${email.y}px`,
                transform: 'translateY(-50%)'
              }}
            >
              <div className="flex items-center gap-2 bg-white border border-gray-400 rounded px-2 py-1 shadow-lg">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-mono max-w-20 truncate">
                  {email.subject}
                </span>
              </div>
            </div>
          ))}

          {/* Animation Path Line */}
          {isImporting && (
            <div className="absolute top-1/2 left-20 right-20 h-0.5 bg-dashed-line bg-gray-400 opacity-50"></div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center">
          {!isImporting ? (
            <Button onClick={onStartImport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Start Import
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancelImport} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Cancel Import
            </Button>
          )}
        </div>

        {/* Completion Status */}
        {!isImporting && importedEmails > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Import completed successfully! {importedEmails} emails imported.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};