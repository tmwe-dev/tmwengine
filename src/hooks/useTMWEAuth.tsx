import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface TMWEAuthContextType {
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => void;
  logout: () => void;
}

const TMWEAuthContext = createContext<TMWEAuthContextType | undefined>(undefined);

export function TMWEAuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const email = sessionStorage.getItem('tmwe_user_email');
    const token = sessionStorage.getItem('tmwe_access_token');
    
    if (email && token) {
      setUserEmail(email);
    }
    
    setIsLoading(false);
  }, []);

  const login = (email: string) => {
    setUserEmail(email);
  };

  const logout = () => {
    setUserEmail(null);
    sessionStorage.removeItem('tmwe_user_email');
    sessionStorage.removeItem('tmwe_access_token');
  };

  const value = {
    userEmail,
    isAuthenticated: !!userEmail,
    isLoading,
    login,
    logout,
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
