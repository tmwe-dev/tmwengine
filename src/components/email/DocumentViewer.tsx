import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, FileSpreadsheet, File } from 'lucide-react';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
  mimeType: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return <File className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

export function DocumentViewer({ isOpen, onClose, fileName, fileUrl, mimeType }: DocumentViewerProps) {
  const canPreview = mimeType.includes('pdf') || mimeType.includes('text');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getFileIcon(mimeType)}
              <DialogTitle className="text-lg">{fileName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 p-6 pt-4">
          {canPreview ? (
            <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
              {mimeType.includes('pdf') ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title={fileName}
                />
              ) : (
                <div className="p-4 h-full overflow-auto bg-muted/50">
                  <iframe
                    src={fileUrl}
                    className="w-full h-full border-0"
                    title={fileName}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              {getFileIcon(mimeType)}
              <h3 className="mt-4 text-lg font-medium">Anteprima non disponibile</h3>
              <p className="mt-2 text-muted-foreground">
                Questo tipo di file non può essere visualizzato in anteprima.
                <br />
                Clicca su "Download" per scaricare il file.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}