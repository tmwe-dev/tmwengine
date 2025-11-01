import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CRMLayoutContextType {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const CRMLayoutContext = createContext<CRMLayoutContextType | undefined>(undefined);

export const CRMLayoutProvider = ({ children }: { children: ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <CRMLayoutContext.Provider value={{ menuOpen, setMenuOpen }}>
      {children}
    </CRMLayoutContext.Provider>
  );
};

export const useCRMLayout = () => {
  const context = useContext(CRMLayoutContext);
  if (!context) {
    throw new Error('useCRMLayout deve essere usato dentro CRMLayoutProvider');
  }
  return context;
};
