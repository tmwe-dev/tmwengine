import { useState } from 'react';
import { PageLayout } from '@/components/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Pause, Play, Square, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useServerSyncJob } from '@/hooks/useServerSyncJob';
import { useEmailCount } from '@/hooks/useEmailCount';
import { useDownloadedEmailsFeed } from '@/hooks/useDownloadedEmailsFeed';
import { DownloadedEmailList } from '@/components/email/download/DownloadedEmailList';

const DEFAULT_FOLDERS = ['INBOX', 'Posta inviata', 'Bozze', 'Posta eliminata', 'Posta indesiderata'];

const EmailDownloadPage = () => {
  const { job, isLoading, error, percentage, startJob, pauseJob, resumeJob, stopJob, clearJob, isActive } = useServerSyncJob();
  const { data: emailCount } = useEmailCount();
  const { emails: feedEmails, isLoading: feedLoading } = useDownloadedEmailsFeed();
  const [selectedFolders, setSelectedFolders] = useState<string[]>(DEFAULT_FOLDERS);

  const toggleFolder = (folder: string) => {
    setSelectedFolders(prev =>
      prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
    );
  };

  const handleStart = async () => {
    if (selectedFolders.length === 0) return;
    await startJob(selectedFolders);
  };

  const statusConfig = {
    running: { label: 'In corso', color: 'bg-blue-500', icon: Loader2 },
    paused: { label: 'In pausa', color: 'bg-yellow-500', icon: Pause },
    completed: { label: 'Completato', color: 'bg-green-500', icon: CheckCircle },
    error: { label: 'Errore', color: 'bg-red-500', icon: AlertCircle },
  };

  return (
    <PageLayout title="Download Email" gradient={true}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{emailCount?.toLocaleString() ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Email nel database</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{job?.downloaded_count?.toLocaleString() ?? '0'}</div>
              <p className="text-xs text-muted-foreground">Scaricate in questo job</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{job?.skipped_count?.toLocaleString() ?? '0'}</div>
              <p className="text-xs text-muted-foreground">Già presenti (skip)</p>
            </CardContent>
          </Card>
        </div>

        {/* Job Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sincronizzazione Server-Side</span>
              {job && (
                <Badge variant="outline" className="gap-1">
                  {(() => {
                    const cfg = statusConfig[job.status];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </>
                    );
                  })()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Folder selection */}
            {!isActive && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Seleziona cartelle da sincronizzare:</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_FOLDERS.map(folder => (
                    <Badge
                      key={folder}
                      variant={selectedFolders.includes(folder) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleFolder(folder)}
                    >
                      {folder}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {job && isActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Cartella: <strong>{job.current_folder || '...'}</strong></span>
                  <span>{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job.downloaded_count} / {job.total_to_download} email</span>
                  {job.error_count > 0 && (
                    <span className="text-destructive">{job.error_count} errori</span>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {job?.error_message && (
              <p className="text-sm text-destructive">{job.error_message}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!isActive && job?.status !== 'running' && (
                <Button onClick={handleStart} disabled={isLoading || selectedFolders.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  {isLoading ? 'Avvio...' : 'Avvia Download'}
                </Button>
              )}
              {job?.status === 'running' && (
                <>
                  <Button variant="outline" onClick={pauseJob}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pausa
                  </Button>
                  <Button variant="destructive" onClick={stopJob}>
                    <Square className="mr-2 h-4 w-4" />
                    Ferma
                  </Button>
                </>
              )}
              {job?.status === 'paused' && (
                <>
                  <Button onClick={resumeJob}>
                    <Play className="mr-2 h-4 w-4" />
                    Riprendi
                  </Button>
                  <Button variant="destructive" onClick={stopJob}>
                    <Square className="mr-2 h-4 w-4" />
                    Ferma
                  </Button>
                </>
              )}
              {(job?.status === 'completed' || job?.status === 'error') && (
                <Button variant="outline" onClick={clearJob}>
                  Nuovo Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        <DownloadedEmailList emails={feedEmails} isLoading={feedLoading} />
      </div>
    </PageLayout>
  );
};

export default EmailDownloadPage;
