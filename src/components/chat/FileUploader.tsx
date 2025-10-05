import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  isImage: boolean;
}

export const FileUploader = ({ onFilesUploaded, maxFiles = 5 }: FileUploaderProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Puoi caricare massimo ${maxFiles} file`);
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato per caricare file');
        return;
      }

      const uploadedFiles: UploadedFile[] = [];

      for (const file of selectedFiles) {
        // Check file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} supera i 20MB`);
          continue;
        }

        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Errore caricamento ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        const isImage = file.type.startsWith('image/');

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          isImage
        });
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onFilesUploaded(newFiles);
      toast.success(`${uploadedFiles.length} file caricati`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || files.length >= maxFiles}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          {uploading ? 'Caricamento...' : 'Allega File'}
        </Button>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
            >
              {file.isImage ? (
                <ImageIcon className="h-4 w-4 text-blue-500" />
              ) : (
                <FileText className="h-4 w-4 text-gray-500" />
              )}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="hover:bg-destructive/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};