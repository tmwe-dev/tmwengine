import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Database, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface TableInfo {
  table_name: string;
  row_count: number;
}

interface TableData {
  columns: string[];
  rows: any[];
}

interface TableCategory {
  name: string;
  tables: TableInfo[];
}

export default function Tables() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categorizeTable = (tableName: string): string => {
    if (tableName === 'rubrica' || tableName === 'attivita') {
      return 'CRM & Contatti';
    }
    if (tableName.startsWith('email_')) {
      return 'Email';
    }
    if (tableName.startsWith('chat_')) {
      return 'Chat AI';
    }
    if (tableName.startsWith('import') || tableName === 'file_imports') {
      return 'Import';
    }
    if (tableName.startsWith('config_')) {
      return 'Configurazione';
    }
    if (tableName === 'user_roles') {
      return 'Utenti & Permessi';
    }
    return 'Altro';
  };

  const getCategorizedTables = (): TableCategory[] => {
    const categories: { [key: string]: TableInfo[] } = {};
    
    tables.forEach(table => {
      const category = categorizeTable(table.table_name);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(table);
    });

    return Object.entries(categories)
      .map(([name, tables]) => ({ name, tables }))
      .sort((a, b) => {
        const order = ['CRM & Contatti', 'Email', 'Chat AI', 'Import', 'Configurazione', 'Utenti & Permessi', 'Altro'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_tables_with_counts');
      
      if (error) throw error;
      
      setTables(data || []);
    } catch (error: any) {
      console.error('Error loading tables:', error);
      toast.error('Errore nel caricamento delle tabelle');
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    try {
      setRefreshing(true);
      
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(1000);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        setTableData({
          columns,
          rows: data
        });
      } else {
        setTableData({
          columns: [],
          rows: []
        });
      }
      
      // Setup realtime subscription
      const channel = supabase
        .channel(`table-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          () => {
            // Reload data on any change
            loadTableData(tableName);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error('Error loading table data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      const cleanup = loadTableData(selectedTable);
      return () => {
        cleanup?.then(fn => fn?.());
      };
    } else {
      setTableData(null);
    }
  }, [selectedTable]);

  const handleDeleteCategory = async (categoryName: string, categoryTables: TableInfo[]) => {
    setIsDeleting(true);
    const toastId = toast.loading(`Eliminazione records da ${categoryTables.length} tabelle in corso...`);
    
    try {
      let totalDeleted = 0;
      let hasErrors = false;
      
      for (const table of categoryTables) {
        const { error } = await supabase
          .from(table.table_name as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (error) {
          console.error(`Errore eliminazione da ${table.table_name}:`, error);
          hasErrors = true;
        } else {
          totalDeleted += table.row_count;
        }
      }
      
      if (hasErrors) {
        toast.error(`Eliminazione completata con errori`, { id: toastId });
      } else {
        toast.success(`${totalDeleted} record eliminati con successo da ${categoryName}`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Errore eliminazione categoria:', error);
      toast.error('Errore durante l\'eliminazione', { id: toastId });
    } finally {
      // Refresh data to update counts
      await loadTables();
      setIsDeleting(false);
      setDeleteCategory(null);
    }
  };

  const handleRefresh = () => {
    if (selectedTable) {
      loadTableData(selectedTable);
    } else {
      loadTables();
    }
  };

  if (selectedTable && tableData) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTable(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-2xl font-bold">Tabella: {selectedTable}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {tableData.rows.length} record{tableData.rows.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full">
              {tableData.rows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nessun record presente nella tabella
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableData.columns.map((column) => (
                        <TableHead key={column} className="font-bold whitespace-nowrap">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {tableData.columns.map((column) => (
                          <TableCell key={column} className="whitespace-nowrap">
                            {typeof row[column] === 'object' && row[column] !== null
                              ? JSON.stringify(row[column])
                              : String(row[column] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categorizedTables = getCategorizedTables();

  return (
    <div className="container mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tabelle Database</h1>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento tabelle...</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {categorizedTables.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {category.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteCategory(category.name)}
                  disabled={isDeleting || category.tables.every(t => t.row_count === 0)}
                  className="h-8 px-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {category.tables.map((table) => (
                  <Card
                    key={table.table_name}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedTable(table.table_name)}
                  >
                    <CardContent className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{table.table_name}</span>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap ml-2">
                        {table.row_count}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <AlertDialog open={deleteCategory !== null} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare tutti i record dalle tabelle di "{deleteCategory}"?
              Questa operazione non può essere annullata.
              {deleteCategory && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-semibold mb-2">Tabelle interessate:</p>
                  <ul className="text-sm space-y-1">
                    {categorizedTables
                      .find(cat => cat.name === deleteCategory)
                      ?.tables.map(table => (
                        <li key={table.table_name}>
                          • {table.table_name} ({table.row_count} record{table.row_count !== 1 ? 's' : ''})
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const category = categorizedTables.find(cat => cat.name === deleteCategory);
                if (category) {
                  handleDeleteCategory(deleteCategory!, category.tables);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina tutto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
