import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRMSidebar } from '@/contexts/CRMLayoutContext';

interface SidebarPortalProps {
  children: ReactNode;
}

/**
 * Portal component that renders page-specific sidebar content
 * into the unified CRM sidebar container.
 * 
 * Usage: Wrap your sidebar content in <SidebarPortal> on any page.
 * The content will appear inside the CRM sidebar when it's expanded.
 */
export function SidebarPortal({ children }: SidebarPortalProps) {
  const { portalContainerRef, setHasPageSidebar } = useCRMSidebar();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    setHasPageSidebar(true);
    // Force re-render after mount to pick up the portal ref
    forceUpdate(n => n + 1);
    return () => {
      setHasPageSidebar(false);
    };
  }, [setHasPageSidebar]);

  if (!portalContainerRef.current) return null;
  return createPortal(children, portalContainerRef.current);
}
