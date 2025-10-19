import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileCode, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('component');
  const [uploading, setUploading] = useState(false);
  
  const extractImports = (content: string): string[] => {
    const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
    const matches = [...content.matchAll(importRegex)];
    return matches.map(m => m[1]);
  };
  
  const extractExports = (content: string): string[] => {
    const exportRegex = /export\s+(default\s+)?(function|const|class)\s+(\w+)/g;
    const matches = [...content.matchAll(exportRegex)];
    return matches.map(m => m[3]);
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const content = await file.text();
      const filePath = `src/${file.name}`;
      
      const imports = extractImports(content);
      const exports = extractExports(content);
      const lineCount = content.split('\n').length;
      
      const { error } = await supabase
        .from('code_index')
        .upsert({
          file_path: filePath,
          file_type: fileType,
          content,
          imports,
          exports,
          line_count: lineCount,
          language: file.name.endsWith('.tsx') ? 'typescript' : 'javascript'
        });
      
      if (error) throw error;
      
      toast.success(`File ${file.name} indicizzato con successo!`);
      setFile(null);
      
    } catch (error: any) {
      toast.error('Errore upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Upload File al Code Index
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>File Type</Label>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page">Page</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="edge-function">Edge Function</SelectItem>
              <SelectItem value="hook">Hook</SelectItem>
              <SelectItem value="util">Utility</SelectItem>
              <SelectItem value="type">Type Definition</SelectItem>
              <SelectItem value="config">Config</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Select File</Label>
          <Input 
            type="file" 
            accept=".ts,.tsx,.js,.jsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Upload & Index</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
