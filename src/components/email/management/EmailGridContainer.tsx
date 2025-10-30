/**
 * Container Grid - Wrapper per visualizzazione griglia gruppi
 */

import { GroupDropZone } from './GroupDropZone';
import type { EmailSenderGroup } from '@/types/email-management';

interface EmailGridContainerProps {
  groups: EmailSenderGroup[];
  onRefresh: () => void;
}

export function EmailGridContainer({
  groups,
  onRefresh,
}: EmailGridContainerProps) {
  return (
    <div 
      className="fixed z-5 overflow-y-auto" 
      style={{ 
        left: '460px',
        top: '140px',
        right: '24px',
        bottom: '24px'
      }}
    >
      <div className="grid grid-cols-2 gap-4 pb-4">
        {groups.map(group => (
          <GroupDropZone
            key={group.id}
            group={group}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
