import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, MapPin, Globe, Facebook, Youtube, Linkedin, Phone, Mail, Bookmark } from 'lucide-react';
import { Buyer, BuyerStatus, Activity } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import ActivityTab from '@/components/buyer/ActivityTab';
import DetailsTab from '@/components/buyer/DetailsTab';
import ActivityDrawer from '@/components/buyer/ActivityDrawer';

const BuyerDetail: React.FC = () => {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { buyers, toggleBookmark, getBuyerActivities } = useApp();
  
  const [activeTab, setActiveTab] = useState<'activity' | 'details'>('activity');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'detail' | 'collection' | 'create'>('detail');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);

  const buyer = buyers.find(b => b.id === buyerId);
  const activities = buyer ? getBuyerActivities(buyer.id) : [];

  const handleOpenDrawer = (mode: 'detail' | 'collection' | 'create', activity?: Activity, date?: Date) => {
    setDrawerMode(mode);
    setSelectedActivity(activity || activities[0] || null);
    setPrefilledDate(date || null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handleClose = () => {
    navigate(-1);
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Buyer not found</h1>
          <button 
            onClick={handleClose}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const statusLabels: Record<BuyerStatus, { level: string; color: string }> = {
    list: { level: 'level 1', color: 'bg-status-list' },
    lead: { level: 'level 2', color: 'bg-status-lead' },
    target: { level: 'level 3', color: 'bg-status-target' },
    client: { level: 'level 4', color: 'bg-status-client' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Blue Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shrink-0">
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

          {/* Right: Contact info, bookmark, close */}
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

            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded ml-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card shrink-0">
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

      {/* Tab Content - Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {activeTab === 'activity' ? (
          <ActivityTab buyer={buyer} onOpenDrawer={handleOpenDrawer} />
        ) : (
          <DetailsTab buyer={buyer} />
        )}

        {/* Activity Drawer */}
        <ActivityDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          buyer={buyer}
          activities={activities}
          mode={drawerMode}
          selectedActivity={selectedActivity}
          onSelectActivity={setSelectedActivity}
          prefilledDate={prefilledDate}
        />
      </div>
    </div>
  );
};

export default BuyerDetail;
