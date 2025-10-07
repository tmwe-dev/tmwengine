import { useState, useEffect } from 'react';

interface TypewriterState {
  [recordId: string]: {
    alias: string;
    company_alias: string;
  };
}

export const useTypewriterEffect = () => {
  const [animatingRecords, setAnimatingRecords] = useState<Set<string>>(new Set());
  const [partialTexts, setPartialTexts] = useState<TypewriterState>({});

  const animateText = (
    recordId: string,
    finalAlias: string,
    finalCompanyAlias: string,
    onComplete: (recordId: string, alias: string, company_alias: string) => void
  ) => {
    setAnimatingRecords(prev => new Set(prev).add(recordId));
    setPartialTexts(prev => ({
      ...prev,
      [recordId]: { alias: '', company_alias: '' }
    }));

    let aliasIndex = 0;
    let companyAliasIndex = 0;
    const speed = 30; // milliseconds per character

    const interval = setInterval(() => {
      let aliasComplete = false;
      let companyAliasComplete = false;

      setPartialTexts(prev => {
        const newState = { ...prev };
        
        // Update alias
        if (aliasIndex < finalAlias.length) {
          aliasIndex++;
          newState[recordId] = {
            ...newState[recordId],
            alias: finalAlias.slice(0, aliasIndex)
          };
        } else {
          aliasComplete = true;
        }

        // Update company_alias
        if (companyAliasIndex < finalCompanyAlias.length) {
          companyAliasIndex++;
          newState[recordId] = {
            ...newState[recordId],
            company_alias: finalCompanyAlias.slice(0, companyAliasIndex)
          };
        } else {
          companyAliasComplete = true;
        }

        return newState;
      });

      // When both are complete
      if (aliasComplete && companyAliasComplete) {
        clearInterval(interval);
        setAnimatingRecords(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });
        onComplete(recordId, finalAlias, finalCompanyAlias);
        
        // Clean up partial text after a delay
        setTimeout(() => {
          setPartialTexts(prev => {
            const newState = { ...prev };
            delete newState[recordId];
            return newState;
          });
        }, 100);
      }
    }, speed);
  };

  return {
    animatingRecords,
    partialTexts,
    animateText
  };
};
