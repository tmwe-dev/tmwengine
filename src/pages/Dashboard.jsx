import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Calendar, 
  Mail, 
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  Inbox,
  BarChart3
} from 'lucide-react';
import { crmUtils } from '@/lib/crm/events';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    attivita: {
      aperte: 0,
      inCorso: 0,
      completate: 0,
      inScadenza: 0
    },
    rubrica: {
      totale: 0,
      nuoviUltimaSett: 0
    },
    email: {
      inviateOggi: 0,
      ricevuteOggi: 0,
      bucketAI: {},
      gruppiAI: {}
    },
    campagne: {
      attive: 0,
      inviateDaOggi: 0,
      maxEmailGiorno: 0
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Qui andrebbero le chiamate API reali per caricare i dati
        // Per ora lasciamo gli stati vuoti senza mock data
        setDashboardData({
          attivita: {
            aperte: 0,
            inCorso: 0,
            completate: 0,
            inScadenza: 0
          },
          rubrica: {
            totale: 0,
            nuoviUltimaSett: 0
          },
          email: {
            inviateOggi: 0,
            ricevuteOggi: 0,
            bucketAI: {},
            gruppiAI: {}
          },
          campagne: {
            attive: 0,
            inviateDaOggi: 0,
            maxEmailGiorno: 0
          }
        });
      } catch (error) {
        console.error('Errore caricamento dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const progressPercentage = dashboardData.campagne.maxEmailGiorno > 0 
    ? (dashboardData.campagne.inviateDaOggi / dashboardData.campagne.maxEmailGiorno) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard CRM</h1>
          <p className="text-muted-foreground">
            Panoramica delle attività e performance del sistema
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Ultimo aggiornamento: {crmUtils.formatDateTime(new Date())}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attività */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attività Aperte</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.attivita.aperte}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.attivita.inScadenza} in scadenza oggi
            </p>
          </CardContent>
        </Card>

        {/* Rubrica */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.rubrica.totale}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.rubrica.nuoviUltimaSett} ultima settimana
            </p>
          </CardContent>
        </Card>

        {/* Email Inviate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Inviate Oggi</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.email.inviateOggi}</div>
            <p className="text-xs text-muted-foreground">
              di {dashboardData.campagne.maxEmailGiorno} limite giornaliero
            </p>
          </CardContent>
        </Card>

        {/* Email Ricevute */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Ricevute Oggi</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.email.ricevuteOggi}</div>
            <p className="text-xs text-muted-foreground">
              Email inbound automatiche
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sezione Attività e Campagne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attività in Scadenza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Attività in Scadenza
            </CardTitle>
            <CardDescription>
              Attività che scadono oggi o domani
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Aperte</span>
                <Badge variant="destructive">{dashboardData.attivita.aperte}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">In Corso</span>
                <Badge variant="secondary">{dashboardData.attivita.inCorso}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completate</span>
                <Badge variant="default">{dashboardData.attivita.completate}</Badge>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Calendar className="h-4 w-4 mr-2" />
                Vedi Tutte le Attività
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campagne Attive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Campagne Attive
            </CardTitle>
            <CardDescription>
              Monitoraggio invii email giornalieri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Invii Oggi</span>
                  <span>{dashboardData.campagne.inviateDaOggi} / {dashboardData.campagne.maxEmailGiorno}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Campagne Attive</span>
                <Badge variant={dashboardData.campagne.attive > 0 ? "default" : "secondary"}>
                  {dashboardData.campagne.attive}
                </Badge>
              </div>

              <Button variant="outline" className="w-full mt-4">
                <Send className="h-4 w-4 mr-2" />
                Gestisci Campagne
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sezione Classificazione AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cestini AI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-500" />
              Cestini AI - Email Classificate
            </CardTitle>
            <CardDescription>
              Email ricevute organizzate per categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboardData.email.bucketAI).map(([bucket, count]) => (
                <div key={bucket} className="flex items-center justify-between">
                  <span className="text-sm">{bucket}</span>
                  <Badge variant="outline">{count} email</Badge>
                </div>
              ))}
              {Object.keys(dashboardData.email.bucketAI).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna email classificata oggi
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gruppi AI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Gruppi AI - Cluster Email
            </CardTitle>
            <CardDescription>
              Email raggruppate per argomento simile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboardData.email.gruppiAI).map(([gruppo, count]) => (
                <div key={gruppo} className="flex items-center justify-between">
                  <span className="text-sm">{gruppo}</span>
                  <Badge variant="outline">{count} email</Badge>
                </div>
              ))}
              {Object.keys(dashboardData.email.gruppiAI).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun cluster identificato oggi
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Operazioni frequenti per gestione CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              Nuovo Contatto
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              Nuova Attività
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Send className="h-6 w-6 mb-2" />
              Invia Email
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              Nuova Campagna
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;