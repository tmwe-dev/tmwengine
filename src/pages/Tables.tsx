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

export default function Tables() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTables = async () => {
    try {
      setLoading(true);
      
      // Get all tables
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_public_tables' as any);
      
      if (tablesError) {
        // Fallback: query information_schema directly
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.tables' as any)
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_type', 'BASE TABLE');
        
        if (schemaError) throw schemaError;
        
        // Get row counts for each table
        const tablesWithCounts = await Promise.all(
          (schemaData || []).map(async (table: any) => {
            const { count, error } = await supabase
              .from(table.table_name)
              .select('*', { count: 'exact', head: true });
            
            return {
              table_name: table.table_name,
              row_count: error ? 0 : (count || 0)
            };
          })
        );
        
        setTables(tablesWithCounts);
      } else {
        setTables(tablesData || []);
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <Card
              key={table.table_name}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTable(table.table_name)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {table.table_name}
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{table.row_count}</div>
                <p className="text-xs text-muted-foreground">
                  record{table.row_count !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
