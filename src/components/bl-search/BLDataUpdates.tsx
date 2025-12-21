import React from 'react';
import { Button } from '@/components/ui/button';

interface DataUpdate {
  id: string;
  date: string;
  country: string;
  countryFlag: string;
  type: string;
  nextUpdate: string;
}

const mockUpdates: DataUpdate[] = [
  { id: '1', date: '2025-12-18', country: 'United States', countryFlag: '🇺🇸', type: '선하증권', nextUpdate: '2025-12-17' },
  { id: '2', date: '2025-12-18', country: 'Sao Tome and Principe', countryFlag: '🇸🇹', type: '선하증권', nextUpdate: '2025-10-31' },
  { id: '3', date: '2025-12-18', country: 'United States', countryFlag: '🇺🇸', type: 'Shipping Data', nextUpdate: '2025-09-30' },
  { id: '4', date: '2025-12-18', country: 'Peru', countryFlag: '🇵🇪', type: '선하증권', nextUpdate: '2025-12-07' },
  { id: '5', date: '2025-12-18', country: 'Tanzania', countryFlag: '🇹🇿', type: '선하증권', nextUpdate: '2025-11-30' },
  { id: '6', date: '2025-12-17', country: 'Montenegro', countryFlag: '🇲🇪', type: 'Shipping Data', nextUpdate: '2025-10-31' },
];

const BLDataUpdates: React.FC = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">데이터 업데이트</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            가져오기
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            내보내기
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Group by date */}
        <div className="text-xs text-muted-foreground font-medium">2025-12-18</div>
        {mockUpdates.filter(u => u.date === '2025-12-18').map((update) => (
          <div key={update.id} className="flex items-center gap-3 text-sm">
            <span className="text-lg">{update.countryFlag}</span>
            <div className="flex-1">
              <span className="text-primary font-medium">{update.country}</span>
              <span className="text-muted-foreground ml-2">{update.type}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              다음으로 업데이트 {update.nextUpdate}
            </span>
          </div>
        ))}
        
        <div className="text-xs text-muted-foreground font-medium pt-2">2025-12-17</div>
        {mockUpdates.filter(u => u.date === '2025-12-17').map((update) => (
          <div key={update.id} className="flex items-center gap-3 text-sm">
            <span className="text-lg">{update.countryFlag}</span>
            <div className="flex-1">
              <span className="text-primary font-medium">{update.country}</span>
              <span className="text-muted-foreground ml-2">{update.type}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              다음으로 업데이트 {update.nextUpdate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BLDataUpdates;
