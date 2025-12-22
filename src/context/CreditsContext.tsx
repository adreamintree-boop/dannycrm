import React, { createContext, useContext, ReactNode } from 'react';
import { useCredits } from '@/hooks/useCredits';

interface CreditsContextType {
  balance: number;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  chargeBLSearchPage: (
    searchKey: string,
    rowFingerprints: string[],
    pageNumber: number,
    searchMeta: Record<string, unknown>
  ) => Promise<{ success: boolean; newBalance?: number; chargedCount?: number; error?: string }>;
  deductStrategyCredits: (strategyMeta: Record<string, unknown>) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
  // Legacy method
  deductBLSearchCredits: (resultCount: number, searchMeta: Record<string, unknown>) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const credits = useCredits();

  return (
    <CreditsContext.Provider value={credits}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCreditsContext() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCreditsContext must be used within a CreditsProvider');
  }
  return context;
}
