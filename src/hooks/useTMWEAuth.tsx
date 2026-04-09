import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  email: string;
  name?: string;
  username?: string;
  enterprise_name?: string;
  telephone?: string;
  rubrica?: {
    address?: string;
    city?: string;
    prov?: string;
    country?: string;
    airport?: string;
    cap?: string;
    address_name?: string;
    telephone?: string;
    email?: string;
  };
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
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const TMWEAuthContext = createContext<TMWEAuthContextType | undefined>(undefined);

export function TMWEAuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Supabase auth state changed:', event);
      
      if (session?.user) {
        // User is logged in via Supabase
        const email = session.user.email;
        if (email) {
          setUserEmail(email);
          sessionStorage.setItem('tmwe_user_email', email);
          setSupabaseUserId(session.user.id);
          sessionStorage.setItem('tmwe_supabase_user_id', session.user.id);
          
          // Defer profile fetch to avoid blocking
          setTimeout(() => {
            supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle()
              .then(({ data: profileData }) => {
                if (profileData) {
                  const profile: UserProfile = {
                    email: profileData.tmwe_email || email,
                    name: profileData.display_name || '',
                  };
                  setUserProfile(profile);
                  sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
                }
              });
          }, 0);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setUserEmail(null);
        setUserProfile(null);
        setSupabaseUserId(null);
        sessionStorage.removeItem('tmwe_user_email');
        sessionStorage.removeItem('tmwe_access_token');
        sessionStorage.removeItem('tmwe_user_profile');
        sessionStorage.removeItem('tmwe_supabase_user_id');
      } else if (event === 'TOKEN_REFRESHED') {
        // 🔥 TTL SYNC: Verify TMWE token is still valid when Supabase refreshes
        console.log('🔄 Supabase token refreshed, verifying TMWE token validity...');
        
        setTimeout(async () => {
          const email = session?.user?.email;
          if (!email) return;
          
          try {
            const { data } = await supabase
              .from('user_tmwe_credentials')
              .select('expires_at')
              .eq('email', email)
              .maybeSingle();
            
            if (data && data.expires_at) {
              const expiresAt = new Date(data.expires_at);
              const now = new Date();
              
              if (expiresAt < now) {
                console.error('❌ TMWE token expired detected during Supabase refresh');
                console.error('   This should not happen with TTL sync enabled');
                // Force re-authentication
                await supabase.auth.signOut();
                sessionStorage.clear();
                window.location.href = '/auth';
              } else {
                const hoursLeft = (expiresAt.getTime() - now.getTime()) / 3600000;
                console.log('✅ TMWE token still valid:', Math.round(hoursLeft * 10) / 10, 'hours remaining');
              }
            }
          } catch (err) {
            console.error('❌ Error checking TMWE token during refresh:', err);
          }
        }, 0);
      }
    });

    // Check for existing session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const email = session.user.email;
        if (email) {
          setUserEmail(email);
          sessionStorage.setItem('tmwe_user_email', email);
          setSupabaseUserId(session.user.id);
          sessionStorage.setItem('tmwe_supabase_user_id', session.user.id);
        }
      } else {
        // Fallback to sessionStorage if no Supabase session
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
      }
      
      setIsLoading(false);
    };
    
    checkSession();
    
    return () => subscription.unsubscribe();
  }, []);

  const syncWithSupabase = async (email: string, profile?: UserProfile) => {
    try {
      console.log('🔄 Sincronizzazione TMWE → Supabase (via tmwe-api-proxy)...');
      
      // CONSOLIDATED: Now uses tmwe-api-proxy with internal_supabase_sync handler
      const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/app.php',
          data: {
            handler: 'internal_supabase_sync',
            tmweEmail: email,
            tmweProfile: profile
          }
        }
      });

      if (error) {
        console.error('Errore sincronizzazione Supabase:', error);
        return null;
      }

      if (data?.supabaseUserId) {
        console.log('✅ Sincronizzazione completata:', data.supabaseUserId);
        setSupabaseUserId(data.supabaseUserId);
        sessionStorage.setItem('tmwe_supabase_user_id', data.supabaseUserId);
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
    sessionStorage.setItem('tmwe_user_email', email); // CRÍTICO: Guardar en sessionStorage
    
    if (profile) {
      setUserProfile(profile);
      sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
    }
    
    // Sincronizza con Supabase
    await syncWithSupabase(email, profile);
  };

  const logout = async () => {
    console.log('🚪 Iniciando logout completo...');
    
    // 1. Cerrar sesión de Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Error al cerrar sesión de Supabase:', error);
    } else {
      console.log('✅ Sesión de Supabase cerrada correctamente');
    }
    
    // 2. Limpiar estado local
    setUserEmail(null);
    setUserProfile(null);
    setSupabaseUserId(null);
    
    // 3. Limpiar sessionStorage
    sessionStorage.removeItem('tmwe_user_email');
    sessionStorage.removeItem('tmwe_access_token');
    sessionStorage.removeItem('tmwe_user_profile');
    sessionStorage.removeItem('tmwe_supabase_user_id');
    
    // 4. Limpiar cualquier estado de OAuth
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_client_id');
    sessionStorage.removeItem('oauth_client_secret');
    sessionStorage.removeItem('oauth_redirect_uri');
    
    console.log('✅ Logout completado');
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
