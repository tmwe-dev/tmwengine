import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Table2 } from "lucide-react";

interface ImportMethodSelectorProps {
  onSelectMethod: (method: 'column_mapping' | 'row_normalization') => void;
  totalRows: number;
}

export function ImportMethodSelector({ onSelectMethod, totalRows }: ImportMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Scegli Metodo di Importazione</h2>
        <p className="text-muted-foreground">
          Trovati {totalRows.toLocaleString()} record da importare
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Column Mapping */}
        <Card className="p-6 hover:border-primary transition-colors cursor-pointer group"
              onClick={() => onSelectMethod('column_mapping')}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Table2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Column Mapping</h3>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ <strong>Veloce</strong> - Istantaneo</p>
              <p>✓ <strong>Dati puliti</strong> - Colonne ben definite</p>
              <p>✓ <strong>Gratuito</strong> - Nessun costo AI</p>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium">Ideale per:</p>
              <p className="text-sm text-muted-foreground">
                File con colonne strutturate e dati coerenti
              </p>
            </div>

            <Button className="w-full" variant="outline">
              Usa Column Mapping
            </Button>
          </div>
        </Card>

        {/* AI Row Normalization */}
        <Card className="p-6 hover:border-primary transition-colors cursor-pointer group border-primary/50"
              onClick={() => onSelectMethod('row_normalization')}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI Normalization</h3>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ <strong>Intelligente</strong> - Riconosce tipo dato</p>
              <p>✓ <strong>Dati misti</strong> - Email e telefoni nella stessa colonna</p>
              <p>✓ <strong>GRATIS</strong> - Gemini Flash gratuito fino al 6 Oct</p>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium">Ideale per:</p>
              <p className="text-sm text-muted-foreground">
                Dati non strutturati o colonne con valori misti
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                ⚡ Batch di 50 record • ~2s per batch
                <br />
                📊 {totalRows} righe = ~{Math.ceil(totalRows / 50)} batch (~{Math.ceil(totalRows / 50 * 2)}s totali)
              </div>
              
              <Button className="w-full">
                Usa AI Normalization
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
