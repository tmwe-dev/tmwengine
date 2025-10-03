import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Table2 } from "lucide-react";

interface ImportMethodSelectorProps {
  onSelectMethod: (method: 'column_mapping' | 'row_normalization', origin: string) => void;
  totalRows: number;
}

export function ImportMethodSelector({ onSelectMethod, totalRows }: ImportMethodSelectorProps) {
  const [origin, setOrigin] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<'column_mapping' | 'row_normalization' | null>(null);

  const handleMethodSelect = (method: 'column_mapping' | 'row_normalization') => {
    setSelectedMethod(method);
  };

  const handleConfirm = () => {
    if (selectedMethod && origin.trim()) {
      onSelectMethod(selectedMethod, origin.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Scegli Metodo di Importazione</h2>
        <p className="text-muted-foreground">
          Trovati {totalRows.toLocaleString()} record da importare
        </p>
      </div>

      {/* Origine Field */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="space-y-2">
          <Label htmlFor="origin" className="text-base font-semibold">
            Origine Contatti <span className="text-destructive">*</span>
          </Label>
          <Input
            id="origin"
            placeholder="es: LinkedIn, Fiera Milano 2024, Database Clienti..."
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Specifica la provenienza di questi contatti. Verrà salvata nel campo "origine" per ogni record.
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Column Mapping */}
        <Card className={`p-6 hover:border-primary transition-colors cursor-pointer group ${
          selectedMethod === 'column_mapping' ? 'border-primary bg-primary/5' : ''
        }`}
              onClick={() => handleMethodSelect('column_mapping')}>
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
        <Card className={`p-6 hover:border-primary transition-colors cursor-pointer group ${
          selectedMethod === 'row_normalization' ? 'border-primary bg-primary/5' : 'border-primary/50'
        }`}
              onClick={() => handleMethodSelect('row_normalization')}>
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
              
            </div>
          </div>
        </Card>
      </div>

      {/* Confirm Button */}
      {selectedMethod && (
        <div className="flex justify-center">
          <Button 
            size="lg"
            onClick={handleConfirm}
            disabled={!origin.trim()}
            className="min-w-[200px]"
          >
            Avvia Importazione
          </Button>
        </div>
      )}
    </div>
  );
}
