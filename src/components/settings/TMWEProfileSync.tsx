import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface TMWEProfile {
  username: string;
  name: string;
  email: string;
  telephone: string;
  enterprise_name: string;
  rubrica: {
    address: string;
    city: string;
    prov: string;
    country: string;
    airport: string;
    cap: string;
    address_name: string;
    telephone: string;
    email: string;
  };
}

interface LocalProfile {
  nomeUtente: string;
  cognomeUtente: string;
  emailUtente: string;
  telefonoUtente: string;
}

interface ProfileDifference {
  field: string;
  label: string;
  currentValue: string;
  apiValue: string;
  icon: any;
}

export const TMWEProfileSync = () => {
  const { toast } = useToast();
  const { userEmail, refreshProfile } = useTMWEAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tmweProfile, setTmweProfile] = useState<TMWEProfile | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);
  const [differences, setDifferences] = useState<ProfileDifference[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      // Cargar perfil local de config_generale
      const { data: configData } = await supabase
        .from('config_generale')
        .select('*')
        .maybeSingle();

      if (configData) {
        setLocalProfile({
          nomeUtente: configData.nome_utente || '',
          cognomeUtente: configData.cognome_utente || '',
          emailUtente: configData.email_utente || '',
          telefonoUtente: configData.telefono_utente || ''
        });
      }

      // Cargar perfil del API TMWE
      await fetchTMWEProfile();

    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los perfiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTMWEProfile = async () => {
    try {
      const accessToken = sessionStorage.getItem('tmwe_access_token');
      
      if (!accessToken) {
        toast({
          title: "No autenticado",
          description: "Debes iniciar sesión primero",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('https://findair.it/erp/tmwe_json/get_my_profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handler: 'get_my_profile'
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const profileData = await response.json();
      setTmweProfile(profileData);
      setLastSync(new Date());

      // Comparar perfiles
      compareProfiles(profileData);

      toast({
        title: "✅ Perfil sincronizado",
        description: "Datos obtenidos del API TMWE",
      });

    } catch (error: any) {
      console.error('Error fetching TMWE profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo obtener el perfil del API",
        variant: "destructive",
      });
    }
  };

  const compareProfiles = (apiProfile: TMWEProfile) => {
    if (!localProfile) return;

    const diffs: ProfileDifference[] = [];

    // Comparar nombre
    if (apiProfile.name && apiProfile.name !== localProfile.nomeUtente) {
      diffs.push({
        field: 'name',
        label: 'Nombre',
        currentValue: localProfile.nomeUtente,
        apiValue: apiProfile.name,
        icon: User
      });
    }

    // Comparar email
    if (apiProfile.email && apiProfile.email !== localProfile.emailUtente) {
      diffs.push({
        field: 'email',
        label: 'Email',
        currentValue: localProfile.emailUtente,
        apiValue: apiProfile.email,
        icon: Mail
      });
    }

    // Comparar teléfono
    const apiPhone = apiProfile.telephone || apiProfile.rubrica?.telephone || '';
    if (apiPhone && apiPhone !== localProfile.telefonoUtente) {
      diffs.push({
        field: 'telephone',
        label: 'Teléfono',
        currentValue: localProfile.telefonoUtente,
        apiValue: apiPhone,
        icon: Phone
      });
    }

    setDifferences(diffs);
  };

  const syncWithAPI = async () => {
    if (!tmweProfile) {
      toast({
        title: "Error",
        description: "No hay datos del API para sincronizar",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data: configData } = await supabase
        .from('config_generale')
        .select('id')
        .maybeSingle();

      const updateData = {
        nome_utente: tmweProfile.name || '',
        email_utente: tmweProfile.email || '',
        telefono_utente: tmweProfile.telephone || tmweProfile.rubrica?.telephone || '',
      };

      if (configData?.id) {
        // Actualizar
        const { error } = await supabase
          .from('config_generale')
          .update(updateData)
          .eq('id', configData.id);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('config_generale')
          .insert(updateData);

        if (error) throw error;
      }

      toast({
        title: "✅ Sincronización exitosa",
        description: "Los datos del perfil se han actualizado correctamente",
      });

      // Recargar perfiles
      await loadProfiles();

    } catch (error: any) {
      console.error('Error syncing profiles:', error);
      toast({
        title: "Error",
        description: "No se pudo sincronizar el perfil",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón de refresh */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Sincronización de Perfil TMWE
              </CardTitle>
              <CardDescription>
                Compara y sincroniza tu perfil local con los datos del API TMWE
              </CardDescription>
            </div>
            <Button 
              onClick={fetchTMWEProfile}
              disabled={loading || !userEmail}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        
        {lastSync && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Última sincronización: {lastSync.toLocaleString('es-ES')}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Estado de sincronización */}
      {differences.length === 0 && tmweProfile && localProfile && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            ✅ Tu perfil local está sincronizado con el API TMWE
          </AlertDescription>
        </Alert>
      )}

      {/* Diferencias encontradas */}
      {differences.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Diferencias Encontradas ({differences.length})
            </CardTitle>
            <CardDescription>
              Los siguientes campos tienen valores diferentes entre tu perfil local y el API TMWE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {differences.map((diff, index) => {
              const Icon = diff.icon;
              return (
                <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-sm font-medium">{diff.label}</p>
                      <Badge variant="outline" className="mt-1">Campo</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Valor actual:</p>
                        <p className="text-sm font-mono bg-background px-2 py-1 rounded">
                          {diff.currentValue || <span className="text-muted-foreground italic">vacío</span>}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Valor del API:</p>
                        <p className="text-sm font-mono bg-primary/10 px-2 py-1 rounded font-semibold">
                          {diff.apiValue}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={syncWithAPI}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Actualizar con Datos del API
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del perfil TMWE */}
      {tmweProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Perfil TMWE</CardTitle>
            <CardDescription>Datos obtenidos del endpoint /get_my_profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Usuario / Nombre</p>
                  <p className="text-sm text-muted-foreground">{tmweProfile.username}</p>
                  <p className="text-sm text-muted-foreground font-semibold">{tmweProfile.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Empresa</p>
                  <p className="text-sm text-muted-foreground">{tmweProfile.enterprise_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{tmweProfile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">
                    {tmweProfile.telephone || tmweProfile.rubrica?.telephone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {tmweProfile.rubrica && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Dirección (Rubrica)</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      {tmweProfile.rubrica.address_name && (
                        <p className="text-sm font-semibold">{tmweProfile.rubrica.address_name}</p>
                      )}
                      {tmweProfile.rubrica.address && (
                        <p className="text-sm text-muted-foreground">{tmweProfile.rubrica.address}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {tmweProfile.rubrica.cap} {tmweProfile.rubrica.city} ({tmweProfile.rubrica.prov})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tmweProfile.rubrica.country} - Airport: {tmweProfile.rubrica.airport}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};