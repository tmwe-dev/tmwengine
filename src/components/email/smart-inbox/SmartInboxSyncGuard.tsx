/**
 * ✅ REFACTORED: No longer needs sync guard
 * API is always up-to-date, so we just render children directly
 */
import { ReactNode } from 'react';

interface SmartInboxSyncGuardProps {
  userEmail: string;
  selectedFolder: string;
  unreadOnly: boolean;
  children: ReactNode;
}

export const SmartInboxSyncGuard = ({ children }: SmartInboxSyncGuardProps) => {
  // ✅ No sync check needed - email_search API is always the source of truth
  // Simply render children immediately
  return <>{children}</>;
};
