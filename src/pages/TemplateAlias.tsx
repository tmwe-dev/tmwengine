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
import { Pencil, Search, ArrowUpDown, Trash2, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateAlias {
  id: string;
  name: string;
  alias: string;
  company_name: string;
  company_alias: string | null;
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
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState<string>("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["template-alias"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("template_alias")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log(`Loaded ${data?.length} template_alias records, total count: ${count}`);
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

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("template_alias")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["template-alias"] });
      setSelectedRecords(new Set());
      toast({
        title: "Record eliminati",
        description: `${ids.length} record eliminati con successo.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione: ${error.message}`,
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
      // Title filter
      if (titleFilter === "with_value" && !template.title) return false;
      if (titleFilter === "empty" && template.title) return false;
      if (titleFilter !== "all" && titleFilter !== "with_value" && titleFilter !== "empty") {
        if (template.title !== titleFilter) return false;
      }

      // Search term filter
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.alias.toLowerCase().includes(searchLower) ||
        template.company_name.toLowerCase().includes(searchLower) ||
        (template.company_alias?.toLowerCase().includes(searchLower) ?? false) ||
        (template.title?.toLowerCase().includes(searchLower) ?? false)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Get unique title values for filter dropdown
  const uniqueTitles = Array.from(
    new Set(
      templates
        ?.map(t => t.title)
        .filter(t => t !== null && t !== "") as string[]
    )
  ).sort();

  const handleEditClick = (record: TemplateAlias) => {
    setEditingRecord({ ...record });
    setIsEditDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredAndSortedTemplates) {
      setSelectedRecords(new Set(filteredAndSortedTemplates.map(t => t.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRecords(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedRecords.size > 0) {
      deleteMutation.mutate(Array.from(selectedRecords));
    }
  };

  const handleDeleteSingle = (id: string) => {
    setRecordToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate([recordToDelete]);
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    }
  };

  const handleFilterByValue = (value: string) => {
    setSearchTerm(value);
  };

  const clearFilter = () => {
    setSearchTerm("");
  };

  const handleSave = () => {
    if (!editingRecord) return;

    if (!editingRecord.name.trim() || !editingRecord.alias.trim() || 
        !editingRecord.company_name.trim()) {
      toast({
        title: "Errore di validazione",
        description: "Nome, Alias e Company sono obbligatori.",
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
            <div className="flex items-center gap-2">
              {selectedRecords.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina selezionati ({selectedRecords.size})
                </Button>
              )}
              <Badge variant="secondary" className="text-base">
                {searchTerm 
                  ? `${filteredAndSortedTemplates?.length ?? 0} di ${templates?.length ?? 0} records`
                  : `${templates?.length ?? 0} records`
                }
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, alias, company... o clicca su un valore"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                  onClick={clearFilter}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select value={titleFilter} onValueChange={setTitleFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per Title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Title</SelectItem>
                <SelectItem value="with_value">Con Title</SelectItem>
                <SelectItem value="empty">Senza Title</SelectItem>
                {uniqueTitles.length > 0 && (
                  <>
                    <div className="border-t my-1" />
                    {uniqueTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredAndSortedTemplates &&
                        filteredAndSortedTemplates.length > 0 &&
                        selectedRecords.size === filteredAndSortedTemplates.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16 text-center">#</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedTemplates && filteredAndSortedTemplates.length > 0 ? (
                  filteredAndSortedTemplates.map((template, index) => (
                    <TableRow key={template.id} className="hover:bg-accent/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.has(template.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRecord(template.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-destructive">{index + 1}</span>
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => template.title && handleFilterByValue(template.title)}
                        title="Clicca per filtrare"
                      >
                        {template.title || "-"}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleFilterByValue(template.name)}
                        title="Clicca per filtrare"
                      >
                        {template.name}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleFilterByValue(template.alias)}
                        title="Clicca per filtrare"
                      >
                        {template.alias}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleFilterByValue(template.company_name)}
                        title="Clicca per filtrare"
                      >
                        {template.company_name}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => template.company_alias && handleFilterByValue(template.company_alias)}
                        title="Clicca per filtrare"
                      >
                        {template.company_alias || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSingle(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                  <Label htmlFor="edit-company-alias">Company Alias</Label>
                  <Input
                    id="edit-company-alias"
                    value={editingRecord.company_alias || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, company_alias: e.target.value })
                    }
                    placeholder="Opzionale"
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo record? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
