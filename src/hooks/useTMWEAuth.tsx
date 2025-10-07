import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

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
  login: (email: string, profile?: UserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const TMWEAuthContext = createContext<TMWEAuthContextType | undefined>(undefined);

export function TMWEAuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const email = sessionStorage.getItem('tmwe_user_email');
    const token = sessionStorage.getItem('tmwe_access_token');
    const storedProfile = sessionStorage.getItem('tmwe_user_profile');
    
    if (email && token) {
      setUserEmail(email);
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

  const login = (email: string, profile?: UserProfile) => {
    setUserEmail(email);
    if (profile) {
      setUserProfile(profile);
      sessionStorage.setItem('tmwe_user_profile', JSON.stringify(profile));
    }
  };

  const logout = () => {
    setUserEmail(null);
    setUserProfile(null);
    sessionStorage.removeItem('tmwe_user_email');
    sessionStorage.removeItem('tmwe_access_token');
    sessionStorage.removeItem('tmwe_user_profile');
  };

  const refreshProfile = async () => {
    try {
      const { profileApi } = await import('@/lib/tmwe-api-integrated');
      const response = await profileApi.getMyProfile();
      if (response.success && response.data) {
        const profile: UserProfile = {
          email: userEmail || '',
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
