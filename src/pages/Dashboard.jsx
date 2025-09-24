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
    <div className="section-spacing animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="card-spacing">
          <h1 className="text-emphasis">Dashboard CRM</h1>
          <p className="text-muted">
            Panoramica delle attività e performance del sistema
          </p>
        </div>
        <div className="text-sm text-muted">
          Ultimo aggiornamento: {crmUtils.formatDateTime(new Date())}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
        {/* Attività */}
        <Card className="hover:shadow-glow transition-all duration-normal border-card-border">
          <CardHeader className="flex flex-row items-center justify-between element-spacing pb-md">
            <CardTitle className="text-sm font-medium">Attività Aperte</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emphasis">{dashboardData.attivita.aperte}</div>
            <p className="text-xs text-muted">
              {dashboardData.attivita.inScadenza} in scadenza oggi
            </p>
          </CardContent>
        </Card>

        {/* Rubrica */}
        <Card className="hover:shadow-glow transition-all duration-normal border-card-border">
          <CardHeader className="flex flex-row items-center justify-between element-spacing pb-md">
            <CardTitle className="text-sm font-medium">Contatti Totali</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emphasis">{dashboardData.rubrica.totale}</div>
            <p className="text-xs text-muted">
              +{dashboardData.rubrica.nuoviUltimaSett} ultima settimana
            </p>
          </CardContent>
        </Card>

        {/* Email Inviate */}
        <Card className="hover:shadow-glow transition-all duration-normal border-card-border">
          <CardHeader className="flex flex-row items-center justify-between element-spacing pb-md">
            <CardTitle className="text-sm font-medium">Email Inviate Oggi</CardTitle>
            <Send className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emphasis">{dashboardData.email.inviateOggi}</div>
            <p className="text-xs text-muted">
              di {dashboardData.campagne.maxEmailGiorno} limite giornaliero
            </p>
          </CardContent>
        </Card>

        {/* Email Ricevute */}
        <Card className="hover:shadow-glow transition-all duration-normal border-card-border">
          <CardHeader className="flex flex-row items-center justify-between element-spacing pb-md">
            <CardTitle className="text-sm font-medium">Email Ricevute Oggi</CardTitle>
            <Inbox className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emphasis">{dashboardData.email.ricevuteOggi}</div>
            <p className="text-xs text-muted">
              Email inbound automatiche
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sezione Attività e Campagne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Attività in Scadenza */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-md">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="font-semibold">Attività in Scadenza</span>
            </CardTitle>
            <CardDescription className="text-muted">
              Attività che scadono oggi o domani
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="card-spacing">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aperte</span>
                <Badge variant="destructive">{dashboardData.attivita.aperte}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">In Corso</span>
                <Badge variant="secondary">{dashboardData.attivita.inCorso}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completate</span>
                <Badge className="bg-success text-success-foreground">{dashboardData.attivita.completate}</Badge>
              </div>
              <Button variant="outline" className="w-full mt-md hover:bg-primary-muted transition-colors duration-fast">
                <Calendar className="h-4 w-4 mr-2" />
                Vedi Tutte le Attività
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campagne Attive */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-md">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Campagne Attive</span>
            </CardTitle>
            <CardDescription className="text-muted">
              Monitoraggio invii email giornalieri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="card-spacing">
              <div>
                <div className="flex items-center justify-between text-sm font-medium mb-2">
                  <span>Invii Oggi</span>
                  <span className="text-emphasis">{dashboardData.campagne.inviateDaOggi} / {dashboardData.campagne.maxEmailGiorno}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Campagne Attive</span>
                <Badge variant={dashboardData.campagne.attive > 0 ? "default" : "secondary"}>
                  {dashboardData.campagne.attive}
                </Badge>
              </div>

              <Button variant="outline" className="w-full mt-md hover:bg-primary-muted transition-colors duration-fast">
                <Send className="h-4 w-4 mr-2" />
                Gestisci Campagne
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sezione Classificazione AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Cestini AI */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-md">
              <Mail className="h-5 w-5 text-success" />
              <span className="font-semibold">Cestini AI - Email Classificate</span>
            </CardTitle>
            <CardDescription className="text-muted">
              Email ricevute organizzate per categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="item-spacing">
              {Object.entries(dashboardData.email.bucketAI).map(([bucket, count]) => (
                <div key={bucket} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{bucket}</span>
                  <Badge variant="outline">{count} email</Badge>
                </div>
              ))}
              {Object.keys(dashboardData.email.bucketAI).length === 0 && (
                <p className="text-sm text-muted text-center py-lg">
                  Nessuna email classificata oggi
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gruppi AI */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-md">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold">Gruppi AI - Cluster Email</span>
            </CardTitle>
            <CardDescription className="text-muted">
              Email raggruppate per argomento simile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="item-spacing">
              {Object.entries(dashboardData.email.gruppiAI).map(([gruppo, count]) => (
                <div key={gruppo} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{gruppo}</span>
                  <Badge variant="outline">{count} email</Badge>
                </div>
              ))}
              {Object.keys(dashboardData.email.gruppiAI).length === 0 && (
                <p className="text-sm text-muted text-center py-lg">
                  Nessun cluster identificato oggi
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="font-semibold">Azioni Rapide</CardTitle>
          <CardDescription className="text-muted">
            Operazioni frequenti per gestione CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            <Button variant="outline" className="h-20 flex-col gap-sm hover:bg-primary-muted hover:scale-105 transition-all duration-fast">
              <Users className="h-6 w-6 text-success" />
              <span className="font-medium">Nuovo Contatto</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-sm hover:bg-primary-muted hover:scale-105 transition-all duration-fast">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="font-medium">Nuova Attività</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-sm hover:bg-primary-muted hover:scale-105 transition-all duration-fast">
              <Send className="h-6 w-6 text-warning" />
              <span className="font-medium">Invia Email</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-sm hover:bg-primary-muted hover:scale-105 transition-all duration-fast">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="font-medium">Nuova Campagna</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;