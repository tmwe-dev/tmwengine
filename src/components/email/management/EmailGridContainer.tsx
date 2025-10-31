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
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-wrap gap-4 pb-4">
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
