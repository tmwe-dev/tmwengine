import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, Sparkles, Users, Mail, Calendar, TrendingUp, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AIGuideDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title="Guida AI - Esempi e Comandi"
      >
        <HelpCircle className="h-5 w-5 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Guida AI - Comandi e Funzionalità
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[70vh] pr-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Panoramica</TabsTrigger>
                <TabsTrigger value="commands">Comandi</TabsTrigger>
                <TabsTrigger value="workflows">Workflow</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Cos'è l'AI del CRM?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      L'assistente AI è integrato in ogni sezione del CRM e può aiutarti a:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Cercare e analizzare dati</strong> - Trova contatti, email, attività</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Creare record</strong> - Aggiungi contatti, attività, campagne</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Statistiche e report</strong> - Visualizza metriche e KPI</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Automazioni</strong> - Pianifica task e follow-up</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Suggerimenti intelligenti</strong> - Ottieni consigli basati sui dati</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Come Attivare l'AI</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <ol className="space-y-2 list-decimal list-inside">
                      <li>Attiva il toggle <strong>"Usa System Prompt"</strong> nella chat</li>
                      <li>L'AI userà automaticamente il prompt appropriato per la pagina corrente</li>
                      <li>Scrivi la tua domanda o comando in linguaggio naturale</li>
                      <li>L'AI eseguirà le azioni necessarie e risponderà</li>
                    </ol>
                    <div className="bg-primary/10 p-3 rounded-md border border-primary/20 mt-4">
                      <p className="text-xs font-medium text-primary">💡 Suggerimento</p>
                      <p className="text-xs mt-1">Ogni sezione del CRM ha un AI specializzato. Vai nella sezione desiderata per ottenere suggerimenti specifici!</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="commands" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Rubrica e Contatti
                    </CardTitle>
                    <CardDescription>Gestione anagrafica clienti e prospect</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-primary">Esempi di comandi:</p>
                      <ul className="space-y-1 ml-4">
                        <li className="text-muted-foreground">• "Cerca tutti i contatti dell'azienda ABC"</li>
                        <li className="text-muted-foreground">• "Quanti clienti ho in totale?"</li>
                        <li className="text-muted-foreground">• "Mostrami i contatti aggiunti questa settimana"</li>
                        <li className="text-muted-foreground">• "Trova tutti i contatti interessati a sea freight"</li>
                        <li className="text-muted-foreground">• "Crea un nuovo contatto per Mario Rossi di Acme Corp"</li>
                        <li className="text-muted-foreground">• "Aggiorna l'email di [Nome Contatto]"</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Attività e Task
                    </CardTitle>
                    <CardDescription>Pianificazione e tracking attività</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-primary">Esempi di comandi:</p>
                      <ul className="space-y-1 ml-4">
                        <li className="text-muted-foreground">• "Mostrami le attività di oggi con priorità alta"</li>
                        <li className="text-muted-foreground">• "Crea un task di chiamata per domani con ABC Ltd"</li>
                        <li className="text-muted-foreground">• "Quante attività ho in scadenza questa settimana?"</li>
                        <li className="text-muted-foreground">• "Lista tutte le chiamate completate oggi"</li>
                        <li className="text-muted-foreground">• "Pianifica un follow-up email tra 3 giorni"</li>
                        <li className="text-muted-foreground">• "Completa il task X e crea il prossimo follow-up"</li>
                        <li className="text-muted-foreground">• "Mostra task in ritardo e prioritizza"</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email e Comunicazioni
                    </CardTitle>
                    <CardDescription>Gestione email e conversazioni</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-primary">Esempi di comandi:</p>
                      <ul className="space-y-1 ml-4">
                        <li className="text-muted-foreground">• "Cerca email da mario@example.com negli ultimi 7 giorni"</li>
                        <li className="text-muted-foreground">• "Quante email non lette ho in INBOX?"</li>
                        <li className="text-muted-foreground">• "Mostra le email importanti ricevute oggi"</li>
                        <li className="text-muted-foreground">• "Riassumi la conversazione con [Cliente X]"</li>
                        <li className="text-muted-foreground">• "Trova tutte le email con allegati PDF"</li>
                        <li className="text-muted-foreground">• "Classifica le email per argomento"</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Campagne e Marketing
                    </CardTitle>
                    <CardDescription>Gestione campagne outreach</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-primary">Esempi di comandi:</p>
                      <ul className="space-y-1 ml-4">
                        <li className="text-muted-foreground">• "Mostra tutte le campagne attive"</li>
                        <li className="text-muted-foreground">• "Qual è il tasso di apertura della campagna X?"</li>
                        <li className="text-muted-foreground">• "Crea una nuova campagna per clienti interessati"</li>
                        <li className="text-muted-foreground">• "Quali campagne hanno il miglior conversion rate?"</li>
                        <li className="text-muted-foreground">• "Pausa la campagna Y e attiva Z"</li>
                        <li className="text-muted-foreground">• "Report performance ultimi 30 giorni"</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Statistiche e Analisi
                    </CardTitle>
                    <CardDescription>Report e insights dai dati</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-primary">Esempi di comandi:</p>
                      <ul className="space-y-1 ml-4">
                        <li className="text-muted-foreground">• "Dammi le statistiche generali del CRM"</li>
                        <li className="text-muted-foreground">• "Quanti nuovi contatti ho aggiunto questo mese?"</li>
                        <li className="text-muted-foreground">• "Qual è il tasso di completamento task?"</li>
                        <li className="text-muted-foreground">• "Top 10 clienti per interazioni"</li>
                        <li className="text-muted-foreground">• "Analizza il trend email ricevute vs inviate"</li>
                        <li className="text-muted-foreground">• "Mostra la pipeline vendite corrente"</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflows" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Commerciali Intelligenti</CardTitle>
                    <CardDescription>L'AI può gestire processi complessi end-to-end</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">📞 Workflow Post-Chiamata</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          "Ho completato la chiamata con ABC Ltd, pianifica il follow-up"
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                          <li>→ Segna chiamata come completata</li>
                          <li>→ Crea task email di follow-up tra 2 giorni</li>
                          <li>→ Collega al contatto e mostra storico</li>
                          <li>→ Suggerisce template email appropriato</li>
                        </ul>
                      </div>

                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">🎯 Pianificazione Giornata</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          "Prepara la mia giornata lavorativa"
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                          <li>→ Mostra attività in scadenza oggi</li>
                          <li>→ Ordina per priorità (urgenti prima)</li>
                          <li>→ Raggruppa per cliente se multiple</li>
                          <li>→ Fornisce contesto per ogni task</li>
                          <li>→ Propone ordine ottimale di esecuzione</li>
                        </ul>
                      </div>

                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">🔄 Recovery Task Overdue</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          "Ho task in ritardo, aiutami a gestirli"
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                          <li>→ Identifica task scadute per priorità</li>
                          <li>→ Analizza dipendenze e blockers</li>
                          <li>→ Suggerisce ri-prioritizzazione</li>
                          <li>→ Propone accorpamento task simili</li>
                          <li>→ Aggiorna scadenze in batch</li>
                        </ul>
                      </div>

                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">📊 Analisi Performance</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          "Analizza le mie performance commerciali"
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                          <li>→ Calcola KPI principali</li>
                          <li>→ Confronta con periodo precedente</li>
                          <li>→ Identifica trend e pattern</li>
                          <li>→ Suggerisce aree di miglioramento</li>
                          <li>→ Propone azioni correttive</li>
                        </ul>
                      </div>

                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">🚀 Onboarding Nuovo Cliente</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          "Nuovo cliente Acme Corp, prepara l'onboarding"
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                          <li>→ Crea record contatto completo</li>
                          <li>→ Pianifica chiamata di benvenuto (+1 giorno)</li>
                          <li>→ Task invio materiale presentazione (+2 giorni)</li>
                          <li>→ Follow-up verifica ricezione (+5 giorni)</li>
                          <li>→ Meeting setup configurazione (+7 giorni)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Funzionalità Avanzate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">🔗 Task Chaining</p>
                      <p className="text-xs text-muted-foreground">"Dopo questa attività, cosa devo fare?" - L'AI suggerisce automaticamente il prossimo step logico</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">📦 Batch Operations</p>
                      <p className="text-xs text-muted-foreground">"Completa tutte le chiamate di oggi" - Operazioni multiple con un solo comando</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">🧠 Smart Scheduling</p>
                      <p className="text-xs text-muted-foreground">"Pianifica follow-up considerando il timezone del cliente" - Scheduling intelligente</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">🔄 Context Switching</p>
                      <p className="text-xs text-muted-foreground">"Passa da cliente A a cliente B" - L'AI fornisce automaticamente il context switch</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">🎯 Proattività</p>
                      <p className="text-xs text-muted-foreground">L'AI ti avvisa: "Il meeting con X è domani, hai preparato i materiali?"</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium mb-2">💡 Best Practice</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Usa linguaggio naturale, come se parlassi con un collega</li>
                      <li>• Sii specifico: nomi, date, criteri aiutano l'AI a capire meglio</li>
                      <li>• L'AI ricorda il contesto della conversazione, puoi fare domande di follow-up</li>
                      <li>• Attiva "Memoria Completa" per conversazioni lunghe e complesse</li>
                      <li>• Ogni sezione ha un AI specializzato: vai nella sezione per comandi specifici</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
