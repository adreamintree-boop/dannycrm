import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, MapPin, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

interface CrmBuyer {
  id: string;
  company_name: string;
  stage: string;
  country: string | null;
  region: string | null;
}

interface BuyerSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (buyerId: string, companyName: string) => void;
  loading?: boolean;
}

const stageLabels: Record<string, { label: string; color: string }> = {
  list: { label: 'List', color: 'bg-status-list text-white' },
  lead: { label: 'Lead', color: 'bg-status-lead text-white' },
  target: { label: 'Target', color: 'bg-status-target text-white' },
  client: { label: 'Client', color: 'bg-status-client text-white' },
};

const BuyerSelectModal: React.FC<BuyerSelectModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  loading = false,
}) => {
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [buyers, setBuyers] = useState<CrmBuyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [fetchingBuyers, setFetchingBuyers] = useState(false);

  const fetchBuyers = useCallback(async () => {
    if (!user) return;
    setFetchingBuyers(true);
    try {
      const { data, error } = await supabase
        .from('crm_buyers')
        .select('id, company_name, stage, country, region')
        .eq('user_id', user.id)
        .order('company_name', { ascending: true });

      if (error) throw error;
      setBuyers(data || []);
    } catch (error) {
      console.error('Failed to fetch buyers:', error);
    } finally {
      setFetchingBuyers(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchBuyers();
      setSelectedBuyerId(null);
      setSearchQuery('');
    }
  }, [open, fetchBuyers]);

  const filteredBuyers = buyers.filter(buyer =>
    buyer.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    const selected = buyers.find(b => b.id === selectedBuyerId);
    if (selected) {
      onSelect(selected.id, selected.company_name);
    }
  };

  const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>바이어 선택 후 CRM 기록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="회사명 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Buyer List */}
          <ScrollArea className="h-64 rounded-md border">
            {fetchingBuyers ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredBuyers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Building2 className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : 'Customer Funnel에 등록된 바이어가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="p-1">
                {filteredBuyers.map((buyer) => {
                  const stageInfo = stageLabels[buyer.stage] || stageLabels.list;
                  const isSelected = selectedBuyerId === buyer.id;

                  return (
                    <button
                      key={buyer.id}
                      onClick={() => setSelectedBuyerId(buyer.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {buyer.company_name}
                          </span>
                          <Badge className={`${stageInfo.color} text-xs`}>
                            {stageInfo.label}
                          </Badge>
                        </div>
                        {buyer.country && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{buyer.country}</span>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected Buyer Info */}
          {selectedBuyer && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">선택된 바이어:</p>
              <p className="font-medium text-foreground">{selectedBuyer.company_name}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBuyerId || loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </div>
            ) : (
              '선택하고 기록'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyerSelectModal;
