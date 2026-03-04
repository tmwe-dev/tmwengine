import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface CRMSidebarContextType {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  closeSidebar: () => void;
  // Portal system for page-specific sidebar content
  portalContainerRef: React.RefObject<HTMLDivElement | null>;
  hasPageSidebar: boolean;
  setHasPageSidebar: (v: boolean) => void;
  // Global AI sidebar state
  aiSidebarOpen: boolean;
  setAiSidebarOpen: (open: boolean) => void;
}

const CRMSidebarContext = createContext<CRMSidebarContextType | undefined>(undefined);

export const CRMSidebarProvider = ({ children }: { children: ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasPageSidebar, setHasPageSidebar] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  const closeSidebar = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <CRMSidebarContext.Provider value={{ 
      menuOpen, setMenuOpen, closeSidebar,
      portalContainerRef, hasPageSidebar, setHasPageSidebar,
      aiSidebarOpen, setAiSidebarOpen
    }}>
      {children}
    </CRMSidebarContext.Provider>
  );
};

export const useCRMSidebar = () => {
  const context = useContext(CRMSidebarContext);
  if (!context) throw new Error('useCRMSidebar must be used within CRMSidebarProvider');
  return context;
};

// Backward compatibility aliases
export const useCRMLayout = useCRMSidebar;
export const CRMLayoutProvider = CRMSidebarProvider;
