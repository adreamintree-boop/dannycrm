import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useBuyerTabs } from '@/context/BuyerTabsContext';
import { BuyerStatus } from '@/data/mockData';
import TopHeader from '@/components/layout/TopHeader';
import BuyerInfoPanel from '@/components/buyer-workspace/BuyerInfoPanel';
import BuyerEmailTimeline from '@/components/buyer-workspace/BuyerEmailTimeline';
import BuyerEmailViewer from '@/components/buyer-workspace/BuyerEmailViewer';
import BuyerAnalyzePanel from '@/components/buyer-workspace/BuyerAnalyzePanel';
import { useSalesActivityLogs, SalesActivityLog } from '@/hooks/useSalesActivityLogs';

const BuyerWorkspace: React.FC = () => {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { buyers } = useApp();
  const { openTabs, activeBuyerId, openBuyerTab, closeBuyerTab, setActiveBuyerId } = useBuyerTabs();
  
  // Content tab state (Activity / Mail timeline / Buyer Analyze)
  const [contentTab, setContentTab] = useState<'activity' | 'mail' | 'analyze'>('mail');
  
  // Email selection state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Activity logs
  const { logs: emailLogs, loading: logsLoading, fetchLogsByBuyer } = useSalesActivityLogs();

  // Get current buyer - use buyerId from URL as primary source
  const currentBuyer = useMemo(() => {
    // First try to use activeBuyerId from context
    const targetId = activeBuyerId || buyerId;
    if (!targetId) return null;
    return buyers.find(b => b.id === targetId) || null;
  }, [activeBuyerId, buyerId, buyers]);

  // Filter email logs for current buyer
  const buyerEmailLogs = useMemo(() => {
    return emailLogs.filter(log => log.source === 'email');
  }, [emailLogs]);

  // Initialize tab from URL - only once when buyerId changes
  useEffect(() => {
    if (buyerId && buyers.length > 0) {
      const buyer = buyers.find(b => b.id === buyerId);
      if (buyer) {
        // This will either add the tab or just activate existing one
        openBuyerTab(buyer.id, buyer.name, buyer.status);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]); // Only depend on buyerId - buyers and openBuyerTab are stable enough

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
  }, [setActiveBuyerId]);

  const handleCloseTab = useCallback((tabBuyerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newActiveId = closeBuyerTab(tabBuyerId);
    
    if (newActiveId === null) {
      navigate('/');
    }
  }, [closeBuyerTab, navigate]);

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
        
        {/* Buyer Tabs - horizontal scroll, no wrap */}
        <div className="flex-1 overflow-x-auto scrollbar-thin">
          <div className="flex items-center flex-nowrap">
            {openTabs.map((tab) => {
              const isActive = tab.buyerId === activeBuyerId;
              return (
                <div
                  key={tab.buyerId}
                  onClick={() => handleTabClick(tab.buyerId)}
                  className={`
                    flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-border flex-shrink-0 whitespace-nowrap
                    ${isActive ? `${getStageColor(tab.stage)} text-white` : 'bg-muted/50 text-foreground hover:bg-muted'}
                  `}
                >
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {getStageLabel(tab.stage)} - {tab.companyName}
                  </span>
                  <button
                    onClick={(e) => handleCloseTab(tab.buyerId, e)}
                    className={`p-0.5 rounded hover:bg-white/20 flex-shrink-0 ${isActive ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {currentBuyer && (
        <div className="flex-1 flex min-h-0">
          {/* Left Info Panel - fixed width, non-shrinking */}
          <div className="w-[340px] min-w-[320px] max-w-[400px] border-r border-border flex flex-col bg-card shrink-0 overflow-hidden">
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
