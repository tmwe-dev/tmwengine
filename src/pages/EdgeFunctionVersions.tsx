import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Clock, User, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EdgeFunctionVersion {
  id: string;
  function_name: string;
  version_number: number;
  content: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
}

export default function EdgeFunctionVersions() {
  const [versions, setVersions] = useState<EdgeFunctionVersion[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    const { data, error } = await supabase
      .from('edge_function_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare le versioni",
        variant: "destructive",
      });
      return;
    }

    setVersions(data || []);
    if (data && data.length > 0) {
      setSelectedFunction(data[0].function_name);
    }
  };

  const functionNames = [...new Set(versions.map(v => v.function_name))];
  const filteredVersions = selectedFunction
    ? versions.filter(v => v.function_name === selectedFunction)
    : versions;

  const handleBackupAll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-all-edge-functions');
      
      if (error) throw error;
      
      toast({
        title: "✅ Backup completato",
        description: `${data.backups.length} edge functions salvate`,
      });
      
      await loadVersions();
    } catch (error: any) {
      toast({
        title: "Errore backup",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edge Functions Versions</h1>
          <p className="text-muted-foreground">
            Storico e gestione versioni delle Edge Functions
          </p>
        </div>
        <Button onClick={handleBackupAll}>
          Backup Tutte le Functions ORA
        </Button>
      </div>

      <Tabs value={selectedFunction} onValueChange={setSelectedFunction}>
        <TabsList className="mb-4">
          {functionNames.map(name => (
            <TabsTrigger key={name} value={name}>
              {name}
            </TabsTrigger>
          ))}
        </TabsList>

        {functionNames.map(funcName => (
          <TabsContent key={funcName} value={funcName}>
            <div className="space-y-4">
              {filteredVersions.map((version) => (
                <Card key={version.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={version.is_active ? "default" : "secondary"}>
                        v{version.version_number}
                      </Badge>
                      {version.is_active && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Attiva
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(version.created_at), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>

                  {version.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {version.description}
                    </p>
                  )}

                  <ScrollArea className="h-[300px] w-full rounded border bg-muted/50 p-4">
                    <pre className="text-xs">
                      <code>{version.content}</code>
                    </pre>
                  </ScrollArea>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
