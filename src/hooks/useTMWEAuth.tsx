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
    const storedSupabaseId = sessionStorage.getItem('tmwe_supabase_user_id');
    
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
      console.log('🔄 Sincronizzazione TMWE → Supabase...');
      
      const { data, error } = await supabase.functions.invoke('tmwe-supabase-sync', {
        body: {
          tmweEmail: email,
          tmweProfile: profile
        }
      });

      if (error) {
        console.error('Errore sincronizzazione Supabase:', error);
        return null;
      }

      if (data?.supabaseUserId && data?.session) {
        console.log('✅ Sincronizzazione completata:', data.supabaseUserId);
        setSupabaseUserId(data.supabaseUserId);
        sessionStorage.setItem('tmwe_supabase_user_id', data.supabaseUserId);
        
        // Imposta la sessione Supabase Auth
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          console.error('Errore impostazione sessione:', sessionError);
        } else {
          console.log('✅ Sessione Supabase Auth impostata');
        }
        
        return data.supabaseUserId;
      }

      return null;
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      return null;
    }
  };

  const login = async (email: string, profile?: UserProfile) => {
    setUserEmail(email);
    if (profile) {
      setUserProfile(profile);
      sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
    }
    
    // Sincronizza con Supabase
    await syncWithSupabase(email, profile);
  };

  const logout = () => {
    setUserEmail(null);
    setUserProfile(null);
    setSupabaseUserId(null);
    sessionStorage.removeItem('tmwe_user_email');
    sessionStorage.removeItem('tmwe_access_token');
    sessionStorage.removeItem('tmwe_user_profile');
    sessionStorage.removeItem('tmwe_supabase_user_id');
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
