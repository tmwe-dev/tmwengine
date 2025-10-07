import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Search, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemplateAlias {
  id: string;
  name: string;
  alias: string;
  company_name: string;
  company_alias: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

type SortField = "name" | "alias" | "company_name" | "company_alias" | "title";
type SortOrder = "asc" | "desc";

export default function TemplateAlias() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [editingRecord, setEditingRecord] = useState<TemplateAlias | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["template-alias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_alias")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TemplateAlias[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (record: TemplateAlias) => {
      const { error } = await supabase
        .from("template_alias")
        .update({
          name: record.name,
          alias: record.alias,
          company_name: record.company_name,
          company_alias: record.company_alias,
          title: record.title,
        })
        .eq("id", record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-alias"] });
      toast({
        title: "Record aggiornato",
        description: "Il template alias è stato aggiornato con successo.",
      });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedTemplates = templates
    ?.filter((template) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.alias.toLowerCase().includes(searchLower) ||
        template.company_name.toLowerCase().includes(searchLower) ||
        template.company_alias.toLowerCase().includes(searchLower) ||
        (template.title?.toLowerCase().includes(searchLower) ?? false)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleEditClick = (record: TemplateAlias) => {
    setEditingRecord({ ...record });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingRecord) return;

    if (!editingRecord.name.trim() || !editingRecord.alias.trim() || 
        !editingRecord.company_name.trim() || !editingRecord.company_alias.trim()) {
      toast({
        title: "Errore di validazione",
        description: "Nome, Alias, Company e Company Alias sono obbligatori.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(editingRecord);
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:bg-accent/50"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground"}`} />
    </Button>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Template Alias</span>
            <Badge variant="secondary" className="text-base">
              {filteredAndSortedTemplates?.length ?? 0} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, alias, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton field="title" label="Title" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="name" label="Nome" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="alias" label="Alias" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="company_name" label="Company" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="company_alias" label="Company Alias" />
                  </TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedTemplates && filteredAndSortedTemplates.length > 0 ? (
                  filteredAndSortedTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-accent/30">
                      <TableCell className="font-medium">{template.title || "-"}</TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.alias}</TableCell>
                      <TableCell>{template.company_name}</TableCell>
                      <TableCell>{template.company_alias}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nessun record trovato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifica Template Alias</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingRecord.title || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, title: e.target.value })
                    }
                    placeholder="Mr, Ms, Dr, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={editingRecord.name}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-alias">Alias *</Label>
                  <Input
                    id="edit-alias"
                    value={editingRecord.alias}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, alias: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-company">Company *</Label>
                  <Input
                    id="edit-company"
                    value={editingRecord.company_name}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, company_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-company-alias">Company Alias *</Label>
                  <Input
                    id="edit-company-alias"
                    value={editingRecord.company_alias}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, company_alias: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRecord(null);
                  }}
                >
                  Annulla
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
