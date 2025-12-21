import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Globe, Facebook, Youtube, Linkedin, Phone, Mail, Bookmark, Plus, Trash2 } from 'lucide-react';
import { Buyer, BuyerStatus, Activity, ActivityType } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import ActivityTab from './ActivityTab';
import DetailsTab from './DetailsTab';
import ActivityDrawer from './ActivityDrawer';

interface BuyerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer | null;
  buyersInColumn: Buyer[];
  onNavigate: (buyerId: string) => void;
}

const BuyerDetailModal: React.FC<BuyerDetailModalProps> = ({
  isOpen,
  onClose,
  buyer,
  buyersInColumn,
  onNavigate,
}) => {
  const { toggleBookmark, getBuyerActivities } = useApp();
  const [activeTab, setActiveTab] = useState<'activity' | 'details'>('activity');
  
  // Drawer state - lifted to modal level
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'detail' | 'collection'>('detail');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const activities = buyer ? getBuyerActivities(buyer.id) : [];

  const handleOpenDrawer = (mode: 'detail' | 'collection', activity?: Activity) => {
    setDrawerMode(mode);
    setSelectedActivity(activity || activities[0] || null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const currentIndex = buyer ? buyersInColumn.findIndex(b => b.id === buyer.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < buyersInColumn.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onNavigate(buyersInColumn[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(buyersInColumn[currentIndex + 1].id);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!buyer) return null;

  const statusLabels: Record<BuyerStatus, { level: string; color: string }> = {
    list: { level: 'level 1', color: 'bg-status-list' },
    lead: { level: 'level 2', color: 'bg-status-lead' },
    target: { level: 'level 3', color: 'bg-status-target' },
    client: { level: 'level 4', color: 'bg-status-client' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] p-0 overflow-hidden bg-background relative">
        <VisuallyHidden>
          <DialogTitle>Buyer Details - {buyer.name}</DialogTitle>
        </VisuallyHidden>
        
        {/* Blue Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Level badge, company name, social icons */}
            <div className="flex items-center gap-4">
              <span className={`${statusLabels[buyer.status].color} text-white text-xs px-2 py-1 rounded`}>
                {statusLabels[buyer.status].level}
              </span>
              <h2 className="text-xl font-bold">{buyer.name}</h2>
              
              {/* Social icons */}
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <MapPin className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Globe className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Facebook className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Youtube className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Contact info, bookmark, navigation, close */}
            <div className="flex items-center gap-4">
              {buyer.phone && (
                <div className="flex items-center gap-1 text-sm">
                  <Phone className="w-4 h-4" />
                  {buyer.phone}
                </div>
              )}
              {buyer.email && (
                <div className="flex items-center gap-1 text-sm">
                  <Mail className="w-4 h-4" />
                  {buyer.email}
                </div>
              )}
              <button
                onClick={() => toggleBookmark(buyer.id)}
                className={`p-2 hover:bg-white/20 rounded ${buyer.bookmarked ? 'text-yellow-300' : ''}`}
              >
                <Bookmark className={`w-5 h-5 ${buyer.bookmarked ? 'fill-current' : ''}`} />
              </button>
              
              {/* Navigation */}
              <div className="flex items-center gap-1 border-l border-white/30 pl-4">
                <button
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm">{currentIndex + 1} / {buyersInColumn.length}</span>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border bg-card">
          <div className="flex">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'bg-background border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              활동일지
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-background border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              상세정보
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'activity' ? (
            <ActivityTab buyer={buyer} onOpenDrawer={handleOpenDrawer} />
          ) : (
            <DetailsTab buyer={buyer} />
          )}
        </div>

        {/* Activity Drawer - rendered at modal level for proper overlay */}
        <ActivityDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          buyer={buyer}
          activities={activities}
          mode={drawerMode}
          selectedActivity={selectedActivity}
          onSelectActivity={setSelectedActivity}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BuyerDetailModal;
