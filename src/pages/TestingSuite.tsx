import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, MessageSquare, Sparkles, Video, Zap, Download, BarChart3 } from 'lucide-react';
import { DatabaseRelationsTester } from './DatabaseRelationsTester';
import { IntranetTester } from './IntranetTester';
import { LaboratoryTester } from './LaboratoryTester';
import { VoiceVideoTester } from './VoiceVideoTester';
import TMWEApiTester from './TMWEApiTester';

const TestingSuite = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const modules = [
    {
      id: 'database',
      name: 'Database Relations',
      icon: Database,
      description: 'Test performance relazioni tra tabelle',
      color: 'text-blue-500'
    },
    {
      id: 'intranet',
      name: 'Intranet',
      icon: MessageSquare,
      description: 'Test chat, presenza, chiamate',
      color: 'text-green-500'
    },
    {
      id: 'laboratory',
      name: 'Laboratory',
      icon: Sparkles,
      description: 'Test AI, microfono, orchestratore',
      color: 'text-purple-500'
    },
    {
      id: 'voice-video',
      name: 'Voice & Video',
      icon: Video,
      description: 'Test comunicazione audio/video',
      color: 'text-orange-500'
    },
    {
      id: 'tmwe-api',
      name: 'TMWE API',
      icon: Zap,
      description: 'Test API email e benchmark',
      color: 'text-yellow-500'
    }
  ];
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Testing Suite Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistema completo di testing performance multi-modulo
            </p>
          </div>
        </div>
        
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="intranet">
              <MessageSquare className="h-4 w-4 mr-2" />
              Intranet
            </TabsTrigger>
            <TabsTrigger value="laboratory">
              <Sparkles className="h-4 w-4 mr-2" />
              Laboratory
            </TabsTrigger>
            <TabsTrigger value="voice-video">
              <Video className="h-4 w-4 mr-2" />
              Voice/Video
            </TabsTrigger>
            <TabsTrigger value="tmwe-api">
              <Zap className="h-4 w-4 mr-2" />
              TMWE API
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Moduli di Testing Disponibili</CardTitle>
                <CardDescription>
                  Seleziona un modulo per iniziare i test di performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <Card 
                        key={module.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setActiveTab(module.id)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${module.color}`} />
                            {module.name}
                          </CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Apri Test Suite
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Moduli Disponibili
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{modules.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suite di testing complete
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Test Disponibili
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">50+</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Test automatici configurati
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">100%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Moduli principali coperti
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Funzionalità Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">✅</Badge>
                  <div>
                    <div className="font-medium">Test Automatici</div>
                    <div className="text-sm text-muted-foreground">
                      Esecuzione automatica di test suite complete con report dettagliati
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">📊</Badge>
                  <div>
                    <div className="font-medium">Analisi Performance</div>
                    <div className="text-sm text-muted-foreground">
                      Confronto tempi effettivi vs attesi con visualizzazione grafica
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">🎯</Badge>
                  <div>
                    <div className="font-medium">Raccomandazioni Automatiche</div>
                    <div className="text-sm text-muted-foreground">
                      Suggerimenti ottimizzazione basati sui risultati dei test
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">📥</Badge>
                  <div>
                    <div className="font-medium">Export Report</div>
                    <div className="text-sm text-muted-foreground">
                      Esportazione risultati in JSON per analisi successive
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Module Tabs */}
          <TabsContent value="database">
            <DatabaseRelationsTester />
          </TabsContent>
          
          <TabsContent value="intranet">
            <IntranetTester />
          </TabsContent>
          
          <TabsContent value="laboratory">
            <LaboratoryTester />
          </TabsContent>
          
          <TabsContent value="voice-video">
            <VoiceVideoTester />
          </TabsContent>
          
          <TabsContent value="tmwe-api">
            <TMWEApiTester />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestingSuite;
