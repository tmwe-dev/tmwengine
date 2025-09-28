import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle, Settings, BarChart3, Zap, RefreshCw } from 'lucide-react';

interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  aiClassification?: {
    intent: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    suggestedActions: string[];
    confidence: number;
  };
}

interface AIClassificationPanelProps {
  emails: Email[];
}

interface ClassificationStats {
  totalClassified: number;
  averageConfidence: number;
  intents: { [key: string]: number };
  categories: { [key: string]: number };
  priorities: { [key: string]: number };
  accuracyRate: number;
}

interface AIModel {
  id: string;
  name: string;
  accuracy: number;
  speed: string;
  cost: string;
  status: 'active' | 'inactive' | 'training';
}

export const AIClassificationPanel: React.FC<AIClassificationPanelProps> = ({ emails }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [autoClassification, setAutoClassification] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);

  const aiModels: AIModel[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4 Turbo',
      accuracy: 94.5,
      speed: 'Veloce',
      cost: 'Alto',
      status: 'active'
    },
    {
      id: 'claude-3',
      name: 'Claude 3 Sonnet',
      accuracy: 92.8,
      speed: 'Medio',
      cost: 'Medio',
      status: 'active'
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      accuracy: 91.2,
      speed: 'Veloce',
      cost: 'Basso',
      status: 'active'
    },
    {
      id: 'custom-model',
      name: 'Modello Personalizzato',
      accuracy: 89.6,
      speed: 'Lento',
      cost: 'Basso',
      status: 'training'
    }
  ];

  // Calcola statistiche
  useEffect(() => {
    const classifiedEmails = emails.filter(email => email.aiClassification);
    
    if (classifiedEmails.length > 0) {
      const intents: { [key: string]: number } = {};
      const categories: { [key: string]: number } = {};
      const priorities: { [key: string]: number } = {};
      let totalConfidence = 0;

      classifiedEmails.forEach(email => {
        const classification = email.aiClassification!;
        
        intents[classification.intent] = (intents[classification.intent] || 0) + 1;
        categories[classification.category] = (categories[classification.category] || 0) + 1;
        priorities[classification.priority] = (priorities[classification.priority] || 0) + 1;
        totalConfidence += classification.confidence;
      });

      setStats({
        totalClassified: classifiedEmails.length,
        averageConfidence: totalConfidence / classifiedEmails.length,
        intents,
        categories,
        priorities,
        accuracyRate: 93.2 // Simulato
      });
    }
  }, [emails]);

  const handleBulkClassification = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const unclassifiedEmails = emails.filter(email => !email.aiClassification);
      
      for (let i = 0; i < unclassifiedEmails.length; i++) {
        // Simulazione processamento
        await new Promise(resolve => setTimeout(resolve, 500));
        setProcessingProgress(((i + 1) / unclassifiedEmails.length) * 100);
      }

      toast({
        title: "Classificazione completata",
        description: `${unclassifiedEmails.length} email classificate automaticamente`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la classificazione automatica",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleRetrainModel = async () => {
    try {
      toast({
        title: "Riaddestramento avviato",
        description: "Il modello verrà riaddestrato con i nuovi dati",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il riaddestramento",
        variant: "destructive",
      });
    }
  };

  const getModelStatus = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattivo</Badge>;
      case 'training':
        return <Badge variant="outline">In addestramento</Badge>;
      default:
        return <Badge variant="secondary">Sconosciuto</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="models">Modelli AI</TabsTrigger>
          <TabsTrigger value="settings">Configurazione</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Classificate</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClassified}</div>
                  <p className="text-xs text-muted-foreground">
                    su {emails.length} totali
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confidenza Media</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <Progress value={stats.averageConfidence * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasso di Accuratezza</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accuracyRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Ultimo periodo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Miglioramento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+2.3%</div>
                  <p className="text-xs text-muted-foreground">
                    Rispetto al mese scorso
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Classification Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni di Classificazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processamento in corso...</span>
                    <span>{processingProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={processingProgress} />
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={handleBulkClassification}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Brain className="mr-1 h-4 w-4" />
                  {isProcessing ? 'Processamento...' : 'Classifica Tutte'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRetrainModel}
                  disabled={isProcessing}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Riaddestra
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {emails.filter(e => !e.aiClassification).length} email non classificate
              </div>
            </CardContent>
          </Card>

          {/* Distribution Charts */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuzione Intenti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.intents).map(([intent, count]) => (
                      <div key={intent} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{intent.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuzione Categorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.categories).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuzione Priorità</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.priorities).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{priority}</span>
                        <Badge variant={getPriorityColor(priority) as any}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelli AI Disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modello</TableHead>
                    <TableHead>Accuratezza</TableHead>
                    <TableHead>Velocità</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{model.accuracy}%</span>
                          <Progress value={model.accuracy} className="w-16" />
                        </div>
                      </TableCell>
                      <TableCell>{model.speed}</TableCell>
                      <TableCell>{model.cost}</TableCell>
                      <TableCell>{getModelStatus(model.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={model.status !== 'active'}
                            onClick={() => setSelectedModel(model.id)}
                          >
                            {selectedModel === model.id ? 'Selezionato' : 'Seleziona'}
                          </Button>
                          {model.status === 'active' && (
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Classificazione AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium">Modello Attivo</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels
                      .filter(model => model.status === 'active')
                      .map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} - {model.accuracy}% accuratezza
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Soglie di Classificazione</h4>
                
                <div>
                  <label className="text-sm">Confidenza Minima (%)</label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    defaultValue="70"
                    className="w-full mt-1"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm">Auto-classificazione</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="checkbox"
                      checked={autoClassification}
                      onChange={(e) => setAutoClassification(e.target.checked)}
                    />
                    <span className="text-sm">Classifica automaticamente le nuove email</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Categorie Personalizzate</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">+ Aggiungi Categoria</Button>
                  <Button variant="outline" size="sm">+ Aggiungi Intento</Button>
                </div>
              </div>

              <Button className="w-full">
                Salva Configurazione
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Analytics Avanzate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Analytics in Sviluppo</h3>
                <p className="text-muted-foreground">
                  Le analytics dettagliate saranno disponibili nella prossima versione
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};