import React, { useState } from 'react';
import { MapPin, Globe, Facebook, Youtube, Linkedin, Pencil } from 'lucide-react';
import { Buyer, BuyerContact, BuyerStatus } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BuyerEditDrawer from './BuyerEditDrawer';

interface BuyerInfoPanelProps {
  buyer: Buyer;
}

type InfoTab = 'company' | 'contact1' | 'contact2' | 'contact3';

const BuyerInfoPanel: React.FC<BuyerInfoPanelProps> = ({ buyer }) => {
  const [activeTab, setActiveTab] = useState<InfoTab>('company');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const openInNewTab = (url: string | undefined) => {
    if (url && url.trim()) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const openGoogleMaps = () => {
    if (buyer.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buyer.address)}`, '_blank');
    }
  };

  const iconButtons = [
    { icon: MapPin, onClick: openGoogleMaps, active: !!buyer.address, color: 'bg-green-500' },
    { icon: Globe, onClick: () => openInNewTab(buyer.websiteUrl), active: !!buyer.websiteUrl, color: 'bg-blue-500' },
    { icon: Facebook, onClick: () => openInNewTab(buyer.facebookUrl), active: !!buyer.facebookUrl, color: 'bg-[#1877F2]' },
    { icon: Youtube, onClick: () => openInNewTab(buyer.youtubeUrl), active: !!buyer.youtubeUrl, color: 'bg-red-500' },
    { icon: Linkedin, onClick: () => openInNewTab(buyer.linkedinUrl), active: !!buyer.linkedinUrl, color: 'bg-[#0A66C2]' },
  ];

  const getStageLabel = (status: BuyerStatus): string => {
    const labels: Record<BuyerStatus, string> = {
      list: 'level 1',
      lead: 'level 2',
      target: 'level 3',
      client: 'level 4'
    };
    return labels[status];
  };

  const getContact = (index: number): BuyerContact | null => {
    return buyer.contacts?.[index] || null;
  };

  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          {buyer.name}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-auto"
                onClick={() => setIsEditDrawerOpen(true)}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit company info</p>
            </TooltipContent>
          </Tooltip>
        </h2>
        
        {/* Icon buttons row */}
        <div className="flex items-center gap-2">
          {iconButtons.map(({ icon: Icon, onClick, active, color }, idx) => (
            <button
              key={idx}
              onClick={active ? onClick : undefined}
              disabled={!active}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity ${
                active ? `${color} hover:opacity-90 cursor-pointer` : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs - all visible, no scroll */}
      <div className="flex items-center border-b border-border">
        <div className="flex items-center px-2 gap-1 w-full">
          {(['company', 'contact1', 'contact2', 'contact3'] as InfoTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'company' ? 'company info' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === 'company' && (
            <CompanyInfoContent buyer={buyer} getStageLabel={getStageLabel} />
          )}
          {activeTab === 'contact1' && (
            <ContactInfoContent contact={getContact(0)} contactNumber={1} />
          )}
          {activeTab === 'contact2' && (
            <ContactInfoContent contact={getContact(1)} contactNumber={2} />
          )}
          {activeTab === 'contact3' && (
            <ContactInfoContent contact={getContact(2)} contactNumber={3} />
          )}
        </div>
      </ScrollArea>
      
      {/* Edit Drawer */}
      <BuyerEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={handleEditDrawerClose}
        buyer={buyer}
      />
    </div>
  );
};

interface CompanyInfoContentProps {
  buyer: Buyer;
  getStageLabel: (status: BuyerStatus) => string;
}

const CompanyInfoContent: React.FC<CompanyInfoContentProps> = ({ buyer, getStageLabel }) => {
  const fields = [
    { label: 'level', value: getStageLabel(buyer.status) },
    { label: 'list', value: buyer.status },
    { label: 'country', value: buyer.country || '-' },
    { label: 'address', value: buyer.address || '-' },
    { label: 'website', value: buyer.websiteUrl || '-' },
    { label: 'sales', value: buyer.revenue ? `${buyer.revenueCurrency} ${buyer.revenue}` : '-' },
    { label: 'products', value: buyer.mainProducts || '-' },
    { label: 'primary email', value: buyer.email || '-' },
    { label: 'phone', value: buyer.phone || '-' },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.label}>
          <div className="text-xs text-muted-foreground mb-1">{field.label}</div>
          <div className="text-sm text-foreground break-words">{field.value}</div>
        </div>
      ))}
    </div>
  );
};

interface ContactInfoContentProps {
  contact: BuyerContact | null;
  contactNumber: number;
}

const ContactInfoContent: React.FC<ContactInfoContentProps> = ({ contact, contactNumber }) => {
  if (!contact || !contact.name) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-2">No contact saved.</p>
        <Button variant="outline" size="sm">
          Add contact
        </Button>
      </div>
    );
  }

  const fields = [
    { label: 'Full name', value: contact.name || '-' },
    { label: 'Title/Role', value: contact.title || contact.role || '-' },
    { label: 'Email', value: contact.email || '-' },
    { label: 'Phone', value: contact.phone || '-' },
    { label: 'Mobile', value: contact.mobile || '-' },
    { label: 'LinkedIn', value: contact.linkedinUrl || '-' },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.label}>
          <div className="text-xs text-muted-foreground mb-1">{field.label}</div>
          <div className="text-sm text-foreground break-words">{field.value}</div>
        </div>
      ))}
    </div>
  );
};

export default BuyerInfoPanel;
