import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRMSidebar } from '@/contexts/CRMLayoutContext';

interface SidebarFooterPortalProps {
  children: ReactNode;
}

/**
 * Portal component that renders page-specific footer actions
 * into the CRM sidebar footer area.
 * 
 * Usage: Wrap quick-action icons in <SidebarFooterPortal> on any page.
 * Content appears above the AI trigger in the sidebar footer.
 */
export function SidebarFooterPortal({ children }: SidebarFooterPortalProps) {
  const { footerPortalRef, setHasFooterContent } = useCRMSidebar();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    setHasFooterContent(true);
    forceUpdate(n => n + 1);
    return () => {
      setHasFooterContent(false);
    };
  }, [setHasFooterContent]);

  if (!footerPortalRef.current) return null;
  return createPortal(children, footerPortalRef.current);
}
