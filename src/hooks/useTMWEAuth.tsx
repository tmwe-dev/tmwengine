import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  email: string;
  name?: string;
  quota?: {
    used: number;
    total: number;
  };
  account_info?: any;
}

interface TMWEAuthContextType {
  userEmail: string | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  supabaseUserId: string | null;
  login: (email: string, profile?: UserProfile) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const TMWEAuthContext = createContext<TMWEAuthContextType | undefined>(undefined);

export function TMWEAuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const email = sessionStorage.getItem('tmwe_user_email');
    const token = sessionStorage.getItem('tmwe_access_token');
    const storedProfile = sessionStorage.getItem('tmwe_user_profile');
    const storedSupabaseId = sessionStorage.getItem('supabase_user_id');
    
    if (email && token) {
      setUserEmail(email);
      if (storedSupabaseId) {
        setSupabaseUserId(storedSupabaseId);
      }
      if (storedProfile) {
        try {
          setUserProfile(JSON.parse(storedProfile));
        } catch (e) {
          console.error('Error parsing stored profile:', e);
        }
      }
    }
    
    setIsLoading(false);
  }, []);

  const syncWithSupabase = async (email: string, profile?: UserProfile) => {
    try {
      console.log('🔄 Sincronizzazione TMWE → Supabase per email:', email);
      
      const { data, error } = await supabase.functions.invoke('tmwe-supabase-sync', {
        body: {
          tmweEmail: email,
          tmweProfile: profile
        }
      });

      console.log('📦 Risposta da tmwe-supabase-sync:', { data, error });

      if (error) {
        console.error('❌ Errore sincronizzazione Supabase:', error);
        return null;
      }

      if (data?.supabaseUserId && data?.magicLink) {
        console.log('✅ Sincronizzazione completata con user_id:', data.supabaseUserId);
        console.log('🔐 Estrazione token dal magic link...');
        
        // Estrai access_token e refresh_token dal magic link
        const url = new URL(data.magicLink);
        const accessToken = url.searchParams.get('access_token') || url.hash.split('access_token=')[1]?.split('&')[0];
        const refreshToken = url.searchParams.get('refresh_token') || url.hash.split('refresh_token=')[1]?.split('&')[0];

        if (!accessToken || !refreshToken) {
          console.error('❌ Token non trovati nel magic link');
          return null;
        }

        console.log('✅ Token estratti, creazione sessione...');
        
        // Crea la sessione con i token
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('❌ Errore creazione sessione:', sessionError);
          return null;
        }

        if (sessionData.session) {
          console.log('✅ Sessione Supabase creata con successo!');
          setSupabaseUserId(data.supabaseUserId);
          sessionStorage.setItem('supabase_user_id', data.supabaseUserId);
          console.log('💾 User ID salvato in sessionStorage:', data.supabaseUserId);
          return data.supabaseUserId;
        }
      } else {
        console.error('⚠️ Risposta senza supabaseUserId o magicLink:', data);
      }

      return null;
    } catch (error) {
      console.error('❌ Errore durante la sincronizzazione:', error);
      return null;
    }
  };

  const login = async (email: string, profile?: UserProfile) => {
    console.log('🔐 Login chiamato per:', email);
    setUserEmail(email);
    if (profile) {
      setUserProfile(profile);
      sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
    }
    
    // Sincronizza con Supabase
    const userId = await syncWithSupabase(email, profile);
    
    if (userId) {
      console.log('✅ Login completato con user_id:', userId);
    } else {
      console.error('⚠️ Sincronizzazione fallita, ma login TMWE OK');
    }
  };

  const logout = () => {
    setUserEmail(null);
    setUserProfile(null);
    setSupabaseUserId(null);
    sessionStorage.removeItem('tmwe_user_email');
    sessionStorage.removeItem('tmwe_access_token');
    sessionStorage.removeItem('tmwe_user_profile');
    sessionStorage.removeItem('supabase_user_id');
  };

  const refreshProfile = async () => {
    try {
      const { profileApi } = await import('@/lib/tmwe-api-integrated');
      const response = await profileApi.getMyProfile();
      if (response.success && response.data) {
        const profile: UserProfile = {
          email: response.data.email || userEmail || '',
          ...response.data
        };
        setUserProfile(profile);
        sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const value = {
    userEmail,
    userProfile,
    supabaseUserId,
    isAuthenticated: !!userEmail,
    isLoading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <TMWEAuthContext.Provider value={value}>
      {children}
    </TMWEAuthContext.Provider>
  );
}

export function useTMWEAuth() {
  const context = useContext(TMWEAuthContext);
  if (context === undefined) {
    throw new Error('useTMWEAuth must be used within a TMWEAuthProvider');
  }
  return context;
}
