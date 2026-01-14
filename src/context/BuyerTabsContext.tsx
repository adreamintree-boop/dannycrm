import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
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
  
  // Use ref to track current tabs for synchronous access
  const openTabsRef = useRef<OpenBuyerTab[]>([]);
  openTabsRef.current = openTabs;

  const hasTab = useCallback((buyerId: string): boolean => {
    return openTabsRef.current.some(t => t.buyerId === buyerId);
  }, []);

  const openBuyerTab = useCallback((buyerId: string, companyName: string, stage: BuyerStatus) => {
    const currentTabs = openTabsRef.current;
    const existingIndex = currentTabs.findIndex(t => t.buyerId === buyerId);
    
    if (existingIndex >= 0) {
      // Tab exists - just update lastActiveAt
      setOpenTabs(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(t => t.buyerId === buyerId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], lastActiveAt: Date.now() };
        }
        return updated;
      });
    } else {
      // Add new tab
      setOpenTabs(prev => [...prev, {
        buyerId,
        companyName,
        stage,
        lastActiveAt: Date.now()
      }]);
    }
    
    // Always set this buyer as active
    setActiveBuyerIdState(buyerId);
  }, []);

  const closeBuyerTab = useCallback((buyerId: string): string | null => {
    const currentTabs = openTabsRef.current;
    const closedIndex = currentTabs.findIndex(t => t.buyerId === buyerId);
    
    if (closedIndex === -1) return activeBuyerId;
    
    const newTabs = currentTabs.filter(t => t.buyerId !== buyerId);
    
    let newActiveId: string | null = null;
    
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
    
    setOpenTabs(newTabs);
    
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
