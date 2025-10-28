import { createContext, useContext, useState, ReactNode } from 'react';

interface RadioAudioPlayerContextType {
  isPlayerExpanded: boolean;
  setIsPlayerExpanded: (expanded: boolean) => void;
}

const RadioAudioPlayerContext = createContext<RadioAudioPlayerContextType | undefined>(undefined);

export const RadioAudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  return (
    <RadioAudioPlayerContext.Provider value={{ isPlayerExpanded, setIsPlayerExpanded }}>
      {children}
    </RadioAudioPlayerContext.Provider>
  );
};

export const useRadioAudioPlayer = () => {
  const context = useContext(RadioAudioPlayerContext);
  if (!context) {
    throw new Error('useRadioAudioPlayer must be used within RadioAudioPlayerProvider');
  }
  return context;
};
