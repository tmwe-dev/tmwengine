/**
 * Container Grid - Wrapper per visualizzazione griglia gruppi
 */

import { GroupDropZone } from './GroupDropZone';
import type { EmailSenderGroup } from '@/types/email-management';

interface EmailGridContainerProps {
  groups: EmailSenderGroup[];
  onRefresh: () => void;
  selectedGroupId?: string | null;
}

export function EmailGridContainer({
  groups,
  onRefresh,
  selectedGroupId = 'all',
}: EmailGridContainerProps) {
  
  // Visualizzazione singola card espansa
  if (selectedGroupId && selectedGroupId !== 'all') {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return null;
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        style={{ marginTop: '140px' }}
      >
        <GroupDropZone
          group={selectedGroup}
          onRefresh={onRefresh}
          isExpanded={true}
        />
      </div>
    );
  }

  // Visualizzazione completa: priorità + altre
  const PRIORITY_NAMES = ['Spam', 'Promo', 'Offerte', 'Social Network'];
  const priorityGroups = groups.filter(g => PRIORITY_NAMES.includes(g.nome_gruppo));
  const otherGroups = groups.filter(g => !PRIORITY_NAMES.includes(g.nome_gruppo));

  return (
    <div 
      className="h-full w-full overflow-y-auto"
      style={{ 
        paddingLeft: '460px',
        paddingTop: '20px',
        paddingRight: '24px',
        paddingBottom: '24px'
      }}
    >
      {/* Cards prioritarie - Grid fisso 3 colonne */}
      {priorityGroups.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {priorityGroups.map(group => (
            <GroupDropZone
              key={group.id}
              group={group}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
      
      {/* Altre cards - Grid 3 o 4 colonne */}
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
        {otherGroups.map(group => (
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
