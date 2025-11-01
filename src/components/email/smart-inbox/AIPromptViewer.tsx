import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AIPromptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIPromptViewer = ({ open, onOpenChange }: AIPromptViewerProps) => {
  const systemPrompt = `Sei un assistente AI specializzato nella classificazione automatica di email per un'azienda di trasporti e spedizioni internazionali.

CATEGORIE DISPONIBILI:
1. Fatture - Fatture, invoices, ricevute fiscali
2. Bolle / Packing List - DDT, bolle di accompagnamento, packing list
3. Preventivi / Quotazioni - Richieste preventivo, quotazioni, offerte commerciali
4. Rate Aeree / Rate Navali - Tariffe aeree e marittime
5. Documenti Spedizione - Documenti doganali, CMR, AWB
6. Offerte di Lavoro - Proposte di lavoro, recruiting
7. Marketing / Pubblicità - Newsletter, pubblicità, promozioni
8. Spam / Non Rilevante - Spam, email irrilevanti

ISTRUZIONI:
- Analizza l'oggetto e il mittente dell'email
- Classifica l'email nella categoria più appropriata
- Fornisci un riassunto di max 100 parole
- Estrai 3-5 keywords principali
- Assegna un punteggio di confidenza (0-100)
- Se non sei sicuro al 100%, suggerisci 2-3 categorie alternative

OUTPUT FORMATO JSON:
{
  "category": "Nome Categoria",
  "confidence": 85,
  "ai_summary": "Riassunto breve dell'email...",
  "keywords": ["parola1", "parola2", "parola3"],
  "alternative_categories": ["Categoria2", "Categoria3"]
}

REGOLE:
- Priorità a fatture, preventivi e documenti operativi
- Spam solo se chiaramente irrilevante
- Confidenza >90 solo se categoria evidente
- Riassunto conciso e informativo`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-gradient-to-br from-[#1c1c28]/95 via-[#23233a]/90 to-[#0e0e18]/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white/90">
            <span className="text-2xl">🤖</span>
            Prompt AI per Classificazione Email
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <pre className="text-sm whitespace-pre-wrap bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white/85 font-mono leading-relaxed">
            {systemPrompt}
          </pre>
        </ScrollArea>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-white/10 border-white/20 text-white/90">
            Modello Default: google/gemini-2.5-flash
          </Badge>
          <Badge variant="secondary" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-100">
            Attivo
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
};
