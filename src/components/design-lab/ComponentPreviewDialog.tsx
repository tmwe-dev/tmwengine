import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Code, Eye, Settings } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ExtractedComponent } from '@/types/design-lab-scanner';

interface ComponentPreviewDialogProps {
  component: ExtractedComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComponentPreviewDialog({
  component,
  open,
  onOpenChange,
}: ComponentPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'props'>('preview');

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {component.component_name}
            <Badge variant="outline">{component.component_type}</Badge>
            {component.is_reusable && (
              <Badge variant="secondary">Riutilizzabile</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Anteprima
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Codice
            </TabsTrigger>
            <TabsTrigger value="props" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Props
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 mt-4">
            <PreviewTab component={component} />
          </TabsContent>

          <TabsContent value="code" className="flex-1 mt-4">
            <CodeTab component={component} />
          </TabsContent>

          <TabsContent value="props" className="flex-1 mt-4">
            <PropsTab component={component} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PreviewTab({ component }: { component: ExtractedComponent }) {
  return (
    <div className="border rounded-lg h-full bg-background">
      <div className="p-4 border-b">
        <p className="text-sm text-muted-foreground">
          Preview del componente in sandbox isolato
        </p>
      </div>
      <ScrollArea className="h-[calc(80vh-250px)]">
        <div className="p-8">
          {component.preview_html ? (
            <div
              dangerouslySetInnerHTML={{ __html: component.preview_html }}
              className="component-preview"
            />
          ) : component.thumbnail_url ? (
            <div className="flex items-center justify-center">
              <img
                src={component.thumbnail_url}
                alt={component.component_name}
                className="max-w-full h-auto rounded border"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted/30 rounded border-2 border-dashed">
              <div className="text-center">
                <Code className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Preview non disponibile
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa il tab "Codice" per visualizzare il JSX
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CodeTab({ component }: { component: ExtractedComponent }) {
  return (
    <ScrollArea className="h-[calc(80vh-250px)] rounded-lg border">
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers
      >
        {component.jsx_code}
      </SyntaxHighlighter>
    </ScrollArea>
  );
}

function PropsTab({ component }: { component: ExtractedComponent }) {
  const propsSchema = component.props_schema || {};
  const hasDependencies = component.dependencies && component.dependencies.length > 0;

  return (
    <ScrollArea className="h-[calc(80vh-250px)]">
      <div className="space-y-6 p-4">
        {/* Props Schema */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Props Schema</h3>
          {Object.keys(propsSchema).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(propsSchema).map(([propName, propInfo]: [string, any]) => (
                <div
                  key={propName}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-semibold">
                      {propName}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {propInfo.type || 'any'}
                    </Badge>
                    {propInfo.required && (
                      <Badge variant="destructive" className="text-xs">
                        required
                      </Badge>
                    )}
                  </div>
                  {propInfo.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {propInfo.description}
                    </p>
                  )}
                  {propInfo.defaultValue !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: <code>{JSON.stringify(propInfo.defaultValue)}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessuna prop definita
            </p>
          )}
        </div>

        {/* Dependencies */}
        {hasDependencies && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Dipendenze</h3>
            <div className="space-y-1">
              {component.dependencies.map((dep: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {dep}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Position Info */}
        {component.position_in_source && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Posizione nel file</h3>
            <div className="p-3 border rounded-lg bg-muted/30 space-y-1 text-sm font-mono">
              {component.position_in_source.file && (
                <p>File: {component.position_in_source.file}</p>
              )}
              {component.position_in_source.line && (
                <p>Linea: {component.position_in_source.line}</p>
              )}
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Statistiche</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Utilizzi</p>
              <p className="text-2xl font-semibold">{component.usage_count}</p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Riutilizzabile</p>
              <p className="text-2xl font-semibold">
                {component.is_reusable ? '✓' : '✗'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
