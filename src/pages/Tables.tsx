import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Database, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const handleRefresh = () => {
    if (selectedTable) {
      loadTableData(selectedTable);
    } else {
      loadTables();
    }
  };

  if (selectedTable && tableData) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTable(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna all'elenco
            </Button>
            <h1 className="text-3xl font-bold">Tabella: {selectedTable}</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tabelle Database</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento tabelle...</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {categorizedTables.map((category) => (
            <div key={category.name} className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground border-b pb-2">
                {category.name}
              </h2>
              <div className="space-y-2">
                {category.tables.map((table) => (
                  <Card
                    key={table.table_name}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTable(table.table_name)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{table.table_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{table.row_count}</div>
                        <p className="text-xs text-muted-foreground">
                          record{table.row_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
