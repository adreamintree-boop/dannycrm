import React from 'react';
import { MapPin } from 'lucide-react';
import { Buyer } from '@/data/mockData';

interface MapCardProps {
  buyers: Buyer[];
}

const MapCard: React.FC<MapCardProps> = ({ buyers }) => {
  const regions = [
    { key: 'america' as const, label: '아메리카', labelEn: 'America' },
    { key: 'asia' as const, label: '아시아', labelEn: 'Asia' },
    { key: 'africa' as const, label: '아프리카', labelEn: 'Africa' },
    { key: 'oceania' as const, label: '오세아니아', labelEn: 'Oceania' },
    { key: 'europe' as const, label: '유럽', labelEn: 'Europe' },
  ];

  // Calculate region summary from buyers data
  const calculateRegionSummary = () => {
    const summary: Record<string, { list: number; lead: number; target: number; client: number }> = {
      america: { list: 0, lead: 0, target: 0, client: 0 },
      asia: { list: 0, lead: 0, target: 0, client: 0 },
      africa: { list: 0, lead: 0, target: 0, client: 0 },
      oceania: { list: 0, lead: 0, target: 0, client: 0 },
      europe: { list: 0, lead: 0, target: 0, client: 0 },
    };

    buyers.forEach(buyer => {
      if (summary[buyer.region] && summary[buyer.region][buyer.status] !== undefined) {
        summary[buyer.region][buyer.status]++;
      }
    });

    return summary;
  };

  const regionSummary = calculateRegionSummary();
  const hasBuyers = buyers.length > 0;

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Buyer Location on Google Maps</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-list"></span>
            <span className="text-muted-foreground">list</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-lead"></span>
            <span className="text-muted-foreground">lead</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-target"></span>
            <span className="text-muted-foreground">target</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-client"></span>
            <span className="text-muted-foreground">client</span>
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="relative h-48 bg-muted rounded-lg mb-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            {hasBuyers ? (
              <span className="text-sm text-muted-foreground">Map View</span>
            ) : (
              <>
                <span className="text-sm text-muted-foreground block">아직 데이터가 없습니다</span>
                <span className="text-xs text-muted-foreground/70">바이어를 추가하면 지도에 표시됩니다.</span>
              </>
            )}
          </div>
        </div>
        {/* Tabs on map */}
        <div className="absolute top-3 left-3 flex bg-card rounded shadow-sm overflow-hidden">
          <button className="px-3 py-1.5 text-sm bg-card hover:bg-muted">지도</button>
          <button className="px-3 py-1.5 text-sm bg-muted text-muted-foreground">위성</button>
        </div>
        {/* Mock pins - only show if there are buyers */}
        {hasBuyers && (
          <>
            <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-status-target border-2 border-white shadow" />
            <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-status-client border-2 border-white shadow" />
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 rounded-full bg-status-lead border-2 border-white shadow" />
          </>
        )}
      </div>

      {/* Region summary cards */}
      <div className="grid grid-cols-5 gap-2">
        {regions.map((region) => {
          const data = regionSummary[region.key];
          return (
            <div key={region.key} className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs font-medium text-foreground mb-2">{region.label}</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-list"></span>
                  <span className="text-muted-foreground">{data.list}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-lead"></span>
                  <span className="text-muted-foreground">{data.lead}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-target"></span>
                  <span className="text-muted-foreground">{data.target}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-client"></span>
                  <span className="text-muted-foreground">{data.client}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapCard;
