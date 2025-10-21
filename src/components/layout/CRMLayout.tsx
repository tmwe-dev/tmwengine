import React from 'react';
import { PageDebuggerAudit } from '@/components/debug/PageDebuggerAudit';

interface CRMLayoutProps {
  children: React.ReactNode;
}

/**
 * CRMLayout - Layout principale per tutte le pagine CRM
 * Include automaticamente il componente PageDebuggerAudit (puntino giallo) in ogni pagina
 */
export default function CRMLayout({ children }: CRMLayoutProps) {
  return (
    <>
      {children}
      <PageDebuggerAudit />
    </>
  );
}
