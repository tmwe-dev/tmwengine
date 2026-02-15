import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RadioLayoutProps {
  sidebar: ReactNode;
  ghostIcons: ReactNode;
  mainContent: ReactNode;
  inputArea: ReactNode;
  debugPanel: ReactNode;
  bottomControls: ReactNode;
  aiSidebar: ReactNode;
}

export const RadioLayout = ({
  sidebar,
  ghostIcons,
  mainContent,
  inputArea,
  debugPanel,
  bottomControls,
  aiSidebar
}: RadioLayoutProps) => {
  return (
    <div className="relative h-full">
      {sidebar}
      {ghostIcons}
      {mainContent}
      {inputArea}
      {debugPanel}
      {bottomControls}
      {aiSidebar}
    </div>
  );
};
