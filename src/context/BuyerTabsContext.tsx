import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BuyerStatus } from '@/data/mockData';

export interface OpenBuyerTab {
  buyerId: string;
  companyName: string;
  stage: BuyerStatus;
  lastActiveAt: number;
}

interface BuyerTabsContextType {
  openTabs: OpenBuyerTab[];
  activeBuyerId: string | null;
  openBuyerTab: (buyerId: string, companyName: string, stage: BuyerStatus) => void;
  closeBuyerTab: (buyerId: string) => string | null; // Returns new active buyerId or null
  setActiveBuyerId: (buyerId: string) => void;
  hasTab: (buyerId: string) => boolean;
}

const BuyerTabsContext = createContext<BuyerTabsContextType | undefined>(undefined);

export const BuyerTabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openTabs, setOpenTabs] = useState<OpenBuyerTab[]>([]);
  const [activeBuyerId, setActiveBuyerIdState] = useState<string | null>(null);

  const hasTab = useCallback((buyerId: string): boolean => {
    return openTabs.some(t => t.buyerId === buyerId);
  }, [openTabs]);

  const openBuyerTab = useCallback((buyerId: string, companyName: string, stage: BuyerStatus) => {
    setOpenTabs(prev => {
      // Check if tab already exists
      const existingIndex = prev.findIndex(t => t.buyerId === buyerId);
      
      if (existingIndex >= 0) {
        // Update lastActiveAt for existing tab
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], lastActiveAt: Date.now() };
        return updated;
      }
      
      // Add new tab
      return [...prev, {
        buyerId,
        companyName,
        stage,
        lastActiveAt: Date.now()
      }];
    });
    
    setActiveBuyerIdState(buyerId);
  }, []);

  const closeBuyerTab = useCallback((buyerId: string): string | null => {
    let newActiveId: string | null = null;
    
    setOpenTabs(prev => {
      const closedIndex = prev.findIndex(t => t.buyerId === buyerId);
      if (closedIndex === -1) return prev;
      
      const newTabs = prev.filter(t => t.buyerId !== buyerId);
      
      // If closing active tab, determine new active
      if (buyerId === activeBuyerId && newTabs.length > 0) {
        // Prefer left neighbor, then right
        const newActiveIndex = Math.max(0, Math.min(closedIndex, newTabs.length - 1));
        newActiveId = newTabs[newActiveIndex].buyerId;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      } else {
        newActiveId = activeBuyerId;
      }
      
      return newTabs;
    });
    
    if (newActiveId !== activeBuyerId) {
      setActiveBuyerIdState(newActiveId);
    }
    
    return newActiveId;
  }, [activeBuyerId]);

  const setActiveBuyerId = useCallback((buyerId: string) => {
    setOpenTabs(prev => {
      const index = prev.findIndex(t => t.buyerId === buyerId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], lastActiveAt: Date.now() };
        return updated;
      }
      return prev;
    });
    setActiveBuyerIdState(buyerId);
  }, []);

  return (
    <BuyerTabsContext.Provider value={{
      openTabs,
      activeBuyerId,
      openBuyerTab,
      closeBuyerTab,
      setActiveBuyerId,
      hasTab
    }}>
      {children}
    </BuyerTabsContext.Provider>
  );
};

export const useBuyerTabs = (): BuyerTabsContextType => {
  const context = useContext(BuyerTabsContext);
  if (!context) {
    throw new Error('useBuyerTabs must be used within a BuyerTabsProvider');
  }
  return context;
};
