import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, MapPin, Globe, Facebook, Youtube, Linkedin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import { Buyer, BuyerStatus } from '@/data/mockData';
import TopHeader from '@/components/layout/TopHeader';
import BuyerInfoPanel from '@/components/buyer-workspace/BuyerInfoPanel';
import BuyerEmailTimeline from '@/components/buyer-workspace/BuyerEmailTimeline';
import BuyerEmailViewer from '@/components/buyer-workspace/BuyerEmailViewer';
import BuyerAnalyzePanel from '@/components/buyer-workspace/BuyerAnalyzePanel';
import { useSalesActivityLogs, SalesActivityLog } from '@/hooks/useSalesActivityLogs';

export interface OpenBuyerTab {
  buyerId: string;
  companyName: string;
  stage: BuyerStatus;
}

const BuyerWorkspace: React.FC = () => {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { buyers } = useApp();
  
  // Tab management state
  const [openTabs, setOpenTabs] = useState<OpenBuyerTab[]>([]);
  const [activeBuyerId, setActiveBuyerId] = useState<string | null>(null);
  
  // Content tab state (Activity / Mail timeline / Buyer Analyze)
  const [contentTab, setContentTab] = useState<'activity' | 'mail' | 'analyze'>('mail');
  
  // Email selection state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Activity logs
  const { logs: emailLogs, loading: logsLoading, fetchLogsByBuyer } = useSalesActivityLogs();

  // Get current buyer
  const currentBuyer = useMemo(() => {
    if (!activeBuyerId) return null;
    return buyers.find(b => b.id === activeBuyerId) || null;
  }, [activeBuyerId, buyers]);

  // Filter email logs for current buyer
  const buyerEmailLogs = useMemo(() => {
    return emailLogs.filter(log => log.source === 'email');
  }, [emailLogs]);

  // Initialize tab from URL
  useEffect(() => {
    if (buyerId) {
      const buyer = buyers.find(b => b.id === buyerId);
      if (buyer) {
        // Check if tab already exists
        const existingTab = openTabs.find(t => t.buyerId === buyerId);
        if (!existingTab) {
          setOpenTabs(prev => [...prev, {
            buyerId: buyer.id,
            companyName: buyer.name,
            stage: buyer.status
          }]);
        }
        setActiveBuyerId(buyerId);
      }
    }
  }, [buyerId, buyers]);

  // Fetch logs when active buyer changes
  useEffect(() => {
    if (activeBuyerId) {
      fetchLogsByBuyer(activeBuyerId);
    }
  }, [activeBuyerId, fetchLogsByBuyer]);

  // Update URL when active tab changes
  useEffect(() => {
    if (activeBuyerId && activeBuyerId !== buyerId) {
      navigate(`/buyers/${activeBuyerId}`, { replace: true });
    }
  }, [activeBuyerId, buyerId, navigate]);

  const handleTabClick = useCallback((tabBuyerId: string) => {
    setActiveBuyerId(tabBuyerId);
    setSelectedEmailId(null);
  }, []);

  const handleCloseTab = useCallback((tabBuyerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.buyerId !== tabBuyerId);
      
      // If closing active tab, switch to another tab or go back
      if (tabBuyerId === activeBuyerId) {
        if (newTabs.length > 0) {
          const closedIndex = prev.findIndex(t => t.buyerId === tabBuyerId);
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          setActiveBuyerId(newTabs[newActiveIndex].buyerId);
        } else {
          navigate('/');
        }
      }
      
      return newTabs;
    });
  }, [activeBuyerId, navigate]);

  const handleBackToFunnel = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleSelectEmail = useCallback((log: SalesActivityLog) => {
    setSelectedEmailId(log.id);
  }, []);

  const getStageLabel = (stage: BuyerStatus): string => {
    const labels: Record<BuyerStatus, string> = {
      list: 'List',
      lead: 'Lead',
      target: 'Target',
      client: 'Client'
    };
    return labels[stage];
  };

  const getStageColor = (stage: BuyerStatus): string => {
    const colors: Record<BuyerStatus, string> = {
      list: 'bg-status-list',
      lead: 'bg-status-lead',
      target: 'bg-status-target',
      client: 'bg-status-client'
    };
    return colors[stage];
  };

  if (!currentBuyer && buyerId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Buyer not found</h1>
            <Button onClick={handleBackToFunnel} variant="link">
              Go back to Customer Funnel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedEmail = buyerEmailLogs.find(log => log.id === selectedEmailId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      {/* Buyer Tabs Strip */}
      <div className="flex items-center border-b border-border bg-card">
        {/* Back to Customer Funnel */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToFunnel}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Customer Funnel
        </Button>
        
        {/* Buyer Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto">
          {openTabs.map((tab) => {
            const isActive = tab.buyerId === activeBuyerId;
            return (
              <div
                key={tab.buyerId}
                onClick={() => handleTabClick(tab.buyerId)}
                className={`
                  flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-border
                  ${isActive ? `${getStageColor(tab.stage)} text-white` : 'bg-muted/50 text-foreground hover:bg-muted'}
                `}
              >
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {getStageLabel(tab.stage)} - {tab.companyName}
                </span>
                <button
                  onClick={(e) => handleCloseTab(tab.buyerId, e)}
                  className={`p-0.5 rounded hover:bg-white/20 ${isActive ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {currentBuyer && (
        <div className="flex-1 flex min-h-0">
          {/* Left Info Panel */}
          <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
            <BuyerInfoPanel buyer={currentBuyer} />
          </div>

          {/* Middle + Right Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Content Tabs */}
            <div className="flex items-center gap-6 px-6 border-b border-border bg-card">
              <button
                onClick={() => setContentTab('activity')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  contentTab === 'activity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setContentTab('mail')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  contentTab === 'mail'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Mail timeline
              </button>
              <button
                onClick={() => setContentTab('analyze')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  contentTab === 'analyze'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Buyer Analyze
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex min-h-0">
              {contentTab === 'mail' && (
                <>
                  {/* Email Timeline List */}
                  <div className="w-80 border-r border-border flex flex-col shrink-0">
                    <BuyerEmailTimeline
                      logs={buyerEmailLogs}
                      loading={logsLoading}
                      selectedId={selectedEmailId}
                      onSelectEmail={handleSelectEmail}
                    />
                  </div>
                  
                  {/* Email Viewer */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <BuyerEmailViewer
                      log={selectedEmail || null}
                      buyerName={currentBuyer.name}
                    />
                  </div>
                </>
              )}

              {contentTab === 'activity' && (
                <div className="flex-1 p-6">
                  <div className="text-center text-muted-foreground py-12">
                    <p>Activity view - Coming soon</p>
                  </div>
                </div>
              )}

              {contentTab === 'analyze' && (
                <div className="flex-1">
                  <BuyerAnalyzePanel buyer={currentBuyer} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerWorkspace;
