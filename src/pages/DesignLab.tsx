import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Sparkles, Plus } from "lucide-react";
import { useState } from "react";
import { useDesignLabPages } from "@/hooks/useDesignLabPages";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const DesignLab = () => {
  const { pages, isLoading, createPage } = useDesignLabPages();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageDescription, setNewPageDescription] = useState("");

  const handleCreatePage = async () => {
    if (!newPageName.trim()) return;

    await createPage({
      page_name: newPageName,
      description: newPageDescription || undefined,
      is_template: false,
      config: {},
    });

    setIsCreateDialogOpen(false);
    setNewPageName("");
    setNewPageDescription("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      review: "outline",
      published: "default",
      archived: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Design Lab
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual Editor Low-Code - Sistema Enterprise
          </p>
        </div>
        <Button size="lg" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Pagina
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🎯 FASE 1 ULTRA PRO - Database Implementato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">✅ Database</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 5 tabelle create</li>
                <li>• Indici performance attivi</li>
                <li>• RLS policies configurate</li>
                <li>• 4 system actions seed</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">✅ Types & Hooks</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• TypeScript interfaces</li>
                <li>• CRUD hooks ready</li>
                <li>• Sistema base operativo</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>Documentazione completa:</strong> Consultare{" "}
              <code className="bg-background px-2 py-1 rounded">docs/DESIGN_LAB_PLAN.md</code>
              {" "}per dettagli implementazione FASE 2 (Drag & Drop UI).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Le Tue Pagine</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : pages && pages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Versione</TableHead>
                  <TableHead>Creata</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.page_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {page.description || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(page.status)}</TableCell>
                    <TableCell>v{page.version}</TableCell>
                    <TableCell>{format(new Date(page.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <FileCode className="h-4 w-4 mr-2" />
                        Modifica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna pagina creata. Clicca su "Nuova Pagina" per iniziare!
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuova Pagina</DialogTitle>
            <DialogDescription>
              Crea una nuova pagina nel Design Lab
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="page-name">Nome Pagina</Label>
              <Input
                id="page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="es. Dashboard Clienti"
              />
            </div>

            <div>
              <Label htmlFor="page-description">Descrizione (opzionale)</Label>
              <Textarea
                id="page-description"
                value={newPageDescription}
                onChange={(e) => setNewPageDescription(e.target.value)}
                placeholder="Descrivi brevemente la pagina..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreatePage} disabled={!newPageName.trim()}>
              Crea Pagina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignLab;
