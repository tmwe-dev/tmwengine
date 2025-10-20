import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractedComponent } from "@/types/design-lab-scanner";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{component.component_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Anteprima</TabsTrigger>
            <TabsTrigger value="code">Codice</TabsTrigger>
            <TabsTrigger value="props">Props</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-lg p-4 bg-muted min-h-[300px] flex items-center justify-center">
              {component.preview_html ? (
                <div dangerouslySetInnerHTML={{ __html: component.preview_html }} />
              ) : component.thumbnail_url ? (
                <img
                  src={component.thumbnail_url}
                  alt={component.component_name}
                  className="max-w-full h-auto"
                />
              ) : (
                <p className="text-muted-foreground">Anteprima non disponibile</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <pre className="p-4 text-sm">
                <code>{component.jsx_code}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="props" className="mt-4">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-2">
                <h3 className="font-semibold mb-2">Schema Props</h3>
                {Object.entries(component.props_schema || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b">
                    <span className="font-mono text-sm">{key}</span>
                    <span className="text-sm text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
                {Object.keys(component.props_schema || {}).length === 0 && (
                  <p className="text-muted-foreground text-sm">Nessuna prop definita</p>
                )}
              </div>

              {component.dependencies && component.dependencies.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Dipendenze</h3>
                  <ul className="space-y-1">
                    {component.dependencies.map((dep, idx) => (
                      <li key={idx} className="text-sm font-mono text-muted-foreground">
                        {dep}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
